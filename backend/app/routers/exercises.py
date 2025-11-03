# backend/app/routers/exercises.py

from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timedelta
from bson import ObjectId

from ..database import get_database
from ..schemas.exercise_schema import (
    ExerciseGenerateRequest,
    ExerciseResponse,
    PoseAnalysisRequest,
    PoseAnalysisResponse,
    ExerciseCompleteRequest,
    ExerciseCompleteResponse
)
from ..services.exercise_generation_service import generate_personalized_exercise
from ..services.pose_analysis_service import analyze_pose
from ..utils.jwt_handler import get_current_user # get_current_user가 정의된 곳을 정확히 import해야 합니다.

router = APIRouter(prefix="/exercises", tags=["Exercises"])


@router.post("/generate", response_model=ExerciseResponse)
async def generate_exercise(
    request: ExerciseGenerateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    사용자 맞춤 운동 생성 (AI 기반)
    """
    db = await get_database()
    
    # 사용자 정보 조회
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다."
        )
    
    # 캐시된 운동이 있는지 확인 (7일 이내)
    # 테스트 중에는 매번 새로 생성하도록 이 부분을 주석 처리할 수 있습니다.
    cache_query = {
        "user_id": ObjectId(current_user["user_id"]),
        "expires_at": {"$gt": datetime.utcnow()}
    }
    # cached_exercise = await db.generated_exercises.find_one(cache_query)
    cached_exercise = None # 테스트를 위해 캐시 기능 임시 비활성화

    if cached_exercise:
        # 캐시된 운동 반환
        return ExerciseResponse(
            exercise_id=str(cached_exercise["_id"]),
            name=cached_exercise["name"],
            description=cached_exercise["description"],
            instructions=cached_exercise["instructions"],
            duration_seconds=cached_exercise["duration_seconds"],
            repetitions=cached_exercise["repetitions"],
            sets=cached_exercise["sets"],
            target_parts=cached_exercise["target_parts"],
            safety_warnings=cached_exercise["safety_warnings"],
            intensity=cached_exercise.get("customization_params", {}).get("intensity", "medium"),
            silhouette_animation=cached_exercise.get("silhouette_animation"),
            created_at=cached_exercise["created_at"].isoformat()
        )
    
    # AI로 새 운동 생성
    try:
        generated_exercise = await generate_personalized_exercise(
            user_body_condition=user.get("body_condition", {}),
            exercise_type=request.exercise_type,
            intensity=request.intensity,
            duration_minutes=request.duration_minutes,
            db=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"운동 생성 중 오류가 발생했습니다: {str(e)}"
        )
    
    # DB에 저장 (7일 캐시)
    exercise_doc = {
        "user_id": ObjectId(current_user["user_id"]),
        "base_template_id": generated_exercise.get("base_template_id"),
        "name": generated_exercise["name"],
        "description": generated_exercise["description"],
        "instructions": generated_exercise["instructions"],
        "duration_seconds": generated_exercise["duration_seconds"],
        "repetitions": generated_exercise["repetitions"],
        "sets": generated_exercise["sets"],
        "target_parts": generated_exercise["target_parts"],
        "safety_warnings": generated_exercise["safety_warnings"],
        "silhouette_animation": generated_exercise["silhouette_animation"],
        "customization_params": generated_exercise.get("customization_params", {}),
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=7)
    }
    
    result = await db.generated_exercises.insert_one(exercise_doc)
    exercise_id = str(result.inserted_id)
    
    # ⭐ [수정됨] 최종 응답을 생성하는 부분
    return ExerciseResponse(
        exercise_id=exercise_id,
        name=generated_exercise["name"],
        description=generated_exercise["description"],
        instructions=generated_exercise["instructions"],
        duration_seconds=generated_exercise["duration_seconds"],
        repetitions=generated_exercise["repetitions"],
        sets=generated_exercise["sets"],
        target_parts=generated_exercise["target_parts"],
        safety_warnings=generated_exercise["safety_warnings"],
        silhouette_animation=generated_exercise["silhouette_animation"],
        
        # 1. 누락되었던 intensity 필드를 request에서 가져와 추가합니다.
        intensity=request.intensity,
        
        # 2. datetime 객체를 ISO 형식의 문자열로 변환합니다.
        created_at=exercise_doc["created_at"].isoformat()
    )


@router.get("/{exercise_id}", response_model=ExerciseResponse)
async def get_exercise(
    exercise_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    특정 운동 상세 조회
    """
    db = await get_database()
    
    try:
        obj_id = ObjectId(exercise_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="잘못된 형식의 운동 ID입니다."
        )
    
    exercise = await db.generated_exercises.find_one({
        "_id": obj_id,
        "user_id": ObjectId(current_user["user_id"])
    })
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="운동을 찾을 수 없거나 접근 권한이 없습니다."
        )
    
    # ⭐ [수정됨] get API의 응답도 generate와 동일한 문제를 해결합니다.
    return ExerciseResponse(
        exercise_id=str(exercise["_id"]),
        name=exercise["name"],
        description=exercise["description"],
        instructions=exercise["instructions"],
        duration_seconds=exercise["duration_seconds"],
        repetitions=exercise["repetitions"],
        sets=exercise["sets"],
        target_parts=exercise["target_parts"],
        safety_warnings=exercise["safety_warnings"],
        intensity=exercise.get("customization_params", {}).get("intensity", "medium"),
        silhouette_animation=exercise.get("silhouette_animation"),
        created_at=exercise["created_at"].isoformat()
    )


