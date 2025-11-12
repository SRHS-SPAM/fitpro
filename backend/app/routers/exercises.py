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
from ..services import exercise_generation_service
from ..services.pose_analysis_service import analyze_pose
from ..utils.jwt_handler import get_current_user

router = APIRouter(prefix="/exercises", tags=["Exercises"])

@router.get("/recommendations", response_model=RecommendationsResponse)
async def get_exercise_recommendations(current_user: dict = Depends(get_current_user)):
    """사용자의 신체 정보를 기반으로 AI가 여러 운동을 추천합니다."""
    db = await get_database()
    user_id = ObjectId(current_user["user_id"])
    
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    
    body_condition = user.get("body_condition")
    if not body_condition or not body_condition.get("injured_parts"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="운동 추천을 위한 사용자 신체 정보가 부족합니다."
        )

    try:
        recent_exercises = await db.generated_exercises.find({
            "user_id": user_id,
            "created_at": {"$gte": datetime.utcnow() - timedelta(hours=24)}
        }).to_list(length=None)
        
        exclude_names = [ex.get("name") for ex in recent_exercises if ex.get("name")]
        
        recommendations = await exercise_generation_service.generate_exercise_recommendations(
            body_condition,
            exclude_exercises=exclude_names
        )
        if not recommendations:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI 추천 서버 응답 실패")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI 추천 생성 오류: {str(e)}")

    recommended_exercises = []
    for rec in recommendations:
        duration_minutes = rec.get("duration_minutes", 10)
        
        # ✅ 수정: silhouette_animation은 이미 rec에 포함되어 있음
        exercise_doc = {
            "user_id": user_id,
            "name": rec.get("name"),
            "description": rec.get("description"),
            "instructions": rec.get("instructions", []),
            "duration_seconds": duration_minutes * 60,  # ✅ 수정
            "duration_minutes": duration_minutes,
            "repetitions": rec.get("repetitions"),
            "sets": rec.get("sets"),
            "intensity": rec.get("intensity", "medium"),
            "target_parts": rec.get("target_parts", []),
            "safety_warnings": rec.get("safety_warnings", []),
            "silhouette_animation": rec.get("silhouette_animation", {}),  # ✅ 이미 있음
            "guide_poses": rec.get("guide_poses", []),  # ✅ 추가
            "customization_params": {"intensity": rec.get("intensity", "medium")},
            "recommendation_reason": rec.get("recommendation_reason"),
            "is_saved": False,  # ✅ 기본값: 저장 안됨
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=1)
        }
        result = await db.generated_exercises.insert_one(exercise_doc)
        
        rec["exercise_id"] = str(result.inserted_id)
        recommended_exercises.append(rec)

    return RecommendationsResponse(exercises=recommended_exercises)


@router.post("/{exercise_id}/save")
async def save_exercise(
    exercise_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """추천받은 운동을 '내 운동'으로 저장합니다."""
    try:
        exercise = await db.generated_exercises.find_one({
            "_id": ObjectId(exercise_id),
            "user_id": ObjectId(current_user["user_id"])
        })
        
        if not exercise:
            raise HTTPException(status_code=404, detail="운동을 찾을 수 없거나 저장 권한이 없습니다.")
        
        # ✅ expires_at을 7일로 연장
        result = await db.generated_exercises.update_one(
            {"_id": ObjectId(exercise_id), "user_id": ObjectId(current_user["user_id"])},
            {
                "$set": {
                    "is_saved": True,
                    "expires_at": datetime.utcnow() + timedelta(days=7)  # ✅ 저장 시 만료일 연장
                }
            }
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
async def generate_exercise(request: ExerciseGenerateRequest, current_user: dict = Depends(get_current_user)):
    """사용자 맞춤 운동 생성 (AI 기반)"""
    db = await get_database()
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    
    try:
        generated_exercise = await exercise_generation_service.generate_personalized_exercise(
            user_body_condition=user.get("body_condition", {}),
            exercise_type=request.exercise_type,
            intensity=request.intensity,
            duration_minutes=request.duration_minutes,
            db=db
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"운동 생성 오류: {str(e)}")
    
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
        "silhouette_animation": generated_exercise.get("silhouette_animation"),
        "guide_poses": generated_exercise.get("guide_poses", []),  # ✅ 추가
        "customization_params": generated_exercise.get("customization_params", {}),
        "is_saved": True,
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
        intensity=request.intensity, 
        silhouette_animation=generated_exercise["silhouette_animation"],
        created_at=exercise_doc["created_at"].isoformat()
    )


@router.get("/{exercise_id}", response_model=ExerciseResponse)
async def get_exercise(exercise_id: str, current_user: dict = Depends(get_current_user)):
    """특정 운동 상세 조회"""
    db = await get_database()
    try:
        obj_id = ObjectId(exercise_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="잘못된 형식의 운동 ID입니다.")
    
    exercise = await db.generated_exercises.find_one({"_id": obj_id, "user_id": ObjectId(current_user["user_id"])})
    if not exercise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="운동을 찾을 수 없거나 접근 권한이 없습니다.")
    
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
        created_at=exercise["created_at"].isoformat(),
        recommendation_reason=exercise.get("recommendation_reason")
    )


