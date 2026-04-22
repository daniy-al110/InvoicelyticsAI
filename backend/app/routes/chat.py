import json
import uuid
import asyncio
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from bson import ObjectId
from ..models.schemas import ChatRequest, ChatMessage
from ..core.database import db
from ..services.auth_service import get_current_user
from ai.chatbot import chat_with_document

router = APIRouter(prefix="/chat", tags=["AI Chat"])

@router.post("")
async def chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    doc = None
    invoice_dataset = None
    invoice_doc_count = 0
    
    if request.document_id:
        try:
            doc = await db.documents.find_one({"_id": ObjectId(request.document_id), "user_id": current_user['id']})
        except Exception:
            doc = await db.documents.find_one({"id": request.document_id, "user_id": current_user['id']}, {"_id": 0})
    else:
        # GLOBAL MODE
        historical_docs = await db.documents.find(
            {"user_id": current_user['id'], "structured_data": {"$ne": None}},
            {"structured_data": 1, "filename": 1, "created_at": 1}
        ).sort("created_at", -1).to_list(100)
        
        if historical_docs:
            data_list = []
            for d in historical_docs:
                sd = d.get("structured_data", {})
                if sd.get("is_simulated") or sd.get("quota_exceeded") or d.get("metadata", {}).get("is_quota_blocked"):
                    continue
                raw_amount = sd.get("total_amount", {}).get("value", 0)
                try:
                    if isinstance(raw_amount, str):
                        raw_amount = float(raw_amount.replace('$', '').replace(',', '').strip())
                    amount = float(raw_amount or 0)
                except (ValueError, TypeError):
                    amount = 0
                data_list.append({
                    "filename": d.get("filename"),
                    "invoice_number": sd.get("invoice_number", {}).get("value", "N/A"),
                    "vendor": sd.get("vendor", {}).get("value", "N/A"),
                    "date": sd.get("date", {}).get("value", "N/A"),
                    "total_amount": amount
                })
            invoice_dataset = json.dumps(data_list, indent=2)
            invoice_doc_count = len(data_list)

    session_id_val = request.session_id if request.session_id else str(uuid.uuid4())
    doc_id_key = request.document_id if request.document_id else f"global_{session_id_val}"
    
    chat_history_docs = await db.chat_messages.find(
        {"document_id": doc_id_key, "user_id": current_user['id']},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(10)
    
    chat_history = [{"role": m["role"], "content": m["content"]} for m in chat_history_docs]
    
    async def chat_stream_generator():
        full_response = ""
        try:
            async for chunk in chat_with_document(
                question=request.question,
                document_text=doc.get('extracted_text') if doc else None,
                structured_data=doc.get('structured_data') if doc else None,
                chat_history=chat_history,
                explanation_mode=request.explanation_mode,
                invoice_dataset=invoice_dataset,
                invoice_doc_count=invoice_doc_count
            ):
                full_response += chunk
                yield f"data: {json.dumps({'text': chunk})}\n\n"
                await asyncio.sleep(0.01)
            
            await db.chat_messages.insert_many([
                ChatMessage(document_id=doc_id_key, user_id=current_user['id'], role="user", content=request.question).model_dump(mode="json"),
                ChatMessage(document_id=doc_id_key, user_id=current_user['id'], role="assistant", content=full_response).model_dump(mode="json")
            ])
            
            yield f"data: {json.dumps({'message_id': str(uuid.uuid4()), 'session_id': session_id_val, 'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
    return StreamingResponse(chat_stream_generator(), media_type="text/event-stream")
