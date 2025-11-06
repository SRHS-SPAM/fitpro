# backend/app/routers/users.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId
import bcrypt
from datetime import datetime

# ⭐ [수정됨] BodyConditionUpdate 스키마를 추가로 import 합니다.
from ..schemas.user_schema import (
    UserResponse, 
    BodyConditionUpdate,
    DeleteAccountRequest,  # 추가
    DeleteAccountResponse   # 추가
)
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


@router.delete("/me", response_model=DeleteAccountResponse)
async def delete_account(
    request: DeleteAccountRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    현재 로그인한 사용자 계정 삭제 (복구 불가능)
    
    - 비밀번호 확인 필수
    - 사용자 데이터, 생성한 운동, 운동 기록 모두 삭제
    - 삭제 후 로그인 불가
    """
    db = await get_database()
    
    # 1. 사용자 조회
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다."
        )
    
    # 2. 비밀번호 확인
    if not bcrypt.checkpw(request.password.encode('utf-8'), user["password_hash"].encode('utf-8')):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="비밀번호가 올바르지 않습니다."
        )
    
    # 3. 확인 문구 체크 (선택적)
    if request.confirm_text and request.confirm_text != "삭제합니다":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="확인 문구가 올바르지 않습니다. '삭제합니다'를 입력해주세요."
        )
    
    user_id = ObjectId(current_user["user_id"])
    deleted_at = datetime.utcnow()
    
    # 4. 관련 데이터 삭제 (트랜잭션 없이 순차 삭제)
    try:
        # 4-1. 생성한 운동 삭제
        await db.generated_exercises.delete_many({"user_id": user_id})
        
        # 4-2. 운동 기록 삭제
        await db.records.delete_many({"user_id": user_id})
        
        # 4-3. 사용자 계정 삭제
        result = await db.users.delete_one({"_id": user_id})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="계정 삭제 중 오류가 발생했습니다."
            )
        
    except Exception as e:
        # 삭제 중 오류 발생 시
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"계정 삭제 중 오류가 발생했습니다: {str(e)}"
        )
    
    # 5. 성공 응답
    return DeleteAccountResponse(
        message="계정이 성공적으로 삭제되었습니다. 그동안 이용해주셔서 감사합니다.",
        deleted_user_id=str(user_id),
        deleted_at=deleted_at.isoformat()
    )


@router.post("/me/verify-password")
async def verify_password(
    password: str,
    current_user: dict = Depends(get_current_user)
):
    """
    비밀번호 확인 (계정 삭제 전 사용)
    
    - 계정 삭제 UI에서 비밀번호 미리 확인용
    """
    db = await get_database()
    
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다."
        )
    
    is_valid = bcrypt.checkpw(password.encode('utf-8'), user["password_hash"].encode('utf-8'))
    
    return {
        "valid": is_valid,
        "message": "비밀번호가 확인되었습니다." if is_valid else "비밀번호가 올바르지 않습니다."
    }