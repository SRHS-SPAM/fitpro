# Python 3.11 Slim Base Image 사용
FROM python:3.11-slim

# 환경 변수 설정 (파이썬이 로그를 stdout으로 버퍼링 없이 출력하도록 설정)
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치 (필요 없음, slim 이미지 사용)

# requirements.txt 복사 및 의존성 설치
COPY ./requirements.txt /app/requirements.txt

# pip 캐시를 사용하지 않고 설치
RUN pip install --no-cache-dir -r /app/requirements.txt

# 소스 코드 복사
COPY ./app /app/app

# Uvicorn 서버를 실행할 포트 노출
EXPOSE 8000

CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT

# 컨테이너 실행 명령어는 docker-compose.yml에서 override됨
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
