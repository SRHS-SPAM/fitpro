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
        extra='ignore'  # .env에 정의된 모든 변수를 사용
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
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24시간

    # 4. OpenAI 설정
    OPENAI_API_KEY: str

    # 5. 캐시 설정
    DEFAULT_EXERCISE_CACHE_TTL_DAYS: int = 7


# 전역 설정 인스턴스
settings = Settings()


# 환경 변수 검증 (경고만 출력, 종료하지 않음)
def validate_settings():
    """
    필수 환경 변수 검증
    FastAPI 시작 시 명시적으로 호출하거나, 
    각 서비스에서 필요 시 체크
    """
    warnings = []
    errors = []
    
    if not settings.MONGODB_URI or settings.MONGODB_URI == "":
        errors.append("MONGODB_URI 환경 변수가 설정되지 않았습니다.")
    
    if not settings.JWT_SECRET_KEY or settings.JWT_SECRET_KEY == "":
        errors.append("JWT_SECRET_KEY 환경 변수가 설정되지 않았습니다.")
    
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "":
        warnings.append("OPENAI_API_KEY가 설정되지 않았습니다. AI 생성 기능이 비활성화됩니다.")
    
    # 에러 출력
    if errors:
        print("\n❌ FATAL ERRORS:")
        for error in errors:
            print(f"  - {error}")
        print("\n앱을 시작할 수 없습니다. .env 파일을 확인하세요.\n")
        return False
    
    # 경고 출력
    if warnings:
        print("\n⚠️  WARNINGS:")
        for warning in warnings:
            print(f"  - {warning}")
        print()
    
    return True


# 개발 환경 정보 출력 (선택적)
if settings.ENVIRONMENT == "development":
    print("\n" + "="*50)
    print("🔧 Development Environment Settings")
    print("="*50)
    print(f"PORT: {settings.PORT}")
    print(f"ENVIRONMENT: {settings.ENVIRONMENT}")
    print(f"MONGO_DB_NAME: {settings.MONGO_DB_NAME}")
    print(f"JWT_ALGORITHM: {settings.JWT_ALGORITHM}")
    print(f"JWT_EXPIRE_MINUTES: {settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES}")
    print(f"CACHE_TTL_DAYS: {settings.DEFAULT_EXERCISE_CACHE_TTL_DAYS}")
    print(f"MONGODB_URI: {'✅ Set' if settings.MONGODB_URI else '❌ Not Set'}")
    print(f"JWT_SECRET_KEY: {'✅ Set' if settings.JWT_SECRET_KEY else '❌ Not Set'}")
    print(f"OPENAI_API_KEY: {'✅ Set' if settings.OPENAI_API_KEY else '❌ Not Set'}")
    print("="*50 + "\n")