# backend/app/schemas/user_schema.py

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


class BodyCondition(BaseModel):
    """신체 상태 정보"""
    injured_parts: List[str] = Field(default=[], description="부상 부위")
    pain_level: int = Field(default=0, ge=0, le=10, description="통증 레벨 (0-10)")
    limitations: List[str] = Field(default=[], description="움직임 제약사항")


class UserRegister(BaseModel):
    """회원가입 요청"""
    email: EmailStr
    password: str = Field(..., min_length=6, description="비밀번호 (최소 6자)")
    name: str = Field(..., min_length=1, max_length=50)


class UserLogin(BaseModel):
    """로그인 요청"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """사용자 정보 응답"""
    user_id: str
    email: str
    name: str
    body_condition: Optional[BodyCondition] = None
    created_at: str


class UserWithToken(BaseModel):
    """토큰 포함 사용자 정보"""
    user_id: str
    email: str
    name: str
    access_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    """로그인 응답"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class BodyConditionUpdate(BaseModel):
    """신체 상태 업데이트 요청"""
    injured_parts: List[str] = Field(default=[])
    pain_level: int = Field(ge=0, le=10)
    limitations: List[str] = Field(default=[])


class BodyConditionUpdateResponse(BaseModel):
    """신체 상태 업데이트 응답"""
    message: str
    body_condition: BodyCondition


class UserUpdate(BaseModel):
    """사용자 프로필 업데이트"""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    body_condition: Optional[BodyCondition] = None