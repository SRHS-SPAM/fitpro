from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_to_mongodb():
    global client, db
    print("Connecting to MongoDB...")
    try:
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=30000,
            connectTimeoutMS=30000,
            tls=True,
            tlsAllowInvalidCertificates=True
        )
        await client.admin.command('ping') 
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
        raise RuntimeError("Database not initialized. Call connect_to_mongodb() first.")
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