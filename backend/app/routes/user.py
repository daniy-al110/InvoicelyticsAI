from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import re
from ..core.database import db
from ..services.auth_service import get_current_user, verify_password, get_password_hash
from ..services.whatsapp import whatsapp_service


router = APIRouter(prefix="/user", tags=["User Management"])

class ProfileUpdate(BaseModel):
    name: str
    email: str
    role: str

class PhoneUpdate(BaseModel):
    phone: str

@router.put("/phone")
async def update_phone(data: PhoneUpdate, current_user: dict = Depends(get_current_user)):
    phone = whatsapp_service.normalize_phone(data.phone.strip())
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number cannot be empty")
        
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"phone": phone, "two_factor_phone": phone}}
    )

    return {"message": "Phone number updated successfully", "phone": phone}

@router.put("/update-profile")
async def update_profile(data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    name = data.name.strip()
    email = data.email.strip().lower()
    
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
        
    # Basic email validation
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        raise HTTPException(status_code=400, detail="Invalid email format")
        
    # Check if email is already taken by a different user
    existing = await db.users.find_one({"email": email, "id": {"$ne": current_user["id"]}})
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use by another account")
        
    update_data = {
        "full_name": name,
        "email": email,
        "role": data.role
    }
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": update_data}
    )
    
    # Fetch and return the updated user
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "hashed_password": 0})
    
    return {
        "message": "Profile updated successfully",
        "user": updated_user
    }

class UserPreferences(BaseModel):
    auto_extraction: bool
    persona: str

@router.get("/preferences")
async def get_preferences(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "auto_extraction": user.get("auto_extraction", False),
        "persona": user.get("persona", "Analyst")
    }

@router.put("/preferences")
async def update_preferences(data: UserPreferences, current_user: dict = Depends(get_current_user)):
    valid_personas = ["Analyst", "Auditor", "Manager"]
    if data.persona not in valid_personas:
        raise HTTPException(status_code=400, detail=f"Invalid persona. Must be one of: {', '.join(valid_personas)}")
        
    update_data = {
        "auto_extraction": data.auto_extraction,
        "persona": data.persona
    }
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": update_data}
    )
    
    return update_data

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
async def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # If user doesn't have a password (e.g., they strictly used Google OAuth)
    if not user.get("hashed_password"):
        # You can either strictly reject it, or allow them to set it by bypassing 'current_password'.
        # For security, we'll reject it with a clear message telling them they use OAuth.
        raise HTTPException(
            status_code=400, 
            detail="Your account was created with Google and doesn't have a password. Please use Google to sign in."
        )

    # Verify current password
    if not verify_password(data.current_password, user.get("hashed_password")):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    from ..services.auth_service import validate_password
    validate_password(data.new_password)
        
    # Hash new password
    hashed_pw = get_password_hash(data.new_password)
    
    # Store in DB
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"hashed_password": hashed_pw}}
    )
    
    return {"message": "Password updated"}

@router.get("/quota-status")
async def get_quota_status(current_user: dict = Depends(get_current_user)):
    # 1. Compute usage from DB (count documents)
    usage = await db.documents.count_documents({"user_id": current_user["id"]})
    
    # 2. Calculate percentage
    # We now have 3 Gemini keys @ 1,500 each = 4,500 limit
    # plus DeepSeek failover. We'll set the display limit to 4,500.
    limit = 4500 if current_user.get("role") == "Administrator" else 1000
    
    percentage = int((usage / limit) * 100) if limit > 0 else 0
    if percentage > 100: percentage = 100
        
    # 3. Add reset date
    now = datetime.utcnow()
    if now.month == 12:
        reset_date = datetime(now.year + 1, 1, 1)
    else:
        reset_date = datetime(now.year, now.month + 1, 1)
        
    # 4. Estimated time (assume 15 mins per doc saved across extraction + analysis)
    mins = usage * 15
    time_saved = f"{round(mins/60, 1)} hours" if mins > 60 else f"{mins} mins"
    
    # 5. Determine system health
    try:
        from ai.ai_service import ai_pool
        healthy_keys = [k for k in ai_pool.keys if k.check_health()]
        if not healthy_keys:
            status = "down"
        elif len(healthy_keys) < len(ai_pool.keys):
            status = "degraded"
        else:
            status = "healthy"
    except Exception:
        status = "degraded"
        
    return {
        "quota_used": usage,
        "quota_limit": limit,
        "percentage": percentage,
        "reset_date": reset_date.strftime("%Y-%m-%d"),
        "estimated_time_saved": time_saved,
        "active_model": "AI Pool (Gemini/DeepSeek)",
        "status": status,
        "pool_info": "Gemini x3, DeepSeek x2"
    }

