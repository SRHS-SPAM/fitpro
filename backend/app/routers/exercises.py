from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timedelta
from bson import ObjectId
from typing import List

from ..database import get_database
from ..schemas.exercise_schema import (
    ExerciseGenerateRequest,
    ExerciseResponse,
    PoseAnalysisRequest,
    PoseAnalysisResponse,
    ExerciseCompleteRequest,
    ExerciseCompleteResponse,
    RecommendationsResponse # 스키마 파일에 추가 필요
)
# generate_personalized_exercise 옆에 generate_exercise_recommendations를 추가로 import
from ..services.exercise_generation_service import generate_personalized_exercise, generate_exercise_recommendations
from ..services.pose_analysis_service import analyze_pose
from ..utils.jwt_handler import get_current_user

router = APIRouter(prefix="/exercises", tags=["Exercises"])

# --- 추가된 부분 시작 ---

@router.get("/recommendations", response_model=RecommendationsResponse)
async def get_exercise_recommendations(current_user: dict = Depends(get_current_user)):
    """
    사용자의 신체 정보를 기반으로 AI가 여러 운동을 추천합니다.
    """
    db = await get_database()
    user_id = ObjectId(current_user["user_id"])
    
    # 1. 사용자 정보 및 신체 정보 조회
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    
    body_condition = user.get("body_condition")
    # 2. [400 오류 해결] 신체 정보가 없으면 추천 불가 -> 400 에러 반환
    if not body_condition or not body_condition.get("injured_parts"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="운동 추천을 위한 사용자 신체 정보가 부족합니다. 먼저 '내 정보 관리'에서 정보를 입력해주세요."
        )

    # 3. AI를 통해 여러 운동 추천 생성
    try:
        recommendations = await generate_exercise_recommendations(body_condition)
        if not recommendations:
            # AI가 응답을 안주거나, 빈 리스트를 줬을 경우
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI 추천 서버에서 응답을 받지 못했습니다. 잠시 후 다시 시도해주세요.")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI 추천 생성 중 오류 발생: {str(e)}")

    # 4. 추천된 운동들을 DB에 저장하고, ID를 부여하여 프론트엔드로 전달
    recommended_exercises = []
    for rec in recommendations:
        exercise_doc = {
            "user_id": user_id,
            "name": rec.get("name"),
            "description": rec.get("description"),
            "instructions": rec.get("instructions", []), # instructions는 AI가 안 줄 수도 있으니 기본값 처리
            "duration_seconds": rec.get("duration_minutes", 10) * 60,
            "repetitions": rec.get("repetitions"),
            "sets": rec.get("sets"),
            "target_parts": rec.get("target_parts", []),
            "safety_warnings": rec.get("safety_warnings", []),
            "customization_params": { "intensity": rec.get("intensity") },
            "recommendation_reason": rec.get("recommendation_reason"), # 추천 이유 추가
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=1) # 추천 운동은 하루만 캐시
        }
        result = await db.generated_exercises.insert_one(exercise_doc)
        
        # 프론트엔드에 보낼 데이터 구성
        rec["exercise_id"] = str(result.inserted_id)
        recommended_exercises.append(rec)

    return RecommendationsResponse(exercises=recommended_exercises)

# --- 추가된 부분 끝 ---


