from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .database import connect_to_mongo, close_mongo_connection

# TODO: routers, services, schemas, models, utils import 예정

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI 서버 시작/종료 시 실행될 비동기 라이프사이클 이벤트 핸들러
    """
    # 서버 시작 시: 데이터베이스 연결
    await connect_to_mongo()
    print("Application startup complete.")
    yield
    # 서버 종료 시: 데이터베이스 연결 해제
    await close_mongo_connection()
    print("Application shutdown complete.")


# FastAPI 애플리케이션 초기화
app = FastAPI(
    title="Fitner AI Rehabilitation API",
    description="AI 기반 맞춤 재활 운동 제공 백엔드 시스템",
    version="v1",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan # 라이프사이클 이벤트 등록
)

# CORS (Cross-Origin Resource Sharing) 설정
# 프론트엔드 (http://localhost:5173)와의 통신을 허용합니다.
origins = [
    "http://localhost",
    "http://localhost:5173", # 프론트엔드 Vite 기본 포트
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)

# --- 라우터 등록 (TODO: 나중에 구현 예정) ---
# from .routers import auth, users, exercises, records
# app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
# app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
# app.include_router(exercises.router, prefix="/api/v1/exercises", tags=["Exercises"])
# app.include_router(records.router, prefix="/api/v1/records", tags=["Records"])


@app.get("/api/v1", tags=["Root"])
async def root():
    """API 상태 확인을 위한 루트 엔드포인트"""
    return {"message": "Fitner API v1 Running", "environment": settings.ENVIRONMENT}

@app.get("/api/v1/health", tags=["Root"])
async def health_check():
    """헬스 체크 엔드포인트"""
    # 간단한 연결 테스트 로직을 추가할 수 있습니다.
    return {"status": "ok", "db_connected": bool(connect_to_mongo)}
