# backend/app/schemas/__init__.py

"""
Pydantic 스키마 모듈
API 요청/응답 데이터 검증 및 직렬화
"""

from .user_schema import (
    UserRegister,
    UserLogin,
    UserResponse,
    UserWithToken,
    LoginResponse,
    BodyCondition,
    BodyConditionUpdate,
    BodyConditionUpdateResponse,
    UserUpdate
)

from .auth_schema import (
    Token,
    TokenData,
    TokenPayload
)

from .exercise_schema import (
    ExerciseGenerateRequest,
    ExerciseResponse,
    ExerciseListResponse,
    PoseLandmark,
    AnimationKeyframe,
    SilhouetteAnimation,
    CustomizationParams,
    ExerciseTemplateCreate
)

# from .pose_schema import (
#     PoseLandmarkInput,
#     PoseAnalysisRequest,
#     PoseAnalysisResponse,
#     AngleError,
#     CompletedPoseAnalysis
# )

from .record_schema import (
    RecordCreate,
    RecordResponse,
    RecordListResponse,
    RecordStatisticsResponse,
    MostFrequentExercise,
    DailyBreakdown,
    FeedbackData,
    #RecordUpdateRequest
)

__all__ = [
    # User schemas
    "UserRegister",
    "UserLogin",
    "UserResponse",
    "UserWithToken",
    "LoginResponse",
    "BodyCondition",
    "BodyConditionUpdate",
    "BodyConditionUpdateResponse",
    "UserUpdate",
    
    # Auth schemas
    "Token",
    "TokenData",
    "TokenPayload",
    
    # Exercise schemas
    "ExerciseGenerateRequest",
    "ExerciseResponse",
    "ExerciseListResponse",
    "PoseLandmark",
    "AnimationKeyframe",
    "SilhouetteAnimation",
    "CustomizationParams",
    "ExerciseTemplateCreate",
    
    # Pose schemas
    "PoseLandmarkInput",
    "PoseAnalysisRequest",
    "PoseAnalysisResponse",
    "AngleError",
    "CompletedPoseAnalysis",
    
    # Record schemas
    "RecordCreate",
    "RecordResponse",
    "RecordListResponse",
    "RecordStatisticsResponse",
    "MostFrequentExercise",
    "DailyBreakdown",
    "FeedbackData",
    #"RecordUpdateRequest",
]