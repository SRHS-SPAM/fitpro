
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserCumulativeStats(BaseModel):
    """
    사용자의 누적 통계 (삭제와 무관하게 유지)
    """
    user_id: str
    total_workouts_ever: int = Field(default=0, description="전체 운동 횟수 (삭제와 무관)")
    total_duration_minutes_ever: int = Field(default=0, description="전체 운동 시간 (삭제와 무관)")
    total_calories_burned_ever: int = Field(default=0, description="전체 소모 칼로리 (삭제와 무관)")
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CumulativeStatsResponse(BaseModel):
    """
    누적 통계 응답
    """
    total_workouts_ever: int
    total_duration_minutes_ever: int
    total_calories_burned_ever: int
    
    # 현재 기록 기반 통계
    current_total_workouts: int
    current_total_duration: int
    current_average_score: float