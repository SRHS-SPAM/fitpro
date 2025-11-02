# backend/app/schemas/exercise_schema.py

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

class PoseAnalysisRequest(BaseModel):
    """실시간 자세 분석 요청 (랜드마크 데이터 포함)"""
    pose_landmarks: List[PoseLandmark] = Field(..., description="현재 프레임의 랜드마크 리스트")
    timestamp_ms: int = Field(..., description="현재 프레임의 타임스탬프 (밀리초)")
    # 클라이언트에서 이전 프레임의 정보나 운동 상태를 전달할 필요가 있을 경우 추가 필드 포함 가능
    
class PoseAnalysisResponse(BaseModel):
    """실시간 자세 분석 응답"""
    is_correct: bool = Field(..., description="현재 자세가 목표 자세와 일치하는지 여부")
    score: float = Field(..., ge=0.0, le=100.0, description="자세 정확도 점수 (0-100)")
    feedback: str = Field(..., description="사용자에게 제공할 피드백 메시지")
    critical_error: bool = Field(default=False, description="운동을 중단해야 할 심각한 오류 여부")
    angle_errors: Dict[str, float] = Field(default={}, description="오차가 큰 관절의 각도 오류 정보")


class ExerciseCompleteRequest(BaseModel):
    """운동 완료 요청"""
    duration_minutes: float = Field(..., ge=0.1, description="실제 운동한 시간(분)")
    completed_sets: int = Field(..., ge=0, description="완료한 세트 수")
    completed_reps: int = Field(..., ge=0, description="총 완료한 반복 횟수")
    average_score: float = Field(..., ge=0.0, le=100.0, description="세션 평균 자세 점수")
    pain_level_after: int = Field(..., ge=0, le=10, description="운동 후 통증 수준 (0-10)")
    pain_level_before: Optional[int] = Field(default=None, ge=0, le=10, description="운동 전 통증 수준")


class ExerciseCompleteResponse(BaseModel):
    """운동 완료 응답"""
    record_id: str
    overall_score: float
    feedback: Dict[str, Any]
    calories_burned: int