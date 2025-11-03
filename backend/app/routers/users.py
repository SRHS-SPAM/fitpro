# backend/app/routers/users.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId

# ⭐ [수정됨] BodyConditionUpdate 스키마를 추가로 import 합니다.
from ..schemas.user_schema import UserResponse, BodyConditionUpdate
from ..utils.jwt_handler import decode_access_token
from ..database import get_database

router = APIRouter(prefix="/users", tags=["Users"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Authorization 헤더에서 토큰을 받아 유효성을 검사하고,
    DB에서 해당 사용자 정보를 찾아 반환하는 의존성 함수입니다.
    """
    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    db = await get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
        
    user["user_id"] = str(user["_id"])
    return user

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    """
    현재 로그인된 사용자의 정보를 반환합니다.
    """
    return UserResponse(
        user_id=str(current_user["_id"]),
        email=current_user["email"],
        name=current_user["name"],
        body_condition=current_user.get("body_condition"),
        created_at=current_user["created_at"].isoformat()
    )

# ⭐ [추가됨] OnboardingPage에서 호출할 신체 정보 업데이트 API 엔드포인트
@router.put("/me/body-condition", response_model=dict)
async def update_user_body_condition(
    body_data: BodyConditionUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """
    현재 로그인한 사용자의 신체 정보를 업데이트합니다.
    """
    db = await get_database()
    user_id = ObjectId(current_user["user_id"])

    # 프론트엔드에서 받은 새로운 신체 정보를 딕셔너리로 변환
    # exclude_unset=True는 프론트에서 보내지 않은 필드는 업데이트에서 제외하는 옵션
    update_data = body_data.dict(exclude_unset=True)
    
    # DB에서 해당 사용자의 body_condition 필드를 업데이트
    result = await db.users.update_one(
        {"_id": user_id},
        {"$set": {"body_condition": update_data}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    # 기획서 응답 명세에 맞춰 성공 메시지와 업데이트된 데이터를 반환
    return {
        "message": "업데이트 완료",
        "body_condition": update_data
    }