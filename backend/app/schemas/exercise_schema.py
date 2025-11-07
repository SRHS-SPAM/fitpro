from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime

class PoseLandmark(BaseModel):
    """MediaPipe Pose 랜드마크 좌표"""
    x: float
    y: float
    z: float
    visibility: float


class AnimationKeyframe(BaseModel):
    """애니메이션 키프레임"""
    frame_number: int
    timestamp_ms: int
    pose_landmarks: List[PoseLandmark]
    description: Optional[str] = None


class SilhouetteAnimation(BaseModel):
    """실루엣 애니메이션 데이터"""
    fps: int = 30
    total_duration_ms: Optional[int] = None
    keyframes: List[AnimationKeyframe]


class CustomizationParams(BaseModel):
    """운동 커스터마이징 파라미터"""
    speed_multiplier: float = Field(default=1.0, ge=0.5, le=2.0, description="속도 배율")
    rom_adjustment: Dict[str, float] = Field(default={}, description="관절 가동 범위 조정")
    hold_time_ms: int = Field(default=0, ge=0, description="정적 유지 시간(ms)")


class ExerciseGenerateRequest(BaseModel):
    """운동 생성 요청"""
    exercise_type: str = Field(..., pattern="^(rehabilitation|strength|stretching)$")
    intensity: str = Field(default="medium", pattern="^(low|medium|high)$")
    duration_minutes: int = Field(default=15, ge=5, le=60)
    focus_areas: Optional[List[str]] = Field(default=None, description="집중 부위")


class ExerciseResponse(BaseModel):
    """운동 정보 응답"""
    exercise_id: str
    name: str
    description: str
    instructions: List[str]
    duration_seconds: int
    repetitions: int
    sets: int
    target_parts: List[str]
    safety_warnings: List[str]
    intensity: str
    silhouette_animation: Optional[Dict[str, Any]] = None
    customization_params: Optional[CustomizationParams] = None
    guide_poses: List[Dict[str, Dict[str, float]]] = Field(
        default=[],
        description="운동 가이드 스켈레톤 키프레임 배열 (MediaPipe 랜드마크 11-28)"
    )  # ✨ 추가
    created_at: str
    expires_at: Optional[str] = None

class ExerciseListResponse(BaseModel):
    """운동 목록 응답"""
    total: int
    exercises: List[ExerciseResponse]


class ExerciseTemplateCreate(BaseModel):
    """운동 템플릿 생성 (관리자용)"""
    name: str
    category: str
    target_parts: List[str]
    contraindications: List[str] = []
    base_animation: SilhouetteAnimation
    reference_angles: Dict[str, float] = {}
    verified_by: str

# --- [추가] AI 운동 추천 API를 위한 스키마 ---
class ExerciseRecommendation(BaseModel):
    """운동 추천 목록에 포함될 개별 운동 항목"""
    exercise_id: str = Field(..., description="DB에 저장된 운동의 고유 ID")
    name: str
    description: str
    duration_minutes: int
    intensity: str
    sets: int
    repetitions: int
    recommendation_reason: str

class RecommendationsResponse(BaseModel):
    """운동 추천 API의 최종 응답 형태"""
    exercises: List[ExerciseRecommendation]
# --- 추가된 부분 끝 ---


class PoseAnalysisRequest(BaseModel):
    """실시간 자세 분석 요청"""
    pose_landmarks: List[Dict[str, float]] = Field(..., min_items=33, max_items=33, description="33개 랜드마크")
    timestamp_ms: int = Field(..., ge=0, description="현재 타임스탬프 (밀리초)")

    class Config:
        schema_extra = {
            "example": {
                "pose_landmarks": [
                    {"x": 0.5, "y": 0.3, "z": -0.1, "visibility": 0.99}
                ] * 33,
                "timestamp_ms": 5000
            }
        }


class PoseAnalysisResponse(BaseModel):
    """실시간 자세 분석 응답"""
    is_correct: bool = Field(..., description="자세가 올바른지 여부")
    score: int = Field(..., ge=0, le=100, description="자세 점수 (0-100)")
    feedback: str = Field(..., description="피드백 메시지")
    critical_error: bool = Field(default=False, description="심각한 오류 여부")
    angle_errors: Dict[str, Dict[str, float]] = Field(default={}, description="각도 오차 정보")

    class Config:
        schema_extra = {
            "example": {
                "is_correct": False,
                "score": 75,
                "feedback": "무릎이 발끝을 넘었습니다. 엉덩이를 뒤로 빼주세요.",
                "critical_error": False,
                "angle_errors": {
                    "left_knee": {
                        "current": 85.0,
                        "target": 90.0,
                        "diff": 5.0
                    }
                }
            }
        }


class ExerciseCompleteRequest(BaseModel):
    """운동 완료 요청"""
    completed_sets: int = Field(..., ge=0, description="완료한 세트 수")
    completed_reps: int = Field(..., ge=0, description="완료한 반복 횟수")
    average_score: int = Field(..., ge=0, le=100, description="평균 점수")
    pain_level_before: Optional[int] = Field(None, ge=0, le=10, description="운동 전 통증 수준")
    pain_level_after: int = Field(..., ge=0, le=10, description="운동 후 통증 수준")
    duration_minutes: int = Field(..., gt=0, description="실제 운동 시간 (분)")

    class Config:
        schema_extra = {
            "example": {
                "completed_sets": 3,
                "completed_reps": 10,
                "average_score": 82,
                "pain_level_before": 3,
                "pain_level_after": 2,
                "duration_minutes": 15
            }
        }


class ExerciseFeedback(BaseModel):
    """운동 피드백"""
    summary: str = Field(..., description="전체 요약")
    improvements: List[str] = Field(default=[], description="개선 사항")
    strengths: List[str] = Field(default=[], description="잘한 점")

    class Config:
        schema_extra = {
            "example": {
                "summary": "잘 하셨습니다!",
                "improvements": ["무릎 각도 주의"],
                "strengths": ["속도 조절 우수"]
            }
        }


class ExerciseCompleteResponse(BaseModel):
    """운동 완료 응답"""
    record_id: str = Field(..., description="기록 ID")
    overall_score: int = Field(..., ge=0, le=100, description="전체 점수")
    feedback: ExerciseFeedback = Field(..., description="피드백")
    calories_burned: int = Field(..., ge=0, description="소모 칼로리")

    class Config:
        schema_extra = {
            "example": {
                "record_id": "65abc123def456789012",
                "overall_score": 82,
                "feedback": {
                    "summary": "잘 하셨습니다!",
                    "improvements": ["무릎 각도 주의"],
                    "strengths": ["속도 조절 우수"]
                },
                "calories_burned": 45
            }
        }