import json
import io
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import StreamingResponse
from bson import ObjectId
from ..core.database import db
from ..services.auth_service import get_current_user
from ai.excel_analyzer import analyze_excel_columns

router = APIRouter(prefix="/excel", tags=["Excel Integration"])

@router.post("/analyze")
async def analyze_excel(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    try:
        if not file.filename.endswith('.xlsx'):
            raise HTTPException(status_code=400, detail="Only .xlsx files are supported")
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="The uploaded file is empty")
        df = pd.read_excel(io.BytesIO(contents), nrows=3, engine='openpyxl')
        columns = df.columns.tolist()
        sample_data = json.loads(df.head(3).to_json(orient='records', date_format='iso'))
        analysis = await analyze_excel_columns(columns, sample_data)
        return {"columns": columns, "sample": sample_data, "analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/append/{document_id}")
async def append_to_excel(
    document_id: str, 
    mapping: str = Form(...), 
    file: UploadFile = File(...), 
    sheet_name: str = Form("Sheet1"), 
    current_user: dict = Depends(get_current_user)
):
    try:
        try:
            doc = await db.documents.find_one({"id": document_id, "user_id": current_user['id']})
            if not doc: doc = await db.documents.find_one({"_id": ObjectId(document_id), "user_id": current_user['id']})
        except: pass
        if not doc or not doc.get("structured_data"):
            raise HTTPException(status_code=404, detail="Extracted data not found")
            
        sd = doc["structured_data"]
        column_mapping = json.loads(mapping)
        
        # Validation
        for required in ["vendor", "total_amount", "date"]:
            if required not in column_mapping.values():
                raise HTTPException(status_code=400, detail=f"Missing required mapping: {required}")
        
        import openpyxl
        
        # Load workbook with openpyxl to preserve styles/formulas
        wb = openpyxl.load_workbook(io.BytesIO(contents))
        # Select target sheet
        if sheet_name in wb.sheetnames:
            sheet = wb[sheet_name]
        else:
            sheet = wb.active
        
        # Get headers from the first row to match mapping
        headers = [cell.value for cell in sheet[1]]
        
        # Prepare the new row based on the mapping
        # mapping is { excel_column_name: standard_field_name }
        new_row_data = []
        for header in headers:
            standard_field = column_mapping.get(str(header))
            if standard_field:
                val = sd.get(standard_field, {}).get("value", "")
                new_row_data.append(val)
            else:
                new_row_data.append(None) # Keep existing column structure
        
        sheet.append(new_row_data)
        
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=Sync_{file.filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export/{document_id}")
async def export_single(document_id: str, current_user: dict = Depends(get_current_user)):
    try:
        doc = await db.documents.find_one({"id": document_id, "user_id": current_user['id']})
        if not doc: doc = await db.documents.find_one({"_id": ObjectId(document_id), "user_id": current_user['id']})
        if not doc or not doc.get("structured_data"): raise HTTPException(status_code=404, detail="Data not found")
        
        sd = doc["structured_data"]
        def gv(k): return sd.get(k, {}).get("value", "N/A")
        
        row = {
            "Invoice Number": gv("invoice_number"),
            "Vendor": gv("vendor"),
            "Date": gv("date"),
            "Total Amount": gv("total_amount"),
            "Currency": gv("currency"),
            "Document Type": gv("document_type")
        }
        df = pd.DataFrame([row])
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
        output.seek(0)
        return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename=Export_{document_id[:8]}.xlsx"})
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.get("/export_all")
async def export_all(current_user: dict = Depends(get_current_user)):
    docs = await db.documents.find({"user_id": current_user['id'], "structured_data": {"$ne": None}}).to_list(500)
    if not docs: raise HTTPException(status_code=404, detail="No data")
    
    rows = []
    for d in docs:
        sd = d["structured_data"]
        rows.append({
            "Filename": d["filename"],
            "Vendor": sd.get("vendor", {}).get("value", "N/A"),
            "Amount": sd.get("total_amount", {}).get("value", 0),
            "Date": sd.get("date", {}).get("value", "N/A")
        })
    df = pd.DataFrame(rows)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    output.seek(0)
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=Full_Export.xlsx"})
