from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class FeedbackData(BaseModel):
    summary: str
    improvements: List[str] = []
    strengths: List[str] = []


class RecordCreate(BaseModel):
    exercise_id: str
    duration_minutes: int
    completed_sets: int
    completed_reps: int
    average_score: int = Field(..., ge=0, le=100)
    pain_level_before: Optional[int] = Field(None, ge=0, le=10)
    pain_level_after: Optional[int] = Field(None, ge=0, le=10)
    feedback: Optional[FeedbackData] = None
    pose_analysis_summary: Optional[dict] = None


class RecordResponse(BaseModel):
    record_id: str
    user_id: str
    exercise_id: str
    exercise_name: str
    completed_at: str
    duration_minutes: int
    completed_sets: int
    completed_reps: int
    score: int
    calories_burned: int
    pain_level_before: Optional[int]
    pain_level_after: Optional[int]
    feedback: Optional[dict]
    pose_analysis_summary: Optional[dict]


class RecordListResponse(BaseModel):
    total: int
    page: int
    limit: int
    records: List[RecordResponse]


class MostFrequentExercise(BaseModel):
    exercise_id: str
    name: str
    count: int


class DailyBreakdown(BaseModel):
    date: str
    exercise_count: int
    duration_minutes: int
    average_score: float


class RecordStatisticsResponse(BaseModel):
    period: str
    total_exercises: int
    total_duration_minutes: int
    total_calories_burned: int
    average_score: float
    most_frequent_exercise: Optional[MostFrequentExercise]
    daily_breakdown: List[DailyBreakdown]