# backend/app/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.database import connect_to_mongodb, close_mongodb_connection
from app.config import settings

from app.routers import auth, users, exercises, records, analysis

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    애플리케이션 시작/종료 시 실행되는 이벤트
    """
    # 시작 시
    logger.info("🚀 Starting Fitner API...")
    await connect_to_mongodb()
    logger.info("✅ Connected to MongoDB")
    
    yield
    
    # 종료 시
    logger.info("🛑 Shutting down Fitner API...")
    await close_mongodb_connection()
    logger.info("✅ Closed MongoDB connection")

app = FastAPI(
    title="Fitner API",
    description="AI 기반 맞춤 재활 운동 앱 백엔드 API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)


# CORS 설정 
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000", 
        "[http://127.0.0.1:5173](http://127.0.0.1:5173)",
        "[http://127.0.0.1:3000](http://127.0.0.1:3000)",
        "[https://fitpro-seven.vercel.app](https://fitpro-seven.vercel.app)", 
        "*" 
    ],
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],   
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """
    HTTP 예외를 JSON 형식으로 반환
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """
    일반 예외 처리
    """
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "내부 서버 오류가 발생했습니다.",
            "status_code": 500
        }
    )


@app.get("/", tags=["Health Check"])
async def root():
    """
    API 서버 상태 확인
    """
    return {
        "message": "Fitner API is running! 🏃‍♂️",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health Check"])
async def health_check():
    """
    상세 헬스 체크
    """
    return {
        "status": "healthy",
        "service": "Fitner API",
        "version": "1.0.0",
        "database": "connected"
    }


app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(exercises.router, prefix="/api/v1")
app.include_router(records.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api/v1") 


if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"🔥 Starting development server on port {settings.PORT}")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,
        log_level="info"
    )