import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal

# .env 파일 로드
load_dotenv()

class Settings(BaseSettings):
    """
    환경 변수를 관리하는 Pydantic BaseSettings 클래스.
    모든 환경 변수는 자동적으로 대문자/언더스코어 형태로 로드됩니다.
    """
    model_config = SettingsConfigDict(
        env_file=".env", 
        extra='ignore' # .env에 정의된 모든 변수를 사용
    )

    # 1. 서버 설정
    PORT: int = 8000
    ENVIRONMENT: Literal["development", "production"] = "development"

    # 2. 데이터베이스 설정
    MONGODB_URI: str
    MONGO_DB_NAME: str = "fitner"

    # 3. JWT 인증 설정
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24시간

    # 4. OpenAI 설정
    OPENAI_API_KEY: str

    # 5. 캐시 설정
    DEFAULT_EXERCISE_CACHE_TTL_DAYS: int = 7


# 전역 설정 인스턴스
settings = Settings()

# 환경 변수 누락 확인
if not settings.MONGODB_URI:
    print("FATAL: MONGODB_URI 환경 변수가 설정되지 않았습니다.")
    exit(1)
if not settings.OPENAI_API_KEY:
    print("WARNING: OPENAI_API_KEY가 설정되지 않았습니다. AI 생성 기능이 비활성화됩니다.")
