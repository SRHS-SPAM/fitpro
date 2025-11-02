# app/database.py

import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

from .config import settings

# MongoDB 클라이언트와 데이터베이스 인스턴스를 저장할 변수
# 초기 상태는 None으로 명확히 지정합니다.
client: Optional[AsyncIOMotorClient] = None
db = None


async def connect_to_mongodb():
    """
    FastAPI 시작 시 MongoDB 연결을 설정합니다.
    """
    global client, db
    print("Connecting to MongoDB...")
    try:
        # 클라이언트 인스턴스는 이 함수 내에서만 생성합니다.
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            # SSL/TLS 인증서 문제를 해결하기 위해 certifi 사용을 명시
            tlsCAFile=certifi.where(),
            # 서버 선택 타임아웃을 5초로 설정하여 너무 오래 기다리지 않도록 함
            serverSelectionTimeoutMS=5000
        )
        
        # ping 명령으로 서버와의 연결을 테스트
        await client.admin.command('ping') 
        
        # 데이터베이스 인스턴스 할당
        db = client[settings.MONGO_DB_NAME]
        
        print(f"Successfully connected to MongoDB database: {settings.MONGO_DB_NAME}")
        
    except Exception as e:
        print(f"Could not connect to MongoDB: {e}")
        # 애플리케이션 시작 시 DB 연결이 실패하면 서버를 중단시키는 것이 안전합니다.
        raise


async def close_mongodb_connection():
    """
    FastAPI 종료 시 MongoDB 연결을 닫습니다.
    """
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")


async def get_database():
    """
    현재 데이터베이스 인스턴스를 반환하는 의존성 함수.
    """
    if db is None:
        raise RuntimeError("Database not initialized. Call connect_to_mongodb() at startup.")
    return db


# --- 컬렉션 접근을 위한 헬퍼 함수들 ---

async def get_user_collection():
    """users 컬렉션을 반환합니다."""
    database = await get_database()
    return database["users"]


async def get_exercise_templates_collection():
    """exercise_templates 컬렉션을 반환합니다."""
    database = await get_database()
    return database["exercise_templates"]


async def get_generated_exercises_collection():
    """generated_exercises 컬렉션을 반환합니다."""
    database = await get_database()
    return database["generated_exercises"]


async def get_records_collection():
    """records 컬렉션을 반환합니다."""
    database = await get_database()
    return database["records"]