# app/database.py

import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import logging

from .config import settings

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None


async def connect_to_mongodb():
    global client, db
    
    # MongoDB URI가 없으면 건너뛰기
    if not settings.MONGODB_URI:
        logger.warning("⚠️  MONGODB_URI가 설정되지 않았습니다. MongoDB 없이 실행합니다.")
        return
    
    logger.info("🔄 Connecting to MongoDB...")
    try:
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=10000,  # 30초는 너무 김
            connectTimeoutMS=10000,
            tls=True,
            tlsAllowInvalidCertificates=True
        )
        await client.admin.command('ping') 
        
        db = client[settings.MONGO_DB_NAME]
        
        logger.info(f"✅ Successfully connected to MongoDB database: {settings.MONGO_DB_NAME}")
        
    except Exception as e:
        logger.error(f"❌ Could not connect to MongoDB: {e}")
        logger.warning("⚠️  MongoDB 기능이 비활성화됩니다. 앱은 계속 실행됩니다.")
        client = None
        db = None
        # raise 제거 - 에러를 던지지 않고 계속 진행
        

async def close_mongodb_connection():
    global client
    if client:
        client.close()
        logger.info("✅ MongoDB connection closed.")


async def get_database():
    if db is None:
        logger.warning("⚠️  Database not initialized. MongoDB 기능을 사용할 수 없습니다.")
        raise RuntimeError("Database not initialized. MongoDB is not available.")
    return db


async def get_user_collection():
    database = await get_database()
    return database["users"]


async def get_exercise_templates_collection():
    database = await get_database()
    return database["exercise_templates"]


async def get_generated_exercises_collection():
    database = await get_database()
    return database["generated_exercises"]


async def get_records_collection():
    database = await get_database()
    return database["records"]