from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId

# ⭐ [핵심] user_schema와 jwt_handler, database를 정확히 import 합니다.
from ..schemas.user_schema import UserResponse
from ..utils.jwt_handler import decode_access_token
from ..database import get_database

router = APIRouter(prefix="/users", tags=["Users"])

# 프론트엔드의 /auth/login에서 토큰을 발급하므로, tokenUrl을 정확히 명시합니다.
# 이 URL은 Swagger UI가 인증 테스트를 할 때 사용하는 경로입니다.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Authorization 헤더에서 토큰을 받아 유효성을 검사하고,
    DB에서 해당 사용자 정보를 찾아 반환하는 의존성 함수입니다.
    다른 모든 API에서 이 함수를 재사용하게 됩니다.
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
    except Exception: # JWTError 등 구체적인 에러 처리 권장
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    db = await get_database()
    # MongoDB의 _id는 ObjectId 객체이므로, 검색 전에 변환해줍니다.
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
        
    # user 딕셔너리에 user_id를 문자열로 추가하여 다른 곳에서 쉽게 사용하도록 합니다.
    user["user_id"] = str(user["_id"])
    return user

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    """
    현재 로그인된 사용자의 정보를 반환합니다. (프론트엔드 App.jsx가 호출)
    """
    # get_current_user가 반환한 사용자 정보를 UserResponse 스키마에 맞춰 가공합니다.
    return UserResponse(
        user_id=str(current_user["_id"]),
        email=current_user["email"],
        name=current_user["name"],
        body_condition=current_user.get("body_condition"),
        created_at=current_user["created_at"].isoformat()
    )