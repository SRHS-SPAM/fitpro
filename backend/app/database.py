from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

# MongoDB 클라이언트 및 데이터베이스 인스턴스를 저장할 변수
client: AsyncIOMotorClient = None
db = None

async def connect_to_mongo():
    """
    FastAPI 시작 시 MongoDB 연결을 설정합니다.
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
        # 실제 운영 환경에서는 종료 대신 재시도 로직을 구현할 수 있습니다.
        # 개발 환경에서는 오류를 명확히 표시합니다.
        
async def close_mongo_connection():
    """
    FastAPI 종료 시 MongoDB 연결을 닫습니다.
    """
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")

# 컬렉션 접근을 위한 헬퍼 함수 (추후 라우터/서비스에서 사용)
def get_database():
    """ 현재 데이터베이스 인스턴스를 반환합니다. """
    return db

# 사용 예시 (미리 정의된 컬렉션 이름)
# def get_user_collection():
#     return db["users"]

# def get_exercise_templates_collection():
#     return db["exercise_templates"]
