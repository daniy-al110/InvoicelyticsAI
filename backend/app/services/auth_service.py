import os
import jwt
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from ..core.database import db

# Security Config
SECRET_KEY = os.environ.get("JWT_SECRET", "8bd1c2b6bffeb6eadf12f76e28b7ccf8547d14fd48d3a355d115c56187d76966")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def validate_password(password: str):
    import re
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    if not re.search("[A-Z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    if not re.search("[0-9]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number")
    if not re.search("[!@#$%^&*(),.?\":{}|<>]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one special character")
    return True

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_reset_token(user_id: str):
    """
    Creates a short-lived (10 min), signed JWT for password recovery.
    """
    to_encode = {
        "sub": user_id,
        "purpose": "password_reset",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_reset_token(token: str) -> Optional[str]:
    """
    Verifies the reset token and returns the user_id if valid.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != "password_reset":
            return None
        return payload.get("sub")
    except Exception:
        return None

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
        
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise credentials_exception
    
    user["has_password"] = bool(user.get("hashed_password"))
    user.pop("hashed_password", None)
    return user

async def get_current_user_from_token_param(token: Optional[str] = None):
    """Fallback auth for iframes/direct file links using ?token= query param"""
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
             raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
        
    user["has_password"] = bool(user.get("hashed_password"))
    user.pop("hashed_password", None)
    return user
