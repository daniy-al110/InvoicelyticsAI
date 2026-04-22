import os
import json
import random
import asyncio
from typing import List, Dict, Optional
from dotenv import load_dotenv
from .ai_service import ai_pool

load_dotenv()


def _format_error(error: Exception) -> str:
    message = str(error).strip()
    if "Quota exceeded" in message or "ResourceExhausted" in message or "429" in message:
        return (
            "Gemini quota or rate limit exceeded. Please verify your Google Cloud project billing, "
            "check your Gemini quota, and retry after a short delay. "
            f"Original error: {message}"
        )
    return message


async def chat_with_document(
    question: str, 
    document_text: str, 
    structured_data: Optional[Dict] = None,
    chat_history: List[Dict] = None,
    explanation_mode: str = "Technical",
    invoice_dataset: Optional[str] = None,
    invoice_doc_count: int = 0
):
    """
    Advanced chatbot with mode control and dataset-aware analysis.
    Uses centralized AI Pool for failover.
    """
    chat_history = chat_history or []
    
    from .prompts import AI_ANALYST_PERSONA, AI_QA_PROMPT, AI_GENERAL_ASSISTANT_PROMPT, GLOBAL_CHAT_PROMPT
    
    mode_instruction = ""
    if explanation_mode == "Business":
        mode_instruction = "\n- TONE: Business Executive/Manager Mode. Focus on value, implications, and high-level summaries. Keep responses concise and free of technical jargon."
    else:
        mode_instruction = "\n- TONE: Technical/Analyst Mode. Provide detailed, data-driven answers citing specific figures and sections."

    if invoice_dataset:
        formatted_qa_prompt = GLOBAL_CHAT_PROMPT.format(
            invoice_data=invoice_dataset,
            doc_count=invoice_doc_count
        )
    elif document_text:
        formatted_qa_prompt = AI_QA_PROMPT.format(
            mode_instruction=mode_instruction,
            structured_data=os.linesep + str(structured_data) if structured_data else "N/A",
            document_text=document_text[:10000]
        )
    else:
        formatted_qa_prompt = AI_GENERAL_ASSISTANT_PROMPT.format(
            mode_instruction=mode_instruction
        )
    
    system_instruction = AI_ANALYST_PERSONA + "\n" + formatted_qa_prompt
    
    try:
        async for chunk in ai_pool.stream_content(
            prompt=question,
            history=chat_history,
            system_instruction=system_instruction
        ):
            yield chunk
            
    except Exception as e:
        yield f"SYSTEM ERROR: AI Chat failed. {str(e)}"

