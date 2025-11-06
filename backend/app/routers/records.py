# backend/app/routers/records.py

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId

from app.database import get_database
from app.utils.jwt_handler import get_current_user
from app.schemas.record_schema import (
    RecordCreate,
    RecordResponse,
    RecordListResponse,
    RecordStatisticsResponse,
    DailyBreakdown
)

router = APIRouter(prefix="/records", tags=["records"])


@router.post("/", response_model=RecordResponse, status_code=201)
async def create_record(
    record_data: RecordCreate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    운동 완료 후 기록 생성
    """
    try:
        # 운동 정보 조회
        exercise = await db.generated_exercises.find_one({
            "_id": ObjectId(record_data.exercise_id)
        })
        
        if not exercise:
            raise HTTPException(status_code=404, detail="운동을 찾을 수 없습니다.")
        
        # 기록 문서 생성
        record_doc = {
            "user_id": ObjectId(current_user["user_id"]),
            "exercise_id": ObjectId(record_data.exercise_id),
            "exercise_name": exercise.get("name"),
            "completed_at": datetime.utcnow(),
            "duration_minutes": record_data.duration_minutes,
            "completed_sets": record_data.completed_sets,
            "completed_reps": record_data.completed_reps,
            "score": record_data.average_score,
            "calories_burned": _calculate_calories(
                duration_minutes=record_data.duration_minutes,
                intensity=exercise.get("intensity", "medium")
            ),
            "pain_level_before": record_data.pain_level_before,
            "pain_level_after": record_data.pain_level_after,
            "feedback": record_data.feedback.dict() if record_data.feedback else None,
            "pose_analysis_summary": record_data.pose_analysis_summary,
            "created_at": datetime.utcnow()
        }
        
        result = await db.records.insert_one(record_doc)
        record_doc["_id"] = result.inserted_id
        
        # ObjectId를 문자열로 변환하여 반환
        return _format_record_response(record_doc)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"기록 생성 실패: {str(e)}")


@router.get("/", response_model=RecordListResponse)
async def get_records(
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(10, ge=1, le=100, description="페이지당 항목 수"),
    start_date: Optional[str] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    exercise_name: Optional[str] = Query(None, description="운동 이름 필터"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    사용자의 운동 기록 목록 조회 (페이지네이션, 필터링 지원)
    """
    try:
        # 필터 조건 구성
        query = {"user_id": ObjectId(current_user["user_id"])}
        
        # 날짜 필터
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = datetime.fromisoformat(start_date)
            if end_date:
                end_datetime = datetime.fromisoformat(end_date) + timedelta(days=1)
                date_filter["$lt"] = end_datetime
            query["completed_at"] = date_filter
        
        # 운동 이름 필터
        if exercise_name:
            query["exercise_name"] = {"$regex": exercise_name, "$options": "i"}
        
        # 전체 개수 조회
        total = await db.records.count_documents(query)
        
        # 페이지네이션
        skip = (page - 1) * limit
        
        # 기록 조회 (최신순 정렬)
        cursor = db.records.find(query).sort("completed_at", -1).skip(skip).limit(limit)
        records = await cursor.to_list(length=limit)
        
        # 응답 포맷팅
        formatted_records = [_format_record_response(record) for record in records]
        
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "records": formatted_records
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"기록 조회 실패: {str(e)}")


