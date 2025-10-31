# backend/app/schemas/auth_schema.py

from pydantic import BaseModel


class TokenData(BaseModel):
    """JWT 토큰 데이터"""
    user_id: str
    email: str


class Token(BaseModel):
    """토큰 응답"""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """토큰 페이로드"""
    sub: str  # user_id
    email: str
    exp: int  # expiration timestamp