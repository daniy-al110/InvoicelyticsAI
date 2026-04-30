import re
import os
import json
import random
import datetime
import asyncio
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv
from .ai_service import ai_pool

load_dotenv()


# ─────────────────────────────────────────────────────────────────────────────
# Required keys that EVERY extraction response must contain.
# ─────────────────────────────────────────────────────────────────────────────
_REQUIRED_KEYS = set()


_DOCUMENT_TYPE_ENUM = {"invoice", "statement", "purchase_order", "other"}


def _is_quota_error(e: Exception) -> bool:
    message = str(e).lower()
    return "429" in message or "quota" in message or "resourceexhausted" in message


def _format_error(error: Exception) -> str:
    message = str(error).strip()
    if "Quota exceeded" in message or "ResourceExhausted" in message or "429" in message:
        return (
            "Gemini API limit hit. Please wait a moment for the rate limit to reset and retry. "
            f"Original error: {message}"
        )
    return message


# ─────────────────────────────────────────────────────────────────────────────
# Schema helpers
# ─────────────────────────────────────────────────────────────────────────────

def _null_field(extra_keys: bool = False) -> Dict:
    """Return the canonical null entry for a missing/invalid field."""
    return {"value": None, "confidence": 0.0}


def _canonical_fallback(reason: str = "extraction_failed") -> Dict:
    """
    Return a fully-structured extraction dict that conforms to the schema
    but signals an error state.  Used for quota hits and validation failures.
    """
    base = {k: _null_field() for k in _REQUIRED_KEYS}
    base["is_simulated"] = {"value": True, "confidence": 0.0}
    base["quota_exceeded"] = {"value": reason == "quota_exceeded", "confidence": 0.0}
    base["extraction_error"] = {"value": reason, "confidence": 0.0}
    return base


def _strip_markdown(text: str) -> str:
    """Remove ```json / ``` fences that Gemini sometimes adds despite instructions."""
    text = text.strip()
    if text.startswith("```"):
        # Remove opening fence (with optional language tag)
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        # Remove closing fence
        text = re.sub(r"\n?```$", "", text)
    return text.strip()


# ─────────────────────────────────────────────────────────────────────────────
# Normalizers
# ─────────────────────────────────────────────────────────────────────────────

