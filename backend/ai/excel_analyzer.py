import os
import json
import asyncio
from functools import partial
import google.generativeai as genai
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

from .ai_service import ai_pool

async def analyze_excel_columns(columns: List[str], sample_data: List[Dict]) -> Dict:
    """
    Analyzes Excel columns semantically to map them to standard invoice fields.
    """

    prompt = f"""
    You are an AI system designed to analyze Excel files for financial data ingestion.

    Tasks:
    1. Understand column names semantically.
    2. Map them to these standard fields if they exist (or something very similar):
       - invoice_number
       - vendor
       - date
       - subtotal
       - tax
       - total_amount

    3. Detect:
       - Missing fields (from the list above)
       - Duplicate/ambiguous columns
       - Incorrect formats (if sample data looks wrong)

    4. Suggest fixes

    Input:
    Columns Found: {columns}
    Sample Data (first 3 rows): {json.dumps(sample_data, default=str)}

    Return ONLY a valid JSON object with the following structure:
    {{
      "column_mapping": {{ "excel_column_name": "standard_field_name" }},
      "issues": ["string"],
      "suggestions": ["string"]
    }}
    
    If a column doesn't match a standard field, do not include it in column_mapping.
    """

    try:
        response_text = await ai_pool.generate_content(prompt, json_mode=True)
        
        # Cleanup markdown fences if present
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
            
        return json.loads(response_text)
    except Exception as e:
        print(f"Excel AI Analysis Error: {e}")
        # Basic fallback mapping
        mapping = {}
        for col in columns:
            c = col.lower()
            if 'inv' in c and 'num' in c: mapping[col] = 'invoice_number'
            elif 'date' in c: mapping[col] = 'date'
            elif 'total' in c: mapping[col] = 'total_amount'
            elif 'vendor' in c or 'merchant' in c: mapping[col] = 'vendor'
            
        return {
            "column_mapping": mapping,
            "issues": [f"AI analysis failed: {str(e)}"],
            "suggestions": ["Try renaming columns to standard names."]
        }
