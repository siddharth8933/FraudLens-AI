from typing import Any, Optional
from pydantic import BaseModel, EmailStr, Field

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AnalyzeResponse(BaseModel):
    screening_id: int
    decision: str
    risk_score: float
    result: dict[str, Any]

class HealthResponse(BaseModel):
    status: str
    ocr_available: bool
    version: str
