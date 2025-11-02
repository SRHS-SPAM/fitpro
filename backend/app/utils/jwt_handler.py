import numpy as np
from typing import Dict, List, Tuple
import time
import jwt
from decouple import config
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# 환경 변수에서 Secret Key를 로드
JWT_SECRET = config("secret", default="your_strong_secret_key")
JWT_ALGORITHM = config("algorithm", default="HS256")

# OAuth2 스킴 설정 (토큰을 헤더에서 가져오기 위해 필요)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

# 엑세스 토큰 생성 함수 (auth.py가 요청하는 함수)
def create_access_token(user_id: str) -> str:
    """
    사용자 ID를 기반으로 JWT 엑세스 토큰을 생성합니다.
    """
    # 토큰 만료 시간 (예: 24시간)
    expire = time.time() + 60 * 60 * 24
    
    payload = {
        "user_id": user_id,
        "expires": expire,
        # 'iat' (issued at) 대신 'time.time()'을 사용했습니다.
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token

# 토큰 해독 및 유효성 검사 함수
def decode_access_token(token: str) -> dict:
    try:
        decoded_token = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        # 만료 시간 검사
        if decoded_token.get("expires") >= time.time():
            return decoded_token
        # 만료 시 예외 발생
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="토큰이 만료되었습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.exceptions.DecodeError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰입니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

# **auth.py가 요청하는 함수** (현재 사용자를 가져오는 의존성 함수)
# 이 함수는 데이터베이스에서 사용자 정보를 검색해야 합니다.
async def get_current_user(token: str = Depends(oauth2_scheme)): # db: Session = Depends(get_db)
    # 1. 토큰 해독 및 유효성 검사
    payload = decode_access_token(token)
    user_id = payload.get("user_id")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 정보를 찾을 수 없습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. (TODO: 실제 데이터베이스 연결 및 사용자 검색 로직)
    # 이 부분은 당신의 프로젝트 구조에 따라 달라집니다.
    # 현재는 오류 없이 서버를 실행하기 위해 임시 User 객체를 반환합니다.
    # user = db.query(models.User).filter(models.User.id == user_id).first()

    # if user is None:
    #     raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    # 임시 반환 (실제 구현 시 위 주석 코드를 사용해야 합니다)
    return {"id": user_id, "name": "Test User"} # 실제 User 객체/스키마를 반환해야 함


def calculate_angle(point1: np.ndarray, point2: np.ndarray, point3: np.ndarray) -> float:
    """
    세 점으로 이루어진 각도 계산 (point2가 꼭짓점)
    
    Args:
        point1: 첫 번째 점 [x, y, z]
        point2: 두 번째 점 (꼭짓점) [x, y, z]
        point3: 세 번째 점 [x, y, z]
    
    Returns:
        각도 (degree, 0-180)
    
    Example:
        무릎 각도 계산: calculate_angle(hip, knee, ankle)
    """
    # 벡터 계산
    vector1 = point1 - point2
    vector2 = point3 - point2
    
    # 벡터의 크기 계산
    magnitude1 = np.linalg.norm(vector1)
    magnitude2 = np.linalg.norm(vector2)
    
    # 영벡터 방지
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    
    # 내적을 이용한 코사인 값 계산
    cos_angle = np.dot(vector1, vector2) / (magnitude1 * magnitude2)
    
    # 부동소수점 오차 방지 (-1 <= cos_angle <= 1)
    cos_angle = np.clip(cos_angle, -1.0, 1.0)
    
    # 라디안을 도(degree)로 변환
    angle = np.arccos(cos_angle)
    angle_degrees = np.degrees(angle)
    
    return angle_degrees


def get_landmark_coords(landmarks: List[Dict], index: int) -> np.ndarray:
    """
    랜드마크 리스트에서 특정 인덱스의 3D 좌표 추출
    
    Args:
        landmarks: MediaPipe 랜드마크 리스트
        index: 랜드마크 인덱스 (0-32)
    
    Returns:
        numpy array [x, y, z]
    """
    if index < 0 or index >= len(landmarks):
        raise ValueError(f"잘못된 랜드마크 인덱스: {index}")
    
    landmark = landmarks[index]
    return np.array([
        landmark.get("x", 0.0),
        landmark.get("y", 0.0),
        landmark.get("z", 0.0)
    ])


def calculate_angle_error(current_angle: float, target_angle: float) -> float:
    """
    현재 각도와 목표 각도의 오차 계산
    
    Args:
        current_angle: 현재 각도
        target_angle: 목표 각도
    
    Returns:
        각도 오차 (절댓값)
    """
    return abs(current_angle - target_angle)


def calculate_distance_2d(point1: Dict, point2: Dict) -> float:
    """
    두 점 사이의 2D 거리 계산 (x, y 좌표만 사용)
    
    Args:
        point1: 첫 번째 점 {x, y, z, visibility}
        point2: 두 번째 점 {x, y, z, visibility}
    
    Returns:
        2D 유클리디안 거리
    """
    dx = point2["x"] - point1["x"]
    dy = point2["y"] - point1["y"]
    
    distance = np.sqrt(dx**2 + dy**2)
    return distance


def calculate_distance_3d(point1: Dict, point2: Dict) -> float:
    """
    두 점 사이의 3D 거리 계산
    
    Args:
        point1: 첫 번째 점 {x, y, z, visibility}
        point2: 두 번째 점 {x, y, z, visibility}
    
    Returns:
        3D 유클리디안 거리
    """
    dx = point2["x"] - point1["x"]
    dy = point2["y"] - point1["y"]
    dz = point2["z"] - point1["z"]
    
    distance = np.sqrt(dx**2 + dy**2 + dz**2)
    return distance


def normalize_landmarks(landmarks: List[Dict]) -> List[Dict]:
    """
    랜드마크 좌표 정규화 (중심점 기준, 스케일 조정)
    
    Args:
        landmarks: MediaPipe 랜드마크 리스트
    
    Returns:
        정규화된 랜드마크 리스트
    """
    if not landmarks:
        return landmarks
    
    # 모든 점의 좌표 추출
    coords = np.array([[lm["x"], lm["y"], lm["z"]] for lm in landmarks])
    
    # 중심점 계산
    center = np.mean(coords, axis=0)
    
    # 중심점 기준으로 이동
    centered_coords = coords - center
    
    # 스케일 계산 (최대 거리 기준)
    max_distance = np.max(np.linalg.norm(centered_coords, axis=1))
    
    if max_distance > 0:
        normalized_coords = centered_coords / max_distance
    else:
        normalized_coords = centered_coords
    
    # 정규화된 랜드마크 리스트 생성
    normalized_landmarks = []
    for i, lm in enumerate(landmarks):
        normalized_landmarks.append({
            "x": float(normalized_coords[i][0]),
            "y": float(normalized_coords[i][1]),
            "z": float(normalized_coords[i][2]),
            "visibility": lm.get("visibility", 1.0)
        })
    
    return normalized_landmarks


def calculate_body_ratio(landmarks: List[Dict]) -> Dict[str, float]:
    """
    신체 비율 계산 (어깨 너비, 다리 길이 등)
    
    Args:
        landmarks: MediaPipe 랜드마크 리스트
    
    Returns:
        신체 비율 정보
    """
    ratios = {}
    
    try:
        # 어깨 너비 (11: 왼쪽 어깨, 12: 오른쪽 어깨)
        left_shoulder = landmarks[11]
        right_shoulder = landmarks[12]
        ratios["shoulder_width"] = calculate_distance_2d(left_shoulder, right_shoulder)
        
        # 엉덩이 너비 (23: 왼쪽 엉덩이, 24: 오른쪽 엉덩이)
        left_hip = landmarks[23]
        right_hip = landmarks[24]
        ratios["hip_width"] = calculate_distance_2d(left_hip, right_hip)
        
        # 상체 길이 (어깨 중심 - 엉덩이 중심)
        shoulder_center_y = (left_shoulder["y"] + right_shoulder["y"]) / 2
        hip_center_y = (left_hip["y"] + right_hip["y"]) / 2
        ratios["torso_length"] = abs(hip_center_y - shoulder_center_y)
        
        # 왼쪽 다리 길이 (엉덩이 - 무릎 - 발목)
        left_knee = landmarks[25]
        left_ankle = landmarks[27]
        upper_leg = calculate_distance_2d(left_hip, left_knee)
        lower_leg = calculate_distance_2d(left_knee, left_ankle)
        ratios["left_leg_length"] = upper_leg + lower_leg
        
        # 오른쪽 다리 길이
        right_knee = landmarks[26]
        right_ankle = landmarks[28]
        upper_leg = calculate_distance_2d(right_hip, right_knee)
        lower_leg = calculate_distance_2d(right_knee, right_ankle)
        ratios["right_leg_length"] = upper_leg + lower_leg
        
    except (IndexError, KeyError) as e:
        print(f"신체 비율 계산 오류: {e}")
    
    return ratios


def check_visibility_threshold(landmarks: List[Dict], threshold: float = 0.5) -> List[int]:
    """
    가시성(visibility)이 낮은 랜드마크 인덱스 반환
    
    Args:
        landmarks: MediaPipe 랜드마크 리스트
        threshold: 가시성 임계값 (0.0-1.0)
    
    Returns:
        가시성이 낮은 랜드마크 인덱스 리스트
    """
    low_visibility_indices = []
    
    for i, lm in enumerate(landmarks):
        visibility = lm.get("visibility", 1.0)
        if visibility < threshold:
            low_visibility_indices.append(i)
    
    return low_visibility_indices


def calculate_center_of_mass(landmarks: List[Dict]) -> Dict[str, float]:
    """
    무게중심 계산 (주요 관절 기준)
    
    Args:
        landmarks: MediaPipe 랜드마크 리스트
    
    Returns:
        무게중심 좌표 {x, y, z}
    """
    # 주요 관절 인덱스 (어깨, 엉덩이, 무릎)
    key_joints = [11, 12, 23, 24, 25, 26]
    
    coords = []
    for idx in key_joints:
        if idx < len(landmarks):
            lm = landmarks[idx]
            coords.append([lm["x"], lm["y"], lm["z"]])
    
    if not coords:
        return {"x": 0.5, "y": 0.5, "z": 0.0}
    
    center = np.mean(coords, axis=0)
    
    return {
        "x": float(center[0]),
        "y": float(center[1]),
        "z": float(center[2])
    }


def detect_pose_symmetry(landmarks: List[Dict]) -> float:
    """
    좌우 대칭성 점수 계산 (0-100)
    
    Args:
        landmarks: MediaPipe 랜드마크 리스트
    
    Returns:
        대칭성 점수 (100에 가까울수록 대칭)
    """
    symmetry_scores = []
    
    # 대칭 관절 쌍 (왼쪽, 오른쪽)
    symmetric_pairs = [
        (11, 12),  # 어깨
        (13, 14),  # 팔꿈치
        (15, 16),  # 손목
        (23, 24),  # 엉덩이
        (25, 26),  # 무릎
        (27, 28)   # 발목
    ]
    
    for left_idx, right_idx in symmetric_pairs:
        if left_idx < len(landmarks) and right_idx < len(landmarks):
            left_point = landmarks[left_idx]
            right_point = landmarks[right_idx]
            
            # y, z 좌표의 차이 계산 (x는 좌우 반전이므로 제외)
            y_diff = abs(left_point["y"] - right_point["y"])
            z_diff = abs(left_point["z"] - right_point["z"])
            
            # 차이가 작을수록 높은 점수
            score = 100 - min(y_diff * 200 + z_diff * 200, 100)
            symmetry_scores.append(score)
    
    if not symmetry_scores:
        return 100.0
    
    return float(np.mean(symmetry_scores))


def calculate_joint_velocity(
    previous_landmarks: List[Dict],
    current_landmarks: List[Dict],
    time_delta_ms: float,
    joint_index: int
) -> float:
    """
    특정 관절의 속도 계산 (픽셀/초)
    
    Args:
        previous_landmarks: 이전 프레임 랜드마크
        current_landmarks: 현재 프레임 랜드마크
        time_delta_ms: 시간 차이 (밀리초)
        joint_index: 관절 인덱스
    
    Returns:
        속도 (단위: 픽셀/초)
    """
    if time_delta_ms <= 0:
        return 0.0
    
    if joint_index >= len(previous_landmarks) or joint_index >= len(current_landmarks):
        return 0.0
    
    prev_point = previous_landmarks[joint_index]
    curr_point = current_landmarks[joint_index]
    
    # 거리 계산
    distance = calculate_distance_2d(prev_point, curr_point)
    
    # 속도 = 거리 / 시간 (픽셀/초)
    time_delta_sec = time_delta_ms / 1000.0
    velocity = distance / time_delta_sec if time_delta_sec > 0 else 0.0
    
    return velocity