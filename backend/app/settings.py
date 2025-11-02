# backend/app/settings.py (수정)

from decouple import config, Csv
from typing import List

# 환경 변수들을 모듈 레벨에서 직접 정의합니다.

# 몽고DB 설정
MONGO_DB_NAME: str = config("MONGO_DB_NAME", default="fitpro")
MONGODB_URI: str = config("MONGODB_URI") # 필수: MongoDB 연결 URI

# JWT 설정
JWT_SECRET_KEY: str = config("JWT_SECRET_KEY")
JWT_ALGORITHM: str = config("JWT_ALGORITHM", default="HS256")

# 이 라인을 추가하여, 코드가 예상하는 'JWT_EXPIRE_MINUTES'를 정의합니다.
# JWT_ACCESS_TOKEN_EXPIRE_MINUTES 값에서 데이터를 가져옵니다.
JWT_EXPIRE_MINUTES: int = config("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", default=1440, cast=int)

# AI/캐시 설정
OPENAI_API_KEY: str = config("OPENAI_API_KEY") 
CACHE_TTL_DAYS: int = config("DEFAULT_EXERCISE_CACHE_TTL_DAYS", default=7, cast=int)

ENVIRONMENT: str = config("ENVIRONMENT", default="development")


# 참고: 이 파일에서 'settings'라는 단일 인스턴스를 내보내지 않으므로, 
# 다른 파일에서는 'from .. import settings' 대신 
# 'from app.settings import OPENAI_API_KEY'와 같이 직접 변수를 import해야 합니다. 
# 하지만 현재 오류를 해결하기 위해 임시로 이 방법을 사용합니다.