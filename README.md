Fitner: AI 기반 맞춤 재활 운동 웹앱

이 프로젝트는 FastAPI 백엔드와 React 프론트엔드로 구성된 AI 기반 맞춤 재활 운동 웹 애플리케이션의 백엔드입니다.

1. 전제 조건

Docker 및 Docker Compose가 설치되어 있어야 합니다.

유효한 MongoDB Atlas 연결 URI 및 OpenAI API 키가 필요합니다.

2. 프로젝트 실행 방법

단계 1: 환경 변수 설정

.env.example 파일을 복사하여 .env 파일을 생성하고, 필수 변수를 수정합니다.

cp .env.example .env
# .env 파일을 열어 MONGODB_URI와 OPENAI_API_KEY를 설정하세요.


단계 2: Docker Compose를 사용한 빌드 및 실행

프로젝트 루트 디렉토리에서 다음 명령을 실행하여 백엔드 및 프론트엔드 (현재는 목업) 컨테이너를 빌드하고 실행합니다.

docker-compose up --build


단계 3: 서비스 접속

컨테이너가 성공적으로 실행되면 다음 주소로 접속할 수 있습니다.

Backend API (FastAPI): http://localhost:8000

API 문서 (Swagger UI): http://localhost:8000/docs

Frontend (React/Vite): http://localhost:5173 (프론트엔드 코드는 현재 제외되어 있음)

3. 백엔드 기술 스택

프레임워크: FastAPI (Python)

비동기 DB: Motor (MongoDB Async Driver)

AI: OpenAI GPT-4o-mini

배포: Docker