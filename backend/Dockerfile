# Python 3.11 Slim Base Image 사용
FROM python:3.11-slim

# 환경 변수 설정 (파이썬이 로그를 stdout으로 버퍼링 없이 출력하도록 설정)
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 작업 디렉토리 설정
WORKDIR /app

# requirements.txt 복사 및 의존성 설치
COPY ./requirements.txt /app/requirements.txt

# pip 캐시를 사용하지 않고 설치
RUN pip install --no-cache-dir -r /app/requirements.txt

# 소스 코드 복사
COPY ./app /app/app

# Uvicorn 서버를 실행할 포트 노출
EXPOSE 8080

# PORT 환경변수를 사용하여 실행 (Cloud Run이 자동으로 설정)
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}