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
    RecommendationsResponse
)
from ..services.exercise_generation_service import generate_personalized_exercise, generate_exercise_recommendations
from ..services.pose_analysis_service import analyze_pose
from ..utils.jwt_handler import get_current_user

router = APIRouter(prefix="/exercises", tags=["Exercises"])

@router.get("/recommendations", response_model=RecommendationsResponse)
async def get_exercise_recommendations(current_user: dict = Depends(get_current_user)):
    """
    사용자의 신체 정보를 기반으로 AI가 여러 운동을 추천합니다.
    """
    db = await get_database()
    user_id = ObjectId(current_user["user_id"])
    
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    
    body_condition = user.get("body_condition")
    if not body_condition or not body_condition.get("injured_parts"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="운동 추천을 위한 사용자 신체 정보가 부족합니다. 먼저 '내 정보 관리'에서 정보를 입력해주세요."
        )

    try:
        recommendations = await generate_exercise_recommendations(body_condition)
        if not recommendations:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI 추천 서버에서 응답을 받지 못했습니다. 잠시 후 다시 시도해주세요.")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI 추천 생성 중 오류 발생: {str(e)}")

    recommended_exercises = []
    for rec in recommendations:
        duration_minutes = rec.get("duration_minutes", 10)
        intensity = rec.get("intensity", "medium")
        
        exercise_doc = {
            "user_id": user_id,
            "name": rec.get("name"),
            "description": rec.get("description"),
            "instructions": rec.get("instructions", []),
            "duration_seconds": duration_minutes * 60,
            "duration_minutes": duration_minutes,  # ✅ 추가
            "repetitions": rec.get("repetitions"),
            "sets": rec.get("sets"),
            "intensity": intensity,  # ✅ 추가 (최상위 필드)
            "target_parts": rec.get("target_parts", []),
            "safety_warnings": rec.get("safety_warnings", []),
            "silhouette_animation": rec.get("silhouette_animation", {}),
            "guide_poses": rec.get("guide_poses", []),
            "customization_params": { "intensity": intensity },
            "recommendation_reason": rec.get("recommendation_reason"),
            "is_saved": False,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=1)
        }
        result = await db.generated_exercises.insert_one(exercise_doc)
        
        rec["exercise_id"] = str(result.inserted_id)
        recommended_exercises.append(rec)

    return RecommendationsResponse(exercises=recommended_exercises)


# ✅ 새로운 엔드포인트: 운동 저장
@router.post("/{exercise_id}/save")
async def save_exercise(
    exercise_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    추천받은 운동을 '내 운동'으로 저장합니다.
    """
    try:
        exercise = await db.generated_exercises.find_one({
            "_id": ObjectId(exercise_id),
            "user_id": ObjectId(current_user["user_id"])
        })
        
        if not exercise:
            raise HTTPException(
                status_code=404, 
                detail="운동을 찾을 수 없거나 저장 권한이 없습니다."
            )
        
        # is_saved를 True로 업데이트
        result = await db.generated_exercises.update_one(
            {
                "_id": ObjectId(exercise_id),
                "user_id": ObjectId(current_user["user_id"])
            },
            {"$set": {"is_saved": True}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="운동 저장에 실패했습니다.")
        
        return {
            "message": "운동이 저장되었습니다.",
            "exercise_id": exercise_id,
            "exercise_name": exercise.get("name")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if "not a valid ObjectId" in str(e):
            raise HTTPException(status_code=400, detail="올바르지 않은 운동 ID입니다.")
        raise HTTPException(status_code=500, detail=f"운동 저장 실패: {str(e)}")


@router.post("/generate", response_model=ExerciseResponse)
async def generate_exercise(
    request: ExerciseGenerateRequest,
    current_user: dict = Depends(get_current_user)
):
    """사용자 맞춤 운동 생성 (AI 기반)"""
    db = await get_database()
    
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다."
        )
    
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
        "guide_poses": generated_exercise.get("guide_poses", []),  # ✨ 추가
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
        guide_poses=generated_exercise.get("guide_poses", []),  # ✨ 추가
        created_at=exercise_doc["created_at"]
    )


@router.get("/{exercise_id}", response_model=ExerciseResponse)
async def get_exercise(
    exercise_id: str,
    current_user: dict = Depends(get_current_user)
):
    """특정 운동 상세 조회"""
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
        
        # 1. intensity: .get()을 사용하고, 기본값을 "medium" 등으로 설정
        intensity=exercise.get("intensity", "medium"), 
        
        # 2. silhouette_animation: 기본값을 [] (리스트) 대신 {} (딕셔너리)로 변경
        silhouette_animation=exercise.get("silhouette_animation", {}), 
        
        guide_poses=exercise.get("guide_poses", []), 
        
        # 3. created_at: datetime 객체를 .isoformat()을 사용해 문자열로 변환
        created_at=exercise["created_at"].isoformat() 
    )


@router.post("/{exercise_id}/analyze-realtime", response_model=PoseAnalysisResponse)
async def analyze_pose_realtime(exercise_id: str, request: PoseAnalysisRequest, current_user: dict = Depends(get_current_user)):
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


@router.delete("/{exercise_id}")
async def delete_exercise(
    exercise_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    내 운동 목록에서 운동 템플릿 삭제
    """
    try:
        exercise = await db.generated_exercises.find_one({
            "_id": ObjectId(exercise_id),
            "user_id": ObjectId(current_user["user_id"])
        })
        
        if not exercise:
            raise HTTPException(
                status_code=404, 
                detail="운동을 찾을 수 없거나 삭제 권한이 없습니다."
            )
        
        result = await db.generated_exercises.delete_one({
            "_id": ObjectId(exercise_id),
            "user_id": ObjectId(current_user["user_id"])
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="운동 삭제에 실패했습니다.")
        
        return {
            "message": "운동이 삭제되었습니다.",
            "exercise_id": exercise_id,
            "deleted_exercise_name": exercise.get("name")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if "not a valid ObjectId" in str(e):
            raise HTTPException(status_code=400, detail="올바르지 않은 운동 ID입니다.")
        raise HTTPException(status_code=500, detail=f"운동 삭제 실패: {str(e)}")


@router.get("/my-exercises")
async def get_my_exercises(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    내 운동 목록 조회 (My Exercise 페이지용)
    ✅ 수정: is_saved가 True인 운동만 조회
    """
    try:
        exercises = await db.generated_exercises.find({
            "user_id": ObjectId(current_user["user_id"]),
            "is_saved": True  # ✅ 추가: 저장된 운동만 조회
        }).sort("created_at", -1).to_list(length=None)
        
        formatted_exercises = []
        for ex in exercises:
            formatted_exercises.append({
                "exercise_id": str(ex["_id"]),
                "name": ex.get("name"),
                "description": ex.get("description"),
                "duration_minutes": ex.get("duration_minutes"),
                "intensity": ex.get("intensity"),
                "sets": ex.get("sets"),
                "repetitions": ex.get("repetitions"),
                "created_at": ex.get("created_at").isoformat() if ex.get("created_at") else None
            })
        
        return {
            "total": len(formatted_exercises),
            "exercises": formatted_exercises
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"운동 목록 조회 실패: {str(e)}")