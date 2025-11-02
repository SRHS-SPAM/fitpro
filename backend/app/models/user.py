from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId


class PyObjectId(ObjectId):
    """
    MongoDB ObjectId를 Pydantic에서 사용하기 위한 커스텀 타입
    """
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")


class BodyCondition(BaseModel):
    """
    사용자 신체 상태 정보
    """
    injured_parts: List[str] = Field(default_factory=list, description="부상 부위 목록")
    pain_level: int = Field(default=0, ge=0, le=10, description="통증 수준 (0-10)")
    limitations: List[str] = Field(default_factory=list, description="신체 제한 사항")

    class Config:
        schema_extra = {
            "example": {
                "injured_parts": ["왼쪽 무릎", "오른쪽 어깨"],
                "pain_level": 5,
                "limitations": ["쪼그려 앉기 어려움", "팔을 높이 들기 어려움"]
            }
        }


class UserModel(BaseModel):
    """
    사용자 MongoDB 문서 모델
    """
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    email: EmailStr = Field(..., description="이메일 주소")
    password_hash: str = Field(..., description="해시된 비밀번호")
    name: str = Field(..., min_length=1, max_length=50, description="사용자 이름")
    body_condition: BodyCondition = Field(default_factory=BodyCondition, description="신체 상태")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="생성 시간")
    updated_at: Optional[datetime] = Field(default=None, description="수정 시간")

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "password_hash": "$2b$12$...",
                "name": "홍길동",
                "body_condition": {
                    "injured_parts": ["왼쪽 무릎"],
                    "pain_level": 3,
                    "limitations": ["쪼그려 앉기 어려움"]
                },
                "created_at": "2025-01-01T00:00:00"
            }
        }


class UserInDB(UserModel):
    """
    데이터베이스에서 조회한 사용자 모델 (비밀번호 포함)
    """
    pass


class UserResponse(BaseModel):
    """
    API 응답용 사용자 모델 (비밀번호 제외)
    """
    user_id: str = Field(..., description="사용자 ID")
    email: EmailStr = Field(..., description="이메일 주소")
    name: str = Field(..., description="사용자 이름")
    body_condition: Optional[BodyCondition] = Field(default=None, description="신체 상태")

    class Config:
        schema_extra = {
            "example": {
                "user_id": "65abc123def456789012",
                "email": "user@example.com",
                "name": "홍길동",
                "body_condition": {
                    "injured_parts": ["왼쪽 무릎"],
                    "pain_level": 3,
                    "limitations": ["쪼그려 앉기 어려움"]
                }
            }
        }


class UserCreate(BaseModel):
    """
    사용자 생성 요청 모델
    """
    email: EmailStr = Field(..., description="이메일 주소")
    password: str = Field(..., min_length=8, max_length=100, description="비밀번호")
    name: str = Field(..., min_length=1, max_length=50, description="사용자 이름")

    class Config:
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "password123",
                "name": "홍길동"
            }
        }


class UserUpdate(BaseModel):
    """
    사용자 정보 업데이트 모델
    """
    name: Optional[str] = Field(None, min_length=1, max_length=50, description="사용자 이름")
    body_condition: Optional[BodyCondition] = Field(None, description="신체 상태")

    class Config:
        schema_extra = {
            "example": {
                "name": "홍길동",
                "body_condition": {
                    "injured_parts": ["왼쪽 무릎"],
                    "pain_level": 2,
                    "limitations": []
                }
            }
        }