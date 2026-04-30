import os
import uuid
import tempfile
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from bson import ObjectId
from ..models.schemas import UpdateDocumentRequest, CompareRequest
from ..core.database import db
from ..services.auth_service import get_current_user, get_current_user_from_token_param
from ai.ocr import process_document
from ai.extractor import extract_structured_data, generate_insights, generate_comparison

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("/upload")
async def upload(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    content = await file.read()
    allowed_extensions = ['pdf', 'png', 'jpg', 'jpeg', 'txt'] 
    file_extension = file.filename.split('.')[-1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File type not supported. Allowed: {allowed_extensions}")
        
    with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_extension}') as temp_file:
        temp_path = temp_file.name
        temp_file.write(content)
        
    try:
        extracted_text, metadata = await process_document(temp_path, file_extension)
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)
            
    doc_id = str(uuid.uuid4())
    
    # Save file to uploads folder in backend root
    from pathlib import Path
    BACKEND_DIR = Path(__file__).parent.parent.parent
    uploads_dir = BACKEND_DIR / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    file_path = str(uploads_dir / f"{doc_id}.{file_extension}")
    
    with open(file_path, "wb") as f:
        f.write(content)
        
    result = await db.documents.insert_one({
        "id": doc_id,
        "user_id": current_user['id'],
        "filename": file.filename,
        "file_type": file_extension,
        "file_path": file_path, # Store path for retrieval
        "extracted_text": extracted_text,
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"id": doc_id}

@router.get("")
async def list_documents(current_user: dict = Depends(get_current_user)):
    docs = await db.documents.find({"user_id": current_user['id']}).sort("created_at", -1).to_list(100)
    for d in docs:
        d["_id"] = str(d["_id"])
        if "id" not in d:
            d["id"] = d["_id"]
    return docs

@router.get("/{document_id}")
async def get_document(document_id: str, current_user: dict = Depends(get_current_user)):
    try:
        doc = await db.documents.find_one({"_id": ObjectId(document_id), "user_id": current_user['id']})
    except:
        doc = await db.documents.find_one({"id": document_id, "user_id": current_user['id']}, {"_id": 0})
        
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
        if "id" not in doc:
            doc["id"] = doc["_id"]
    chat_messages = await db.chat_messages.find({"document_id": document_id}, {"_id": 0}).sort("timestamp", 1).to_list(100)
    return {"document": doc, "chat_history": chat_messages}

@router.put("/{document_id}")
async def update_document(document_id: str, request: UpdateDocumentRequest, current_user: dict = Depends(get_current_user)):
    result = await db.documents.update_one(
        {"id": document_id, "user_id": current_user['id']},
        {"$set": {"structured_data": request.structured_data}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document updated successfully"}

@router.post("/{document_id}/extract")
async def extract_data(document_id: str, current_user: dict = Depends(get_current_user)):
    try:
        doc = await db.documents.find_one({"id": document_id, "user_id": current_user['id']})
        if not doc:
            doc = await db.documents.find_one({"_id": ObjectId(document_id), "user_id": current_user['id']})
    except:
        raise HTTPException(status_code=404, detail="Document search failed")
        
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        structured_data = await extract_structured_data(doc['extracted_text'])
        
        historical_docs = await db.documents.find(
            {"id": {"$ne": document_id}}, 
            {"structured_data": 1, "created_at": 1}
        ).sort("created_at", -1).to_list(5)
        
        flat_historical = []
        for h in historical_docs:
            sd = h.get('structured_data', {})
            if sd:
                # Resilient extraction for historical context
                date_val = sd.get('date', sd.get('invoice_date', sd.get('statement_date')))
                if isinstance(date_val, dict): date_val = date_val.get('value')
                
                type_val = sd.get('document_type', sd.get('type', 'Other'))
                if isinstance(type_val, dict): type_val = type_val.get('value')
                
                amt_val = sd.get('total_amount', sd.get('amount', sd.get('total', 0)))
                if isinstance(amt_val, dict): amt_val = amt_val.get('value')

                flat_historical.append({
                    "date": date_val,
                    "document_type": type_val,
                    "total_amount": amt_val,
                })

        insights = await generate_insights(structured_data, doc['extracted_text'], flat_historical)
        
        await db.documents.update_one(
            {"id": document_id},
            {"$set": {
                "structured_data": structured_data,
                "insights": insights
            }}
        )
        
        return {
            "document_id": document_id,
            "structured_data": structured_data,
            "insights": insights
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare")
async def compare_documents(request: CompareRequest, current_user: dict = Depends(get_current_user)):
    if len(request.document_ids) < 2:
        raise HTTPException(status_code=400, detail="Requires at least 2 documents to compare")
        
    docs = await db.documents.find(
        {"id": {"$in": request.document_ids}, "user_id": current_user['id']},
        {"id": 1, "filename": 1, "extracted_text": 1, "structured_data": 1, "created_at": 1}
    ).to_list(10)
    
    if len(docs) < 2:
        raise HTTPException(status_code=404, detail="Documents not found")
        
    try:
        # Sort documents to match the order requested in document_ids
        id_map = {doc['id']: doc for doc in docs}
        ordered_docs = [id_map[doc_id] for doc_id in request.document_ids if doc_id in id_map]
        
        comparison_result = await generate_comparison(documents=ordered_docs)
        
        return {
            "docs": [{"id": doc["id"], "filename": doc["filename"]} for doc in ordered_docs],
            "ai_comparison": comparison_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}/file")
async def get_document_file(document_id: str, current_user: dict = Depends(get_current_user_from_token_param)):
    try:
        doc = await db.documents.find_one({"id": document_id, "user_id": current_user['id']})
        if not doc:
            doc = await db.documents.find_one({"_id": ObjectId(document_id), "user_id": current_user['id']})
    except:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if not doc or not doc.get("file_path"):
        raise HTTPException(status_code=404, detail="File not found")
        
    file_path = doc["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File on disk not found")
        
    from fastapi.responses import FileResponse
    return FileResponse(file_path)