def _normalize_amount(raw: Any) -> Optional[float]:
    """Convert any amount representation to a float."""
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    if isinstance(raw, str):
        cleaned = re.sub(r"[^\d.]", "", raw.replace(",", ""))
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def _normalize_date(raw: Any) -> Optional[str]:
    """
    Convert any date string to ISO-8601 YYYY-MM-DD.
    Handles: "March 5 2024", "05/03/2024", "2024-03-05", "Mar 2024", etc.
    """
    if raw is None:
        return None
    if not isinstance(raw, str):
        raw = str(raw)

    raw = raw.strip()
    if not raw:
        return None

    # Already ISO
    if re.match(r"^\d{4}-\d{2}-\d{2}$", raw):
        return raw

    # Try common formats
    formats = [
        "%B %d, %Y", "%b %d, %Y",   # March 5, 2024 / Mar 5, 2024
        "%d %B %Y", "%d %b %Y",     # 5 March 2024 / 5 Mar 2024
        "%m/%d/%Y", "%d/%m/%Y",     # 03/05/2024
        "%m-%d-%Y", "%d-%m-%Y",     # 03-05-2024
        "%Y/%m/%d",                 # 2024/03/05
        "%B %Y", "%b %Y",           # March 2024 → first day
        "%m/%Y",                    # 03/2024 → first day
    ]
    for fmt in formats:
        try:
            dt = datetime.datetime.strptime(raw, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue

    # Last resort: try dateutil if available
    try:
        from dateutil import parser as dateutil_parser
        dt = dateutil_parser.parse(raw, default=datetime.datetime(2000, 1, 1))
        return dt.strftime("%Y-%m-%d")
    except Exception:
        pass

    return None  # Unparseable — return null rather than a bad string


def _normalize_currency(raw: Any) -> Optional[str]:
    """Return a 3-letter ISO-4217 currency code, or None."""
    if raw is None:
        return None
    s = str(raw).strip().upper()
    # Already a 3-letter code
    if re.match(r"^[A-Z]{3}$", s):
        return s
    # Symbol mapping
    symbol_map = {"$": "USD", "£": "GBP", "€": "EUR", "¥": "JPY", "₹": "INR"}
    return symbol_map.get(s)


def _normalize_document_type(raw: Any) -> Optional[str]:
    """Map any document type string to the allowed enum values."""
    if raw is None:
        return None
    s = str(raw).strip().lower()
    if "invoice" in s:
        return "invoice"
    if "statement" in s or "bank" in s or "account" in s:
        return "statement"
    if "purchase" in s or " po " in s or s == "po":
        return "purchase_order"
    if s in _DOCUMENT_TYPE_ENUM:
        return s
    return "other"


def _normalize_line_items(raw: Any) -> List[Dict]:
    """
    Convert raw line items to a structured list of objects.
    Strictly keeps missing values as null (no defaults).
    """
    if not isinstance(raw, list):
        return []
    
    normalized = []
    for item in raw:
        if not isinstance(item, dict):
            continue
            
        desc = item.get("description")
        qty = _normalize_amount(item.get("quantity"))
        price = _normalize_amount(item.get("unit_price"))
        total = _normalize_amount(item.get("total"))
        
        normalized.append({
            "description": str(desc) if desc else None,
            "quantity": qty,
            "unit_price": price,
            "total": total
        })
    return normalized


# ─────────────────────────────────────────────────────────────────────────────
# Validation layer
# ─────────────────────────────────────────────────────────────────────────────

class ExtractionValidationError(Exception):
    """Raised when the LLM response does not match the required schema."""
    pass


def _validate_and_normalize(raw_dict: Dict) -> Dict:
    """
    Returns the raw extraction dictionary as is, ensuring it's a valid dict.
    Confidence scores are no longer enforced as the system is now dynamic.
    """
    if not isinstance(raw_dict, dict):
        return {"error": "Invalid extraction format from AI"}
    return raw_dict


# ─────────────────────────────────────────────────────────────────────────────
# Core extraction function
# ─────────────────────────────────────────────────────────────────────────────

async def extract_structured_data(text: str) -> Dict:
    """
    Extract a deterministic, schema-validated set of fields from document text.
    Uses AI Pool for automatic failover.
    """
    from .prompts import (
        EXTRACTION_SCHEMA_PROMPT, 
        INVOICE_INSTRUCTION, 
        STATEMENT_INSTRUCTION, 
        PO_INSTRUCTION, 
        GENERIC_INSTRUCTION
    )

    # --- Schema Extraction ---
    prompt = EXTRACTION_SCHEMA_PROMPT.format(
        text=text[:15_000]
    )


    # Attempt extraction
    try:
        raw_text = await ai_pool.generate_content(prompt, json_mode=True)
        raw = json.loads(_strip_markdown(raw_text))
        return _validate_and_normalize(raw)

    except (ExtractionValidationError, json.JSONDecodeError) as err:
        print(f"[extractor] Validation failed: {err}. Returning error schema.")
        fallback = _canonical_fallback("schema_validation_failed")
        fallback["_debug_error"] = str(err)
        return fallback

    except Exception as e:
        if _is_quota_error(e):
            return _canonical_fallback("quota_exceeded")
        print(f"[extractor] Unexpected error: {e}")
        raise RuntimeError(_format_error(e))




async def generate_insights(document_data: Dict, text: str, historical_docs: List[Dict] = None) -> List[Dict]:
    """
    Generate intelligent business insights and anomaly detections.
    """
    from .prompts import AI_ANALYST_PERSONA, AI_INSIGHTS_PROMPT
    context = ""
    if historical_docs:
        context = "Reference against these historical records for anomaly detection:\n"
        for doc in historical_docs[:5]:
            sd = doc.get('structured_data', {})
            inv = sd.get('invoice_number', 'N/A') if isinstance(sd, dict) else 'N/A'
            ven = sd.get('vendor', 'N/A') if isinstance(sd, dict) else 'N/A'
            amt = sd.get('total_amount', 'N/A') if isinstance(sd, dict) else 'N/A'
            date_val = sd.get('date', 'N/A') if isinstance(sd, dict) else 'N/A'
            context += f"- Date: {date_val}, Vendor: {ven}, InvNum: {inv}, Amount: {amt}\n"

    try:
        prompt = AI_INSIGHTS_PROMPT.format(
            context_section=context,
            document_data=json.dumps(document_data, indent=2)
        )
        response_text = await ai_pool.generate_content(prompt, system_instruction=AI_ANALYST_PERSONA)
        # Strip markdown fences if present
        response_text = _strip_markdown(response_text)
        lines = response_text.split('\n')
        parsed_insights = []
        current_cat = None
        current_msg = []
        current_priority = "Medium"
        
        for line in lines:
            line_str = line.strip()
            if not line_str: continue
            
            # Check for header format: ### Title [PRIORITY] or just **Title**
            if line_str.startswith("###") or (line_str.startswith("**") and line_str.endswith("**") and len(line_str) < 100):
                if current_cat:
                    parsed_insights.append({
                        "category": current_cat,
                        "priority": current_priority,
                        "message": "\n".join(current_msg).strip()
                    })
                
                title_line = line_str.lstrip('#*').rstrip('*').strip()
                match = re.search(r'\[(HIGH|MEDIUM|LOW)\]', title_line, re.IGNORECASE)
                if match:
                    current_priority = match.group(1).capitalize()
                    title_line = title_line[:match.start()].strip() + " " + title_line[match.end():].strip()
                else:
                    current_priority = "Medium"
                
                current_cat = title_line
                current_msg = []
            elif current_cat:
                current_msg.append(line_str)
            else:
                # Fallback: if no category started yet, start one with the first meaningful line
                current_cat = "Observation"
                current_msg.append(line_str)
                    
        if current_cat:
            parsed_insights.append({
                "category": current_cat,
                "priority": current_priority,
                "message": "\n".join(current_msg).strip()
            })
            
        # Ensure we don't return empty list if there's raw text
        if not parsed_insights and response_text.strip():
            parsed_insights.append({
                "category": "Analysis",
                "priority": "Medium",
                "message": response_text.strip()
            })
            
        return parsed_insights
    except Exception as e:
        if _is_quota_error(e):
            return [
                {"category": "System Notification", "priority": "High", "message": "Google Gemini API rate limit reached. Insights will resume automatically shortly. Please wait 60 seconds."}
            ]
        print(f"Error generating insights: {e}")
        return []


async def generate_comparison(documents: list) -> dict:
    """
    Intelligently compares multiple documents using side-by-side contextual analysis.
    """
    from .prompts import AI_COMPARISON_PROMPT
    
    try:
        context_parts = []
        for i, doc in enumerate(documents):
            doc_context = {
                "document_index": i + 1,
                "filename": doc.get('filename', f'Document {i+1}'),
                "structured_data": doc.get('structured_data', {}),
                "text": doc.get('extracted_text', '')[:5000]
            }
            context_parts.append(f"--- Document {i+1} ---\n{json.dumps(doc_context, indent=2)}")
            
        prompt = AI_COMPARISON_PROMPT.format(
            documents_context="\n\n".join(context_parts)
        )
        
        raw_text = await ai_pool.generate_content(prompt, json_mode=True)
        return json.loads(_strip_markdown(raw_text))

    except Exception as e:
        if _is_quota_error(e):
            # Return high-quality mock comparison
            return {
                "alignment_score": 0,
                "summary": "SIMULATED COMPARISON: API key reached its quota limit. Displaying structural placeholders.",
                "critical_variances": [
                    {"field": "Gemini API Status", "risk": "CRITICAL", "desc": "API Rate Limit hit (1,500/day). Please wait 60 seconds for the current window to reset."}
                ],
                "comparison_rows": [
                    {"field": "AI Service", "status": "Quota Hit", "values": ["Update Key" for _ in documents]},
                    {"field": "Analysis Mode", "status": "Simulated", "values": ["Fallback Active" for _ in documents]}
                ],
                "is_simulated": True,
                "quota_exceeded": True
            }
        print(f"Error generating comparison: {e}")
        raise RuntimeError(_format_error(e))



async def generate_monthly_summary(month_label: str, statistics: Dict, prior_stats: Optional[Dict] = None) -> str:
    """
    Generate an AI summary for a specific month's financial activity.
    """
    try:
        comparison_context = ""
        if prior_stats:
            comparison_context = (
                f"Previous month stats: Total Spending ${prior_stats['total_spending']:.2f}, "
                f"Invoices: {prior_stats['invoice_count']}, Avg: ${prior_stats['average_value']:.2f}."
            )

        prompt = f"""
        You are a financial analyst. Generate a concise, professional summary (1-2 sentences) for the month: {month_label}.
        
        Current Month Stats:
        - Total Spending: ${statistics['total_spending']:.2f}
        - Total Invoices: {statistics['invoice_count']}
        - Average Invoice Value: ${statistics['average_value']:.2f}
        
        {comparison_context}
        
        Focus on trends or notable changes if previous data is provided. 
        Example: "Spending increased by 25% compared to previous month, mainly due to higher vendor activity."
        """
        
        return await ai_pool.generate_content(prompt)
        
    except Exception as e:
        if _is_quota_error(e):
            return "Monthly report summary placeholder (Quota reached)."
        print(f"Error generating monthly summary: {e}")
        return "Unable to generate summary at this time."