@router.get("/{record_id}", response_model=RecordResponse)
async def get_record_detail(
    record_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    특정 운동 기록 상세 조회
    """
    try:
        record = await db.records.find_one({
            "_id": ObjectId(record_id),
            "user_id": ObjectId(current_user["user_id"])
        })
        
        if not record:
            raise HTTPException(status_code=404, detail="기록을 찾을 수 없습니다.")
        
        return _format_record_response(record)
        
    except Exception as e:
        if "not a valid ObjectId" in str(e):
            raise HTTPException(status_code=400, detail="올바르지 않은 기록 ID입니다.")
        raise HTTPException(status_code=500, detail=f"기록 조회 실패: {str(e)}")


@router.get("/statistics/summary", response_model=RecordStatisticsResponse)
async def get_statistics(
    period: str = Query("week", regex="^(week|month|year)$", description="통계 기간"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    운동 통계 조회 (주간/월간/연간)
    """
    try:
        # 기간 계산
        now = datetime.utcnow()
        if period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now - timedelta(days=30)
        else:  # year
            start_date = now - timedelta(days=365)
        
        # 기간 내 기록 조회
        query = {
            "user_id": ObjectId(current_user["user_id"]),
            "completed_at": {"$gte": start_date}
        }
        
        records = await db.records.find(query).to_list(length=None)
        
        if not records:
            return {
                "period": period,
                "total_exercises": 0,
                "total_duration_minutes": 0,
                "total_calories_burned": 0,
                "average_score": 0,
                "most_frequent_exercise": None,
                "daily_breakdown": []
            }
        
        # 통계 계산
        total_exercises = len(records)
        total_duration = sum(r.get("duration_minutes", 0) for r in records)
        total_calories = sum(r.get("calories_burned", 0) for r in records)
        average_score = sum(r.get("score", 0) for r in records) / total_exercises
        
        # 가장 많이 한 운동
        exercise_counts = {}
        for record in records:
            ex_id = str(record.get("exercise_id"))
            ex_name = record.get("exercise_name")
            if ex_id not in exercise_counts:
                exercise_counts[ex_id] = {"name": ex_name, "count": 0}
            exercise_counts[ex_id]["count"] += 1
        
        most_frequent = None
        if exercise_counts:
            most_frequent_id = max(exercise_counts, key=lambda k: exercise_counts[k]["count"])
            most_frequent = {
                "exercise_id": most_frequent_id,
                "name": exercise_counts[most_frequent_id]["name"],
                "count": exercise_counts[most_frequent_id]["count"]
            }
        
        # 일별 분석
        daily_data = {}
        for record in records:
            date_key = record["completed_at"].strftime("%Y-%m-%d")
            if date_key not in daily_data:
                daily_data[date_key] = {
                    "date": date_key,
                    "exercise_count": 0,
                    "duration_minutes": 0,
                    "total_score": 0,
                    "score_count": 0
                }
            
            daily_data[date_key]["exercise_count"] += 1
            daily_data[date_key]["duration_minutes"] += record.get("duration_minutes", 0)
            daily_data[date_key]["total_score"] += record.get("score", 0)
            daily_data[date_key]["score_count"] += 1
        
        # 평균 점수 계산
        daily_breakdown = []
        for date_key in sorted(daily_data.keys()):
            data = daily_data[date_key]
            avg_score = data["total_score"] / data["score_count"] if data["score_count"] > 0 else 0
            daily_breakdown.append({
                "date": data["date"],
                "exercise_count": data["exercise_count"],
                "duration_minutes": data["duration_minutes"],
                "average_score": round(avg_score, 1)
            })
        
        return {
            "period": period,
            "total_exercises": total_exercises,
            "total_duration_minutes": total_duration,
            "total_calories_burned": total_calories,
            "average_score": round(average_score, 1),
            "most_frequent_exercise": most_frequent,
            "daily_breakdown": daily_breakdown
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"통계 조회 실패: {str(e)}")


# backend/app/routers/records.py의 delete_record 함수를 이것으로 교체

@router.delete("/{record_id}")
async def delete_record(
    record_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    운동 기록 삭제
    
    - 기록은 삭제되지만, 이미 집계된 통계(총 운동 시간, 횟수 등)는 유지됩니다.
    - 실제 운동 기록만 삭제되며, 운동 템플릿(my_exercises)은 영향받지 않습니다.
    """
    try:
        # 삭제 전에 기록 존재 여부 확인
        record = await db.records.find_one({
            "_id": ObjectId(record_id),
            "user_id": ObjectId(current_user["user_id"])
        })
        
        if not record:
            raise HTTPException(status_code=404, detail="기록을 찾을 수 없습니다.")
        
        # 기록 삭제
        result = await db.records.delete_one({
            "_id": ObjectId(record_id),
            "user_id": ObjectId(current_user["user_id"])
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="기록 삭제에 실패했습니다.")
        
        # 204 No Content 대신 200 OK로 메시지 반환 (프론트엔드에서 확인 가능)
        return {
            "message": "기록이 삭제되었습니다.",
            "record_id": record_id,
            "deleted_exercise_name": record.get("exercise_name")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if "not a valid ObjectId" in str(e):
            raise HTTPException(status_code=400, detail="올바르지 않은 기록 ID입니다.")
        raise HTTPException(status_code=500, detail=f"기록 삭제 실패: {str(e)}")



def _format_record_response(record: dict) -> dict:
    """
    MongoDB 문서를 API 응답 형식으로 변환
    """
    return {
        "record_id": str(record["_id"]),
        "user_id": str(record["user_id"]),
        "exercise_id": str(record["exercise_id"]),
        "exercise_name": record.get("exercise_name"),
        "completed_at": record.get("completed_at").isoformat() if record.get("completed_at") else None,
        "duration_minutes": record.get("duration_minutes"),
        "completed_sets": record.get("completed_sets"),
        "completed_reps": record.get("completed_reps"),
        "score": record.get("score"),
        "calories_burned": record.get("calories_burned"),
        "pain_level_before": record.get("pain_level_before"),
        "pain_level_after": record.get("pain_level_after"),
        "feedback": record.get("feedback"),
        "pose_analysis_summary": record.get("pose_analysis_summary")
    }


def _calculate_calories(duration_minutes: int, intensity: str) -> int:
    """
    운동 시간과 강도에 따른 소모 칼로리 계산 (간단한 추정)
    """
    # MET(Metabolic Equivalent) 값 기반
    met_values = {
        "low": 3.0,      # 가벼운 재활 운동
        "medium": 5.0,   # 중간 강도
        "high": 7.0      # 높은 강도
    }
    
    met = met_values.get(intensity, 3.0)
    # 평균 체중 70kg 가정
    # 칼로리 = MET × 체중(kg) × 시간(hour)
    calories = met * 70 * (duration_minutes / 60)
    
    return int(calories)