@router.post("/{exercise_id}/analyze-realtime", response_model=PoseAnalysisResponse)
async def analyze_pose_realtime(
    exercise_id: str,
    request: PoseAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    실시간 자세 분석 및 피드백 생성
    """
    db = await get_database()
    
    # 운동 정보 조회
    try:
        obj_id = ObjectId(exercise_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="잘못된 형식의 운동 ID입니다."
        )
    
    exercise = await db.generated_exercises.find_one({
        "_id": obj_id,
        "user_id": ObjectId(current_user["user_id"])
    })
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="운동을 찾을 수 없거나 접근 권한이 없습니다."
        )
    
    # 자세 분석
    try:
        analysis_result = await analyze_pose(
            pose_landmarks=request.pose_landmarks,
            exercise_data=exercise,
            timestamp_ms=request.timestamp_ms
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"자세 분석 중 오류가 발생했습니다: {str(e)}"
        )
    
    return PoseAnalysisResponse(**analysis_result)


@router.post("/{exercise_id}/complete", response_model=ExerciseCompleteResponse)
async def complete_exercise(
    exercise_id: str,
    request: ExerciseCompleteRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    운동 완료 처리 및 기록 저장
    """
    db = await get_database()
    
    # 운동 정보 조회
    try:
        obj_id = ObjectId(exercise_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="잘못된 형식의 운동 ID입니다."
        )
    
    exercise = await db.generated_exercises.find_one({
        "_id": obj_id,
        "user_id": ObjectId(current_user["user_id"])
    })
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="운동을 찾을 수 없거나 접근 권한이 없습니다."
        )
    
    # 칼로리 계산
    intensity = exercise.get("customization_params", {}).get("intensity", "medium")
    intensity_multiplier = {"low": 1.0, "medium": 1.5, "high": 2.0}.get(intensity, 1.5)
    calories_burned = int(request.duration_minutes * 3 * intensity_multiplier)
    
    # 피드백 생성
    feedback_summary = "잘 하셨습니다!" if request.average_score >= 80 else "좋은 시도였습니다!"
    feedback = {"summary": feedback_summary, "improvements": [], "strengths": []}
    
    # 기록 저장
    record_doc = {
        "user_id": ObjectId(current_user["user_id"]),
        "exercise_id": obj_id,
        "exercise_name": exercise["name"],
        "completed_at": datetime.utcnow(),
        "duration_minutes": request.duration_minutes,
        "completed_sets": request.completed_sets,
        "completed_reps": request.completed_reps,
        "score": request.average_score,
        "calories_burned": calories_burned,
        "pain_level_before": request.pain_level_before,
        "pain_level_after": request.pain_level_after,
        "feedback": feedback
    }
    
    result = await db.records.insert_one(record_doc)
    
    return ExerciseCompleteResponse(
        record_id=str(result.inserted_id),
        overall_score=request.average_score,
        feedback=feedback,
        calories_burned=calories_burned
    )