@router.post("/generate", response_model=ExerciseResponse)
async def generate_exercise(request: ExerciseGenerateRequest, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    
    try:
        generated_exercise = await generate_personalized_exercise(
            user_body_condition=user.get("body_condition", {}),
            exercise_type=request.exercise_type,
            intensity=request.intensity,
            duration_minutes=request.duration_minutes,
            db=db
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"운동 생성 중 오류가 발생했습니다: {str(e)}")
    
    exercise_doc = {
        "user_id": ObjectId(current_user["user_id"]),
        "base_template_id": generated_exercise.get("base_template_id"),
        "name": generated_exercise["name"], "description": generated_exercise["description"],
        "instructions": generated_exercise["instructions"], "duration_seconds": generated_exercise["duration_seconds"],
        "repetitions": generated_exercise["repetitions"], "sets": generated_exercise["sets"],
        "target_parts": generated_exercise["target_parts"], "safety_warnings": generated_exercise["safety_warnings"],
        "silhouette_animation": generated_exercise.get("silhouette_animation"),
        "customization_params": generated_exercise.get("customization_params", {}),
        "created_at": datetime.utcnow(), "expires_at": datetime.utcnow() + timedelta(days=7)
    }
    result = await db.generated_exercises.insert_one(exercise_doc)
    exercise_id = str(result.inserted_id)
    
    return ExerciseResponse(
        exercise_id=exercise_id, name=generated_exercise["name"], description=generated_exercise["description"],
        instructions=generated_exercise["instructions"], duration_seconds=generated_exercise["duration_seconds"],
        repetitions=generated_exercise["repetitions"], sets=generated_exercise["sets"],
        target_parts=generated_exercise["target_parts"], safety_warnings=generated_exercise["safety_warnings"],
        intensity=request.intensity, silhouette_animation=generated_exercise["silhouette_animation"],
        created_at=exercise_doc["created_at"].isoformat()
    )


@router.get("/{exercise_id}", response_model=ExerciseResponse)
async def get_exercise(exercise_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(exercise_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="잘못된 형식의 운동 ID입니다.")
    
    exercise = await db.generated_exercises.find_one({"_id": obj_id, "user_id": ObjectId(current_user["user_id"])})
    if not exercise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="운동을 찾을 수 없거나 접근 권한이 없습니다.")
    
    return ExerciseResponse(
        exercise_id=str(exercise["_id"]), name=exercise["name"], description=exercise["description"],
        instructions=exercise["instructions"], duration_seconds=exercise["duration_seconds"],
        repetitions=exercise["repetitions"], sets=exercise["sets"], target_parts=exercise["target_parts"],
        safety_warnings=exercise["safety_warnings"],
        intensity=exercise.get("customization_params", {}).get("intensity", "medium"),
        silhouette_animation=exercise.get("silhouette_animation"),
        created_at=exercise["created_at"].isoformat(),
        # 추천 이유가 있다면 함께 전달
        recommendation_reason=exercise.get("recommendation_reason")
    )

# ... (이하 /analyze-realtime, /complete 엔드포인트는 변경 없음)
@router.post("/{exercise_id}/analyze-realtime", response_model=PoseAnalysisResponse)
async def analyze_pose_realtime(exercise_id: str, request: PoseAnalysisRequest, current_user: dict = Depends(get_current_user)):
    # ... 기존 코드
    db = await get_database()
    try: obj_id = ObjectId(exercise_id)
    except Exception: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="잘못된 형식의 운동 ID입니다.")
    exercise = await db.generated_exercises.find_one({"_id": obj_id, "user_id": ObjectId(current_user["user_id"])})
    if not exercise: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="운동을 찾을 수 없거나 접근 권한이 없습니다.")
    try: analysis_result = await analyze_pose(pose_landmarks=request.pose_landmarks, exercise_data=exercise, timestamp_ms=request.timestamp_ms)
    except Exception as e: raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"자세 분석 중 오류가 발생했습니다: {str(e)}")
    return PoseAnalysisResponse(**analysis_result)

@router.post("/{exercise_id}/complete", response_model=ExerciseCompleteResponse)
async def complete_exercise(exercise_id: str, request: ExerciseCompleteRequest, current_user: dict = Depends(get_current_user)):
    # ... 기존 코드
    db = await get_database()
    try: obj_id = ObjectId(exercise_id)
    except Exception: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="잘못된 형식의 운동 ID입니다.")
    exercise = await db.generated_exercises.find_one({"_id": obj_id, "user_id": ObjectId(current_user["user_id"])})
    if not exercise: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="운동을 찾을 수 없거나 접근 권한이 없습니다.")
    intensity = exercise.get("customization_params", {}).get("intensity", "medium")
    intensity_multiplier = {"low": 1.0, "medium": 1.5, "high": 2.0}.get(intensity, 1.5)
    calories_burned = int(request.duration_minutes * 3 * intensity_multiplier)
    feedback_summary = "잘 하셨습니다!" if request.average_score >= 80 else "좋은 시도였습니다!"
    feedback = {"summary": feedback_summary, "improvements": [], "strengths": []}
    record_doc = {
        "user_id": ObjectId(current_user["user_id"]), "exercise_id": obj_id, "exercise_name": exercise["name"],
        "completed_at": datetime.utcnow(), "duration_minutes": request.duration_minutes,
        "completed_sets": request.completed_sets, "completed_reps": request.completed_reps,
        "score": request.average_score, "calories_burned": calories_burned,
        "pain_level_before": request.pain_level_before, "pain_level_after": request.pain_level_after,
        "feedback": feedback
    }
    result = await db.records.insert_one(record_doc)
    return ExerciseCompleteResponse(record_id=str(result.inserted_id), overall_score=request.average_score, feedback=feedback, calories_burned=calories_burned)