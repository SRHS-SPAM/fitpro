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


class SilhouetteKeyframe(BaseModel):
    """
    실루엣 애니메이션 키프레임 (간소화 버전)
    """
    timestamp_ms: int = Field(..., ge=0, description="타임스탬프 (밀리초)")
    pose_landmarks: List[Dict[str, float]] = Field(..., min_items=33, max_items=33, description="33개 랜드마크")
    description: Optional[str] = Field(default="", description="동작 설명")

    class Config:
        schema_extra = {
            "example": {
                "timestamp_ms": 0,
                "pose_landmarks": [{"x": 0.5, "y": 0.3, "z": -0.1, "visibility": 0.99}] * 33,
                "description": "시작 자세"
            }
        }


class SilhouetteAnimation(BaseModel):
    """
    사용자용 실루엣 애니메이션
    """
    keyframes: List[SilhouetteKeyframe] = Field(..., min_items=1, description="키프레임 목록")

    class Config:
        schema_extra = {
            "example": {
                "keyframes": [
                    {
                        "timestamp_ms": 0,
                        "pose_landmarks": [{"x": 0.5, "y": 0.3, "z": -0.1, "visibility": 0.99}] * 33,
                        "description": "시작 자세"
                    }
                ]
            }
        }


class CustomizationParams(BaseModel):
    """
    운동 커스터마이징 파라미터
    """
    speed_multiplier: float = Field(default=1.0, gt=0, description="속도 배율")
    rom_adjustment: Dict[str, Any] = Field(default_factory=dict, description="가동 범위 조정")
    hold_time_ms: int = Field(default=1000, ge=0, description="동작 유지 시간 (밀리초)")
    intensity: str = Field(default="medium", description="강도 (low, medium, high)")

    class Config:
        schema_extra = {
            "example": {
                "speed_multiplier": 1.5,
                "rom_adjustment": {"reduction_percent": 20},
                "hold_time_ms": 2000,
                "intensity": "low"
            }
        }


class GeneratedExerciseModel(BaseModel):
    """
    AI 생성 운동 MongoDB 문서 모델 (7일 캐시)
    """
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId = Field(..., description="사용자 ID")
    base_template_id: Optional[PyObjectId] = Field(None, description="기본 템플릿 ID")
    name: str = Field(..., min_length=1, max_length=100, description="운동 이름")
    description: str = Field(..., description="운동 설명")
    instructions: List[str] = Field(..., min_items=1, description="운동 지침")
    duration_seconds: int = Field(..., gt=0, description="운동 시간 (초)")
    repetitions: int = Field(..., gt=0, description="반복 횟수")
    sets: int = Field(..., gt=0, description="세트 수")
    target_parts: List[str] = Field(..., min_items=1, description="타겟 부위")
    safety_warnings: List[str] = Field(..., description="안전 경고")
    silhouette_animation: SilhouetteAnimation = Field(..., description="실루엣 애니메이션")
    customization_params: CustomizationParams = Field(default_factory=CustomizationParams, description="커스터마이징 파라미터")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="생성 시간")
    expires_at: datetime = Field(..., description="만료 시간 (7일 후)")

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
        schema_extra = {
            "example": {
                "user_id": "65abc123def456789012",
                "base_template_id": "65abc123def456789013",
                "name": "왼쪽 무릎 맞춤 스쿼트",
                "description": "무릎 부담을 줄인 맞춤 운동",
                "instructions": ["1단계: 발을 어깨 너비로 벌립니다", "2단계: 천천히 앉습니다"],
                "duration_seconds": 300,
                "repetitions": 10,
                "sets": 3,
                "target_parts": ["무릎", "허벅지"],
                "safety_warnings": ["통증 시 중단하세요"],
                "silhouette_animation": {
                    "keyframes": [
                        {
                            "timestamp_ms": 0,
                            "pose_landmarks": [{"x": 0.5, "y": 0.3, "z": -0.1, "visibility": 0.99}] * 33
                        }
                    ]
                },
                "customization_params": {
                    "speed_multiplier": 1.5,
                    "rom_adjustment": {},
                    "hold_time_ms": 2000,
                    "intensity": "low"
                },
                "created_at": "2025-01-01T00:00:00",
                "expires_at": "2025-01-08T00:00:00"
            }
        }


class GeneratedExerciseResponse(BaseModel):
    """
    생성된 운동 API 응답 모델
    """
    exercise_id: str = Field(..., description="운동 ID")
    name: str = Field(..., description="운동 이름")
    description: str = Field(..., description="운동 설명")
    instructions: List[str] = Field(..., description="운동 지침")
    duration_seconds: int = Field(..., description="운동 시간 (초)")
    repetitions: int = Field(..., description="반복 횟수")
    sets: int = Field(..., description="세트 수")
    target_parts: List[str] = Field(..., description="타겟 부위")
    safety_warnings: List[str] = Field(..., description="안전 경고")
    silhouette_animation: SilhouetteAnimation = Field(..., description="실루엣 애니메이션")
    created_at: datetime = Field(..., description="생성 시간")

    class Config:
        schema_extra = {
            "example": {
                "exercise_id": "65abc123def456789014",
                "name": "왼쪽 무릎 맞춤 스쿼트",
                "description": "무릎 부담을 줄인 맞춤 운동",
                "instructions": ["1단계: 발을 어깨 너비로 벌립니다"],
                "duration_seconds": 300,
                "repetitions": 10,
                "sets": 3,
                "target_parts": ["무릎", "허벅지"],
                "safety_warnings": ["통증 시 중단하세요"],
                "silhouette_animation": {
                    "keyframes": []
                },
                "created_at": "2025-01-01T00:00:00"
            }
        }


class ExerciseGenerateRequest(BaseModel):
    """
    운동 생성 요청 모델
    """
    exercise_type: str = Field(..., description="운동 타입 (rehabilitation, strength, stretching)")
    intensity: str = Field(..., description="강도 (low, medium, high)")
    duration_minutes: int = Field(..., gt=0, le=120, description="목표 시간 (분)")

    class Config:
        schema_extra = {
            "example": {
                "exercise_type": "rehabilitation",
                "intensity": "low",
                "duration_minutes": 15
            }
        }