@router.post("/{exercise_id}/analyze-realtime", response_model=PoseAnalysisResponse)
async def analyze_pose_realtime(
    exercise_id: str, 
    request: PoseAnalysisRequest, 
    current_user: dict = Depends(get_current_user)
):
    """실시간 자세 분석 및 피드백 제공"""
    db = await get_database()
    
    try: 
        obj_id = ObjectId(exercise_id)
    except Exception: 
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="잘못된 형식의 운동 ID입니다.")
    
    exercise = await db.generated_exercises.find_one({
        "_id": obj_id, 
        "user_id": ObjectId(current_user["user_id"])
    })
    
    if not exercise: 
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="운동을 찾을 수 없거나 접근 권한이 없습니다."
        )
    
    try: 
        analysis_result = await analyze_pose(
            pose_landmarks=request.pose_landmarks, 
            exercise_data=exercise, 
            timestamp_ms=request.timestamp_ms
        )
    except Exception as e: 
        print(f"❌ Pose analysis error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"자세 분석 중 오류: {str(e)}"
        )
    
    return PoseAnalysisResponse(**analysis_result)


@router.post("/{exercise_id}/complete", response_model=ExerciseCompleteResponse)
async def complete_exercise(
    exercise_id: str, 
    request: ExerciseCompleteRequest, 
    current_user: dict = Depends(get_current_user)
):
    """운동 완료 기록 저장"""
    db = await get_database()
    
    try: 
        obj_id = ObjectId(exercise_id)
    except Exception: 
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="잘못된 형식의 운동 ID입니다.")
    
    exercise = await db.generated_exercises.find_one({
        "_id": obj_id, 
        "user_id": ObjectId(current_user["user_id"])
    })
    
    if not exercise: 
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="운동을 찾을 수 없거나 접근 권한이 없습니다."
        )
    
    # ✅ 칼로리 계산
    intensity = exercise.get("customization_params", {}).get("intensity", "medium")
    intensity_multiplier = {"low": 1.0, "medium": 1.5, "high": 2.0}.get(intensity, 1.5)
    calories_burned = int(request.duration_minutes * 3 * intensity_multiplier)
    
    # ✅ AI 피드백 생성
    avg_score = request.average_score
    feedback = {
        "summary": "",
        "improvements": [],
        "strengths": []
    }
    
    if avg_score >= 90:
        feedback["summary"] = "완벽한 자세로 운동을 완료하셨습니다! 훌륭합니다!"
        feedback["strengths"] = ["정확한 자세 유지", "꾸준한 리듬 유지"]
    elif avg_score >= 70:
        feedback["summary"] = "잘 하셨습니다! 좋은 자세로 운동하셨어요."
        feedback["strengths"] = ["안정적인 동작"]
        feedback["improvements"] = ["관절 각도를 조금 더 정확하게 유지해보세요"]
    elif avg_score >= 50:
        feedback["summary"] = "좋은 시도였습니다. 다음에는 더 잘할 수 있을 거예요!"
        feedback["improvements"] = ["자세를 천천히 익혀보세요", "가이드를 더 주의깊게 따라해보세요"]
        feedback["strengths"] = ["꾸준히 노력하는 모습"]
    else:
        feedback["summary"] = "처음이라 어려울 수 있어요. 천천히 연습해보세요."
        feedback["improvements"] = ["천천히 동작을 따라해보세요", "가이드를 켜고 연습해보세요"]
    
    # ✅ 기록 저장
    record_doc = {
        "user_id": ObjectId(current_user["user_id"]), 
        "exercise_id": obj_id, 
        "exercise_name": exercise["name"],
        "completed_at": datetime.utcnow(), 
        "duration_minutes": request.duration_minutes,
        "completed_sets": request.completed_sets, 
        "completed_reps": request.completed_reps,
        "score": avg_score, 
        "calories_burned": calories_burned,
        "pain_level_before": request.pain_level_before, 
        "pain_level_after": request.pain_level_after,
        "feedback": feedback,
        "score_history": request.score_history if hasattr(request, 'score_history') else []
    }
    
    result = await db.records.insert_one(record_doc)
    
    print(f"✅ 운동 기록 저장 완료: {result.inserted_id}")
    
    return ExerciseCompleteResponse(
        record_id=str(result.inserted_id), 
        overall_score=avg_score, 
        feedback=feedback, 
        calories_burned=calories_burned
    )


@router.delete("/{exercise_id}")
async def delete_exercise(
    exercise_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """내 운동 목록에서 운동 템플릿 삭제"""
    try:
        exercise = await db.generated_exercises.find_one({
            "_id": ObjectId(exercise_id),
            "user_id": ObjectId(current_user["user_id"])
        })
        
        if not exercise:
            raise HTTPException(status_code=404, detail="운동을 찾을 수 없거나 삭제 권한이 없습니다.")
        
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
    """내 운동 목록 조회 (My Exercise 페이지용)"""
    try:
        # ✅ is_saved=True인 운동만 조회
        exercises = await db.generated_exercises.find({
            "user_id": ObjectId(current_user["user_id"]),
            "is_saved": True
        }).sort("created_at", -1).to_list(length=None)
        
        formatted_exercises = []
        for ex in exercises:
            formatted_exercises.append({
                "exercise_id": str(ex["_id"]),
                "name": ex.get("name"),
                "description": ex.get("description"),
                "duration_minutes": ex.get("duration_minutes"),
                "intensity": ex.get("customization_params", {}).get("intensity", "medium"),
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