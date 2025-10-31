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
from ..utils.jwt_handler import get_current_user

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
    cache_query = {
        "user_id": ObjectId(current_user["user_id"]),
        "expires_at": {"$gt": datetime.utcnow()}
    }
    cached_exercise = await db.generated_exercises.find_one(cache_query)
    
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
            silhouette_animation=cached_exercise["silhouette_animation"],
            created_at=cached_exercise["created_at"]
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
        created_at=exercise_doc["created_at"]
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
        exercise = await db.generated_exercises.find_one({
            "_id": ObjectId(exercise_id),
            "user_id": ObjectId(current_user["user_id"])
        })
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="잘못된 운동 ID입니다."
        )
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="운동을 찾을 수 없습니다."
        )
    
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
        silhouette_animation=exercise["silhouette_animation"],
        created_at=exercise["created_at"]
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
        exercise = await db.generated_exercises.find_one({
            "_id": ObjectId(exercise_id),
            "user_id": ObjectId(current_user["user_id"])
        })
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="잘못된 운동 ID입니다."
        )
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="운동을 찾을 수 없습니다."
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
    
    return PoseAnalysisResponse(
        is_correct=analysis_result["is_correct"],
        score=analysis_result["score"],
        feedback=analysis_result["feedback"],
        critical_error=analysis_result.get("critical_error", False),
        angle_errors=analysis_result.get("angle_errors", {})
    )


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
        exercise = await db.generated_exercises.find_one({
            "_id": ObjectId(exercise_id),
            "user_id": ObjectId(current_user["user_id"])
        })
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="잘못된 운동 ID입니다."
        )
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="운동을 찾을 수 없습니다."
        )
    
    # 칼로리 계산 (간단한 추정식: 분당 3칼로리 * 강도 계수)
    intensity_multiplier = {"low": 1.0, "medium": 1.5, "high": 2.0}.get(
        exercise.get("customization_params", {}).get("intensity", "medium"), 1.5
    )
    calories_burned = int(request.duration_minutes * 3 * intensity_multiplier)
    
    # 피드백 생성
    feedback = {
        "summary": "잘 하셨습니다!" if request.average_score >= 80 else "좋은 시도였습니다!",
        "improvements": [],
        "strengths": []
    }
    
    if request.average_score >= 80:
        feedback["strengths"].append("전체적으로 자세가 우수합니다")
    if request.average_score < 70:
        feedback["improvements"].append("자세 정확도를 높여주세요")
    if request.pain_level_after and request.pain_level_after > 5:
        feedback["improvements"].append("통증이 높으니 강도를 낮추는 것을 권장합니다")
    
    # 기록 저장
    record_doc = {
        "user_id": ObjectId(current_user["user_id"]),
        "exercise_id": ObjectId(exercise_id),
        "exercise_name": exercise["name"],
        "completed_at": datetime.utcnow(),
        "duration_minutes": request.duration_minutes,
        "completed_sets": request.completed_sets,
        "completed_reps": request.completed_reps,
        "score": request.average_score,
        "calories_burned": calories_burned,
        "pain_level_before": request.pain_level_before if hasattr(request, 'pain_level_before') else None,
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