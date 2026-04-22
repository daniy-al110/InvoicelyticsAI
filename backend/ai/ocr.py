import os
import google.generativeai as genai
from PIL import Image
from typing import Tuple
from dotenv import load_dotenv
import asyncio
from functools import partial

load_dotenv()

from .ai_service import ai_pool

# _format_error is now less critical as ai_pool handles failover, 
# but kept for the final exception if all keys fail.
def _format_error(error: Exception) -> str:
    message = str(error).strip()
    if "Quota exceeded" in message or "ResourceExhausted" in message or "429" in message:
        return (
            "All AI provider quotas exceeded. Please try again after a short delay. "
            f"Original error: {message}"
        )
    return message


async def extract_text_from_file_with_ai(file_path: str) -> str:
    """
    Extract text from an image or PDF file using the centralized AI Pool.
    """
    try:
        # Prepare parts for Gemini (Multimodal)
        if file_path.lower().endswith('.pdf'):
            with open(file_path, "rb") as f:
                pdf_data = f.read()
            
            prompt_parts = [
                "Please extract all the text from this PDF document as accurately as possible. Output only the text.",
                {"mime_type": "application/pdf", "data": pdf_data}
            ]
        else:
            # Treat as an image
            with Image.open(file_path) as image:
                prompt_parts = [
                    "Please extract all the text from this document as accurately as possible. Output only the text.",
                    image
                ]
        
        # Use AI Pool (forcing Gemini for vision tasks)
        text = await ai_pool.generate_content(prompt_parts, preferred_provider="gemini")
        return text.strip()

    except Exception as e:
        raise RuntimeError(_format_error(e)) from e

async def process_document(file_path: str, file_type: str) -> Tuple[str, dict]:
    """
    Process a document (PDF, image, or plain text) with Gemini Vision.
    Plain text files are read directly. On Gemini failure, returns a
    quota-blocked sentinel instead of fake data to protect data integrity.
    """
    metadata = {"file_type": file_type}

    # Plain text — read directly, no AI model needed
    if file_type == "txt":
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                text = f.read()
            metadata["ocr_method"] = "plaintext"
            metadata["text_length"] = len(text)
            return text, metadata
        except Exception as e:
            raise RuntimeError(f"Failed to read text file: {e}") from e

    try:
        # Real AI Vision OCR for PDF and images
        text = await extract_text_from_file_with_ai(file_path)
        metadata["num_pages"] = 1
        metadata["text_length"] = len(text)
        metadata["ocr_method"] = "gemini-vision"
        return text, metadata

    except Exception as e:
        error_message = str(e)
        print(f"Gemini OCR Failed: {error_message}")

        # Safe sentinel — NOT fake invoice data.
        # Analytics and global chat will skip documents with is_quota_blocked=True.
        fallback_text = "[QUOTA_BLOCKED]"
        metadata["num_pages"] = 0
        metadata["text_length"] = len(fallback_text)
        metadata["ocr_method"] = "quota-blocked"
        metadata["is_quota_blocked"] = True
        metadata["error_context"] = error_message[:200]

        return fallback_text, metadata
