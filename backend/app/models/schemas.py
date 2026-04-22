from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    full_name: str
    phone: Optional[str] = None
    hashed_password: Optional[str] = None
    google_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    phone: str

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    credential: str

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    filename: str
    file_type: str
    extracted_text: str
    structured_data: Optional[Dict] = None
    insights: Optional[List[Dict]] = None
    metadata: Dict
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: str
    user_id: str
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    document_id: Optional[str] = None
    question: str
    explanation_mode: str = "Technical" # "Technical" or "Business"
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    message_id: str
    session_id: Optional[str] = None

class UpdateDocumentRequest(BaseModel):
    structured_data: Dict

class CompareRequest(BaseModel):
    document_ids: List[str]

class ExcelMappingRequest(BaseModel):
    mapping: Dict[str, str]
    sheet_name: str = "Sheet1"
