import random
import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from ..core.database import db
from ..services.auth_service import (
    get_current_user, 
    pwd_context, 
    create_reset_token, 
    verify_reset_token, 
    validate_password,
    get_password_hash
)
from ..services.whatsapp import whatsapp_service


router = APIRouter(prefix="/user/2fa", tags=["Two-Factor Authentication"])

# ─── OTP Config ──────────────────────────────────────────────────────────
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
IS_DEV = os.environ.get("ENV", "development") != "production"


def generate_otp() -> str:
    """Generate a random N-digit OTP code."""
    return "".join([str(random.randint(0, 9)) for _ in range(OTP_LENGTH)])


# ─── Request Schemas ─────────────────────────────────────────────────────
class SendCodeRequest(BaseModel):
    phone: str  # e.g. "+923001234567"


class VerifyCodeRequest(BaseModel):
    phone: str
    code: str


# ─── GET 2FA Status ──────────────────────────────────────────────────────
@router.get("/status")
async def get_2fa_status(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "enabled": user.get("two_factor_enabled", False),
        "phone": user.get("two_factor_phone", None),
    }


# ─── Send OTP Code ──────────────────────────────────────────────────────
@router.post("/send-code")
async def send_code(data: SendCodeRequest, current_user: dict = Depends(get_current_user)):
    phone = whatsapp_service.normalize_phone(data.phone.strip())
    
    if not phone or len(phone) < 8:
        raise HTTPException(status_code=400, detail="Invalid phone number")
        
    if not whatsapp_service.check_number_exists(phone):
        raise HTTPException(status_code=400, detail="This phone number is not registered on WhatsApp. Please use a valid WhatsApp number.")

    # 1. Rate Limiting Check
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    timestamps = [datetime.fromisoformat(ts.replace('Z', '+00:00')) for ts in user.get("otp_request_timestamps", [])]
    
    # Clean up old timestamps (older than 1 hour)
    one_hour_ago = now - timedelta(hours=1)
    timestamps = [ts for ts in timestamps if ts > one_hour_ago]
    
    # 10-minute check (max 3)
    ten_mins_ago = now - timedelta(minutes=10)
    recent_requests = [ts for ts in timestamps if ts > ten_mins_ago]
    
    if len(recent_requests) >= 3:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Please wait 10 minutes.")
    
    # Hourly check (max 10)
    if len(timestamps) >= 10:
        raise HTTPException(status_code=429, detail="Hourly OTP limit reached. Please try again later.")

    # 2. Generate and Hash OTP
    otp = generate_otp()
    hashed_otp = pwd_context.hash(otp)
    expires_at = now + timedelta(minutes=OTP_EXPIRY_MINUTES)

    # 3. Store OTP and updated timestamps
    new_timestamps = [ts.isoformat() for ts in timestamps] + [now.isoformat()]
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "pending_2fa_phone": phone,
                "pending_2fa_otp": hashed_otp,
                "pending_2fa_expires": expires_at.isoformat(),
                "pending_2fa_attempts": 0, # Reset attempts on new code
                "otp_request_timestamps": new_timestamps
            }
        },
    )

    # 4. Send real WhatsApp message via Evolution API
    message_text = f"Your Invoicelytics AI Verification Code is: *{otp}*\n\nIt will expire in {OTP_EXPIRY_MINUTES} minutes."
    whatsapp_service.send_text_message(phone, message_text)
    
    print(f"[2FA] OTP for {phone}: {otp} (sent via WhatsApp, stored hashed)")

    response = {
        "message": f"Verification code sent to WhatsApp ({phone})",
        "expires_in_seconds": OTP_EXPIRY_MINUTES * 60,
    }

    if IS_DEV:
        response["dev_otp"] = otp

    return response


# ─── Verify OTP Code ────────────────────────────────────────────────────
@router.post("/verify-code")
async def verify_code(data: VerifyCodeRequest, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    stored_hashed_otp = user.get("pending_2fa_otp")
    stored_phone = user.get("pending_2fa_phone")
    expires_str = user.get("pending_2fa_expires")
    attempts = user.get("pending_2fa_attempts", 0)

    if not stored_hashed_otp or not expires_str:
        raise HTTPException(status_code=400, detail="No pending verification. Please request a new code.")

    # 1. Brute Force Protection (max 5 attempts)
    if attempts >= 5:
        # Clean up blocked OTP
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$unset": {"pending_2fa_otp": "", "pending_2fa_phone": "", "pending_2fa_expires": "", "pending_2fa_attempts": ""}}
        )
        raise HTTPException(status_code=403, detail="Too many failed attempts. Please request a new code.")

    # 2. Check expiry
    expires_at = datetime.fromisoformat(expires_str)
    if datetime.now(timezone.utc) > expires_at:
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$unset": {"pending_2fa_otp": "", "pending_2fa_phone": "", "pending_2fa_expires": "", "pending_2fa_attempts": ""}}
        )
        raise HTTPException(status_code=400, detail="Code has expired. Please request a new one.")

    # 3. Verify phone match
    normalized_input_phone = whatsapp_service.normalize_phone(data.phone.strip())
    if normalized_input_phone != stored_phone:
        raise HTTPException(status_code=400, detail="Phone number mismatch")

    # 4. Verify code (bcrypt)
    if not pwd_context.verify(data.code.strip(), stored_hashed_otp):
        # Increment attempts
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$inc": {"pending_2fa_attempts": 1}}
        )
        remaining = 5 - (attempts + 1)
        raise HTTPException(status_code=400, detail=f"Incorrect verification code. {remaining} attempts remaining.")


    # ✅ Enable 2FA
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "two_factor_enabled": True,
                "two_factor_phone": stored_phone,
            },
            "$unset": {
                "pending_2fa_otp": "",
                "pending_2fa_phone": "",
                "pending_2fa_expires": "",
                "pending_2fa_attempts": "",
            },
        },
    )

    return {"message": "2FA enabled successfully", "phone": stored_phone}


# ─── Disable 2FA ─────────────────────────────────────────────────────────
@router.post("/disable")
async def disable_2fa(current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {"two_factor_enabled": False},
            "$unset": {
                "two_factor_phone": "",
                "pending_2fa_otp": "",
                "pending_2fa_phone": "",
                "pending_2fa_expires": "",
                "pending_2fa_attempts": "",
            },
        },
    )
    return {"message": "2FA has been disabled"}
