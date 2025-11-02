from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
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


class PoseLandmark(BaseModel):
    """
    MediaPipe Pose 랜드마크 (33개 중 하나)
    """
    x: float = Field(..., description="X 좌표 (0.0-1.0)")
    y: float = Field(..., description="Y 좌표 (0.0-1.0)")
    z: float = Field(..., description="Z 좌표 (depth)")
    visibility: float = Field(default=1.0, ge=0.0, le=1.0, description="가시성 (0.0-1.0)")

    class Config:
        schema_extra = {
            "example": {
                "x": 0.5,
                "y": 0.3,
                "z": -0.1,
                "visibility": 0.99
            }
        }


class AnimationKeyframe(BaseModel):
    """
    애니메이션 키프레임
    """
    frame_number: int = Field(..., ge=0, description="프레임 번호")
    timestamp_ms: int = Field(..., ge=0, description="타임스탬프 (밀리초)")
    pose_landmarks: List[PoseLandmark] = Field(..., min_items=33, max_items=33, description="33개 랜드마크")
    description: str = Field(default="", description="동작 설명")

    class Config:
        schema_extra = {
            "example": {
                "frame_number": 0,
                "timestamp_ms": 0,
                "pose_landmarks": [{"x": 0.5, "y": 0.3, "z": -0.1, "visibility": 0.99}] * 33,
                "description": "시작 자세"
            }
        }


class BaseAnimation(BaseModel):
    """
    기본 애니메이션 정보
    """
    fps: int = Field(default=30, ge=1, le=60, description="초당 프레임 수")
    keyframes: List[AnimationKeyframe] = Field(..., min_items=1, description="키프레임 목록")

    class Config:
        schema_extra = {
            "example": {
                "fps": 30,
                "keyframes": [
                    {
                        "frame_number": 0,
                        "timestamp_ms": 0,
                        "pose_landmarks": [{"x": 0.5, "y": 0.3, "z": -0.1, "visibility": 0.99}] * 33,
                        "description": "시작 자세"
                    }
                ]
            }
        }


class ReferenceAngles(BaseModel):
    """
    기준 관절 각도
    """
    left_knee_min: Optional[float] = Field(None, ge=0, le=180, description="왼쪽 무릎 최소 각도")
    left_knee_max: Optional[float] = Field(None, ge=0, le=180, description="왼쪽 무릎 최대 각도")
    right_knee_min: Optional[float] = Field(None, ge=0, le=180, description="오른쪽 무릎 최소 각도")
    right_knee_max: Optional[float] = Field(None, ge=0, le=180, description="오른쪽 무릎 최대 각도")
    left_elbow_min: Optional[float] = Field(None, ge=0, le=180, description="왼쪽 팔꿈치 최소 각도")
    left_elbow_max: Optional[float] = Field(None, ge=0, le=180, description="왼쪽 팔꿈치 최대 각도")
    right_elbow_min: Optional[float] = Field(None, ge=0, le=180, description="오른쪽 팔꿈치 최소 각도")
    right_elbow_max: Optional[float] = Field(None, ge=0, le=180, description="오른쪽 팔꿈치 최대 각도")
    left_hip_min: Optional[float] = Field(None, ge=0, le=180, description="왼쪽 엉덩이 최소 각도")
    left_hip_max: Optional[float] = Field(None, ge=0, le=180, description="왼쪽 엉덩이 최대 각도")
    right_hip_min: Optional[float] = Field(None, ge=0, le=180, description="오른쪽 엉덩이 최소 각도")
    right_hip_max: Optional[float] = Field(None, ge=0, le=180, description="오른쪽 엉덩이 최대 각도")

    class Config:
        schema_extra = {
            "example": {
                "left_knee_min": 160,
                "left_knee_max": 90,
                "right_knee_min": 160,
                "right_knee_max": 90
            }
        }


class ExerciseTemplateModel(BaseModel):
    """
    검증된 기본 운동 템플릿 MongoDB 문서 모델
    """
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str = Field(..., min_length=1, max_length=100, description="운동 이름")
    category: str = Field(..., description="운동 카테고리 (rehabilitation, strength, stretching)")
    target_parts: List[str] = Field(..., min_items=1, description="타겟 부위")
    contraindications: List[str] = Field(default_factory=list, description="금기 사항 (부상 부위)")
    base_animation: BaseAnimation = Field(..., description="기본 애니메이션")
    reference_angles: Optional[ReferenceAngles] = Field(None, description="기준 각도")
    verified_by: Optional[str] = Field(None, description="검증자 (전문가 이름)")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="생성 시간")

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
        schema_extra = {
            "example": {
                "name": "기본 스쿼트",
                "category": "rehabilitation",
                "target_parts": ["무릎", "허벅지", "엉덩이"],
                "contraindications": ["급성 무릎 부상", "인공관절 수술 직후"],
                "base_animation": {
                    "fps": 30,
                    "keyframes": [
                        {
                            "frame_number": 0,
                            "timestamp_ms": 0,
                            "pose_landmarks": [{"x": 0.5, "y": 0.3, "z": -0.1, "visibility": 0.99}] * 33,
                            "description": "시작 자세"
                        }
                    ]
                },
                "reference_angles": {
                    "left_knee_min": 160,
                    "left_knee_max": 90
                },
                "verified_by": "김트레이너",
                "created_at": "2025-01-01T00:00:00"
            }
        }


class ExerciseTemplateCreate(BaseModel):
    """
    운동 템플릿 생성 요청 모델
    """
    name: str = Field(..., min_length=1, max_length=100, description="운동 이름")
    category: str = Field(..., description="운동 카테고리")
    target_parts: List[str] = Field(..., min_items=1, description="타겟 부위")
    contraindications: List[str] = Field(default_factory=list, description="금기 사항")
    base_animation: BaseAnimation = Field(..., description="기본 애니메이션")
    reference_angles: Optional[ReferenceAngles] = Field(None, description="기준 각도")
    verified_by: Optional[str] = Field(None, description="검증자")

    class Config:
        schema_extra = {
            "example": {
                "name": "기본 스쿼트",
                "category": "rehabilitation",
                "target_parts": ["무릎", "허벅지"],
                "contraindications": ["급성 무릎 부상"],
                "base_animation": {
                    "fps": 30,
                    "keyframes": []
                },
                "verified_by": "김트레이너"
            }
        }


class ExerciseTemplateResponse(BaseModel):
    """
    운동 템플릿 API 응답 모델
    """
    template_id: str = Field(..., description="템플릿 ID")
    name: str = Field(..., description="운동 이름")
    category: str = Field(..., description="운동 카테고리")
    target_parts: List[str] = Field(..., description="타겟 부위")
    contraindications: List[str] = Field(..., description="금기 사항")

    class Config:
        schema_extra = {
            "example": {
                "template_id": "65abc123def456789012",
                "name": "기본 스쿼트",
                "category": "rehabilitation",
                "target_parts": ["무릎", "허벅지"],
                "contraindications": ["급성 무릎 부상"]
            }
        }