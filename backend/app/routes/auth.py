import os
from fastapi import APIRouter, HTTPException, Depends
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from ..models.schemas import User, UserCreate, LoginRequest, GoogleAuthRequest
from ..core.database import db
from ..services.auth_service import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    get_current_user,
    create_reset_token,
    verify_reset_token,
    validate_password
)
from ..services.whatsapp import whatsapp_service
from pydantic import BaseModel

class ForgotPasswordRequest(BaseModel):
    phone: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup")
async def signup(user: UserCreate):
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    from ..services.auth_service import validate_password
    validate_password(user.password)
    
    # Normalize phone before storing
    normalized_phone = whatsapp_service.normalize_phone(user.phone)
    
    new_user = User(
        email=user.email,
        full_name=user.full_name,
        phone=normalized_phone,
        hashed_password=get_password_hash(user.password)
    )
    user_dict = new_user.model_dump(mode="json")
    # For convenience, also set it as the 2FA phone so 'Forgot Password' works immediately
    user_dict["two_factor_phone"] = normalized_phone

    
    await db.users.insert_one(user_dict)
    
    token = create_access_token(data={"sub": new_user.id})
    return {"access_token": token, "token_type": "bearer", "user": {"email": new_user.email, "full_name": new_user.full_name, "id": new_user.id, "phone": normalized_phone, "two_factor_phone": normalized_phone}}

@router.post("/login")
async def login(credentials: LoginRequest):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user.get("hashed_password")):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    token = create_access_token(data={"sub": user["id"]})
    return {"access_token": token, "token_type": "bearer", "user": {"email": user["email"], "full_name": user["full_name"], "id": user["id"], "phone": user.get("phone"), "two_factor_phone": user.get("two_factor_phone")}}

@router.post("/google")
async def google_auth(request: GoogleAuthRequest):
    try:
        # Verify Google Token
        idinfo = id_token.verify_oauth2_token(
            request.credential, 
            google_requests.Request(), 
            os.environ.get("GOOGLE_CLIENT_ID")
        )
        
        email = idinfo['email']
        google_id = idinfo['sub']
        full_name = idinfo.get('name', email.split('@')[0])
        
        user = await db.users.find_one({"$or": [{"google_id": google_id}, {"email": email}]})
        
        if not user:
            new_user = User(
                email=email,
                full_name=full_name,
                google_id=google_id
            )
            user_dict = new_user.model_dump(mode="json")
            await db.users.insert_one(user_dict)
            u_id = new_user.id
            u_name = new_user.full_name
        else:
            u_id = user["id"]
            u_name = user["full_name"]
            if not user.get("google_id"):
                await db.users.update_one({"id": u_id}, {"$set": {"google_id": google_id}})

        token = create_access_token(data={"sub": u_id})
        # Fetch the updated user doc to get phone
        user_final = await db.users.find_one({"id": u_id})
        return {"access_token": token, "token_type": "bearer", "user": {"email": email, "full_name": u_name, "id": u_id, "phone": user_final.get("phone"), "two_factor_phone": user_final.get("two_factor_phone")}}
        
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    phone = whatsapp_service.normalize_phone(data.phone.strip())
    
    # 1. Find user by their registered 2FA phone
    user = await db.users.find_one({"two_factor_phone": phone})
    if not user:
        # In production, we might want to return success for privacy, 
        # but here we'll remain direct as per previous logic.
        raise HTTPException(status_code=404, detail="No account found with this registered WhatsApp number.")

    # 2. Generate secure JWT reset token (10 min expiry)
    token = create_reset_token(user["id"])
    frontend_base = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    reset_link = f"{frontend_base}/reset-password/{token}"
    
    # 3. Send WhatsApp message
    message_text = f"Hello! Use the link below to reset your Invoicelytics AI password (expires in 10 minutes):\n\n{reset_link}"
    whatsapp_service.send_text_message(phone, message_text)
    
    return {"message": f"Password reset link sent to WhatsApp ({phone})"}

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    # 1. Verify JWT
    user_id = verify_reset_token(data.token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")
    
    # 2. Validate and Hash New Password
    validate_password(data.new_password)
    hashed_pw = get_password_hash(data.new_password)
    
    # 3. Update DB
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"hashed_password": hashed_pw}}
    )
    
    return {"message": "Password updated successfully."}
