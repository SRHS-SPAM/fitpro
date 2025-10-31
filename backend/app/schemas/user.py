from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

# --- 요청 (Request) 스키마 ---

class UserRegister(BaseModel):
    """사용자 등록(회원가입) 요청 스키마"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    # 초기 재활 정보
    injured_parts: List[str] = Field(default_factory=list, description="부상당한 신체 부위 목록")
    pain_level: int = Field(default=0, ge=0, le=10, description="현재 통증 수준 (0-10)")
    limitations: Optional[str] = Field(None, description="기타 신체적 제한 사항")

class UserLogin(BaseModel):
    """사용자 로그인 요청 스키마"""
    email: EmailStr
    password: str

class UserUpdateCondition(BaseModel):
    """사용자 신체 상태 업데이트 요청 스키마"""
    injured_parts: List[str] = Field(default_factory=list, description="부상당한 신체 부위 목록")
    pain_level: int = Field(default=0, ge=0, le=10, description="현재 통증 수준 (0-10)")
    limitations: Optional[str] = Field(None, description="기타 신체적 제한 사항")

# --- 응답 (Response) 스키마 ---

class UserResponse(BaseModel):
    """사용자 정보 응답 스키마 (비밀번호 제외)"""
    id: str = Field(..., description="MongoDB ObjectID 문자열")
    email: EmailStr
    injured_parts: List[str]
    pain_level: int
    limitations: Optional[str]
    
    class Config:
        orm_mode = True # FastAPI와 ORM/ODM 모델 간의 호환성 (From_attributes로 대체될 수 있음)
        from_attributes = True # Pydantic v2 호환성