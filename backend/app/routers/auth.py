# backend/app/routers/auth.py

from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from bson import ObjectId
import bcrypt

from ..database import get_database
from ..schemas.user_schema import UserRegister as RegisterRequest, UserLogin as LoginRequest
from ..schemas.auth_schema import Token as AuthResponse
from ..schemas.user_schema import UserResponse
from ..utils.jwt_handler import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """
    신규 사용자 등록
    """
    db = await get_database()
    
    # 이메일 중복 체크
    existing_user = await db.users.find_one({"email": request.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 등록된 이메일입니다."
        )
    
    # 비밀번호 해싱
    password_hash = bcrypt.hashpw(request.password.encode('utf-8'), bcrypt.gensalt())
    
    # 사용자 문서 생성
    user_doc = {
        "email": request.email,
        "password_hash": password_hash.decode('utf-8'),
        "name": request.name,
        "body_condition": {
            "injured_parts": [],
            "pain_level": 0,
            "limitations": []
        },
        "created_at": datetime.utcnow()
    }
    
    # DB 삽입
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # JWT 토큰 생성
    access_token = create_access_token(data={"sub": user_id, "email": request.email})
    
    # AuthResponse 스키마에 따라 응답 반환
    return AuthResponse(
        user_id=user_id,
        email=request.email,
        access_token=access_token
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    사용자 로그인
    """
    db = await get_database()
    
    # 사용자 조회
    user = await db.users.find_one({"email": request.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다."
        )
    
    # 비밀번호 검증
    if not bcrypt.checkpw(request.password.encode('utf-8'), user["password_hash"].encode('utf-8')):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다."
        )
    
    # JWT 토큰 생성
    user_id = str(user["_id"])
    access_token = create_access_token(data={"sub": user_id, "email": user["email"]})
    
    # AuthResponse 스키마에 따라 응답 반환
    return AuthResponse(
        user_id=user_id,
        email=user["email"],
        access_token=access_token,
        user=UserResponse(
            user_id=user_id,
            email=user["email"],
            name=user["name"],
            body_condition=user.get("body_condition"),
            # ⭐ [수정됨] datetime 객체를 ISO 8601 형식의 문자열로 변환합니다.
            created_at=user["created_at"].isoformat()
        )
    )