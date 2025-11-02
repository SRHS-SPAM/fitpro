# backend/app/schemas/auth_schema.py

from pydantic import BaseModel
from typing import Optional

from .user_schema import UserResponse 


class TokenData(BaseModel):
    """JWT 토큰 데이터"""
    user_id: str
    email: str


class Token(BaseModel):
    """토큰 응답"""
    user_id: str
    email: str
    access_token: str
    token_type: str = "bearer"
    
    user: Optional[UserResponse] = None


class TokenPayload(BaseModel):
    """토큰 페이로드"""
    sub: str  # user_id
    email: str
    exp: int  # expiration timestamp