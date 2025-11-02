from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

# MongoDB 클라이언트 및 데이터베이스 인스턴스를 저장할 변수
client: AsyncIOMotorClient = None
db = None


async def connect_to_mongodb():
    """
    FastAPI 시작 시 MongoDB 연결을 설정합니다.
    (main.py의 lifespan과 함수명 통일)
    """
    global client, db
    print("Connecting to MongoDB...")
    try:
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000  # 5초 타임아웃
        )
        # 연결 테스트 (서버 상태 확인)
        await client.admin.command('ping') 
        db = client[settings.MONGO_DB_NAME]
        print(f"Successfully connected to MongoDB database: {settings.MONGO_DB_NAME}")
    except Exception as e:
        print(f"Could not connect to MongoDB: {e}")
        raise  # 연결 실패 시 예외를 상위로 전달
        

async def close_mongodb_connection():
    """
    FastAPI 종료 시 MongoDB 연결을 닫습니다.
    (main.py의 lifespan과 함수명 통일)
    """
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")


async def get_database():
    """
    현재 데이터베이스 인스턴스를 반환합니다.
    라우터/서비스에서 await get_database() 형태로 사용
    """
    if db is None:
        raise RuntimeError("Database not initialized. Call connect_to_mongodb() first.")
    return db


# 컬렉션 접근을 위한 헬퍼 함수 (선택적)
async def get_user_collection():
    """users 컬렉션 반환"""
    database = await get_database()
    return database["users"]


async def get_exercise_templates_collection():
    """exercise_templates 컬렉션 반환"""
    database = await get_database()
    return database["exercise_templates"]


async def get_generated_exercises_collection():
    """generated_exercises 컬렉션 반환"""
    database = await get_database()
    return database["generated_exercises"]


async def get_records_collection():
    """records 컬렉션 반환"""
    database = await get_database()
    return database["records"]