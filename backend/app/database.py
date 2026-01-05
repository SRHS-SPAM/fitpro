# app/database.py

import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

from .config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_to_mongodb():
    global client, db
    print("Connecting to MongoDB...")
    try:
        # 클라이언트 인스턴스는 이 함수 내에서만 생성합니다.
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=30000,
            connectTimeoutMS=30000,
            tls=True,
            tlsAllowInvalidCertificates=True
        )
        await client.admin.command('ping') 
        
        # 데이터베이스 인스턴스 할당
        db = client[settings.MONGO_DB_NAME]
        
        print(f"Successfully connected to MongoDB database: {settings.MONGO_DB_NAME}")
        
    except Exception as e:
        print(f"Could not connect to MongoDB: {e}")
        raise
        

async def close_mongodb_connection():
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")


async def get_database():
    if db is None:
        raise RuntimeError("Database not initialized. Call connect_to_mongodb() at startup.")
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