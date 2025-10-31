from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId

from ..database import get_database
from ..schemas.user_schema import UserResponse, BodyConditionUpdate
from ..utils.jwt_handler import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    현재 로그인한 사용자 정보 조회
    """
    db = await get_database()
    
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다."
        )
    
    return UserResponse(
        user_id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        body_condition=user.get("body_condition")
    )


@router.put("/me/body-condition")
async def update_body_condition(
    body_condition: BodyConditionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    사용자 신체 상태 업데이트
    """
    db = await get_database()
    
    # body_condition 업데이트
    update_data = body_condition.dict(exclude_unset=True)
    
    result = await db.users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {"$set": {"body_condition": update_data}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다."
        )
    
    # 업데이트된 사용자 정보 조회
    updated_user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    return {
        "message": "업데이트 완료",
        "body_condition": updated_user["body_condition"]
    }