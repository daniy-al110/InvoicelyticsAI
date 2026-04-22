import re
import json
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from ..core.database import db
from ..services.auth_service import get_current_user
from ai.extractor import generate_monthly_summary

router = APIRouter(tags=["Analytics & Reports"])

@router.get("/anomalies")
async def get_anomalies(
    vendor: Optional[str] = None,
    date_range: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {
        "user_id": current_user['id'],
        "insights": {"$elemMatch": {"priority": {"$in": ["High", "HIGH", "high"]}}},
        "metadata.is_quota_blocked": {"$ne": True},
        "structured_data.is_simulated": {"$ne": True},
        "structured_data.quota_exceeded": {"$ne": True}
    }
    
    if vendor:
        query["structured_data.vendor.value"] = {"$regex": vendor, "$options": "i"}
        
    if date_range and "," in date_range:
        try:
            start_str, end_str = date_range.split(",")
            start_dt = datetime.strptime(start_str.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc)
            end_dt = datetime.strptime(end_str.strip(), "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            query["created_at"] = {"$gte": start_dt, "$lte": end_dt}
        except:
            pass

    docs = await db.documents.find(query, {"id": 1, "filename": 1, "structured_data": 1, "insights": 1, "created_at": 1}).sort("created_at", -1).limit(200).to_list(200)
    
    results = []
    for d in docs:
        sd = d.get("structured_data", {})
        high_insights = [i.get("message", "") for i in d.get("insights", []) if isinstance(i, dict) and str(i.get("priority", "")).upper() == "HIGH"]
        results.append({
            "document_id": d.get("id"),
            "vendor": sd.get("vendor", {}).get("value", "Unknown"),
            "amount": sd.get("total_amount", {}).get("value", 0),
            "anomaly_summary": " | ".join(high_insights)
        })
    return {"anomalies": results}

@router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    total_docs = await db.documents.count_documents({"user_id": current_user['id']})
    needs_review = await db.documents.count_documents({
        "user_id": current_user['id'],
        "$or": [
            {"insights": {"$elemMatch": {"priority": "High"}}},
            {"structured_data": None}
        ]
    })

    docs_with_data = await db.documents.find({
        "user_id": current_user['id'], 
        "structured_data": {"$ne": None},
        "metadata.is_quota_blocked": {"$ne": True},
        "structured_data.is_simulated": {"$ne": True},
        "structured_data.quota_exceeded": {"$ne": True}
    }).to_list(1000)

    # Confidence
    all_confs = []
    for d in docs_with_data:
        sd = d["structured_data"]
        confs = [v.get("confidence", 0) for v in sd.values() if isinstance(v, dict) and "confidence" in v]
        if confs: all_confs.append(sum(confs) / len(confs))
    avg_conf = round((sum(all_confs) / len(all_confs)) * 100) if all_confs else 0

    # Trends
    trend_dict = {}
    for d in docs_with_data:
        sd = d.get("structured_data", {})
        amount = sd.get("total_amount", {}).get("value", 0)
        date_str = None
        raw_date = sd.get("date", {}).get("value")
        if raw_date and str(raw_date).lower() != "n/a":
            try:
                date_str = pd.to_datetime(str(raw_date)).strftime("%Y-%m-%d")
            except: pass
        if not date_str:
            date_str = d.get("created_at").strftime("%Y-%m-%d")
        
        try:
            if isinstance(amount, str): amount = float(amount.replace('$', '').replace(',', '').strip())
        except: amount = 0
            
        trend_dict[date_str] = trend_dict.get(date_str, 0) + float(amount or 0)

    today = datetime.now()
    sorted_trend = []
    for i in range(29, -1, -1):
        day = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        sorted_trend.append({
            "date": (today - timedelta(days=i)).strftime("%b %d"),
            "amount": round(trend_dict.get(day, 0), 2)
        })

    # Vendors
    vendor_dict = {}
    def normalize_vendor(v):
        if not isinstance(v, str) or not v or v.strip().lower() in ["n/a", "unknown"]: return "Unknown"
        v = v.lower()
        v = re.sub(r'\b(corp|inc|llc|ltd|co\.?|company|corporation|incorporated)\b', '', v)
        v = re.sub(r'[^\w\s&]', '', v).strip()
        return v.title() if v else "Unknown"

    for d in docs_with_data:
        vendor_val = d.get("structured_data", {}).get("vendor", {}).get("value", "Unknown")
        vendor = normalize_vendor(vendor_val)
        amount = d.get("structured_data", {}).get("total_amount", {}).get("value", 0)
        try:
            if isinstance(amount, str): amount = float(amount.replace('$', '').replace(',', '').strip())
        except: amount = 0
        vendor_dict[vendor] = vendor_dict.get(vendor, 0) + float(amount or 0)

    top_vendors = sorted([{"name": k, "value": round(v, 2)} for k, v in vendor_dict.items()], key=lambda x: x["value"], reverse=True)[:5]

    return {
        "total_docs": total_docs,
        "avg_confidence": avg_conf,
        "needs_review": needs_review,
        "spending_trend": sorted_trend,
        "vendor_stats": top_vendors
    }

@router.get("/reports/monthly")
async def get_monthly_reports(current_user: dict = Depends(get_current_user)):
    docs_with_data = await db.documents.find({
        "user_id": current_user['id'], 
        "structured_data": {"$ne": None},
        "metadata.is_quota_blocked": {"$ne": True},
        "structured_data.is_simulated": {"$ne": True},
        "structured_data.quota_exceeded": {"$ne": True}
    }).to_list(1000)

    if not docs_with_data: return []

    monthly_data = {}
    for d in docs_with_data:
        sd = d.get("structured_data", {})
        date_val = sd.get("date", {}).get("value")
        try:
            dt = pd.to_datetime(date_val).to_pydatetime() if date_val and isinstance(date_val, str) else d.get("created_at")
        except: dt = d.get("created_at")
        if not dt: continue
        
        month_key = dt.strftime("%Y-%m")
        if month_key not in monthly_data:
            monthly_data[month_key] = {"month": dt.strftime("%B %Y"), "total_spending": 0, "invoice_count": 0}
            
        amount = sd.get("total_amount", {}).get("value", 0)
        try:
            if isinstance(amount, str): amount = float(amount.replace('$', '').replace(',', '').strip())
        except: amount = 0
        monthly_data[month_key]["total_spending"] += float(amount or 0)
        monthly_data[month_key]["invoice_count"] += 1

    sorted_keys = sorted(monthly_data.keys())
    reports = []
    for i, month_key in enumerate(sorted_keys):
        month_info = monthly_data[month_key]
        avg_val = month_info["total_spending"] / month_info["invoice_count"] if month_info["invoice_count"] > 0 else 0
        current_stats = {
            "month": month_info["month"], "total_spending": round(month_info["total_spending"], 2),
            "invoice_count": month_info["invoice_count"], "average_value": round(avg_val, 2)
        }
        
        prior_stats = None
        if i > 0:
            prev_info = monthly_data[sorted_keys[i-1]]
            prior_stats = {
                "total_spending": prev_info["total_spending"], "invoice_count": prev_info["invoice_count"],
                "average_value": prev_info["total_spending"] / prev_info["invoice_count"]
            }

        ai_summary = await generate_monthly_summary(month_label=month_info["month"], statistics=current_stats, prior_stats=prior_stats)
        current_stats["ai_summary"] = ai_summary
        reports.append(current_stats)

    return reports
