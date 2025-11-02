from datetime import datetime, timedelta
from typing import Dict, Optional  # ← Optional 추가!
from jose import JWTError, jwt
import numpy as np 
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..config import settings

security = HTTPBearer()

def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT Access Token 생성"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt

def decode_access_token(token: str) -> Dict:
    """
    JWT Access Token 디코딩 및 검증
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 인증 토큰입니다.",
            headers={"WWW-Authenticate": "Bearer"}
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict:
    """
    현재 로그인한 사용자 정보 추출 (Dependency)
    """
    token = credentials.credentials
    
    try:
        payload = decode_access_token(token)
        
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        
        if user_id is None or email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="인증 정보가 올바르지 않습니다.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        return {
            "user_id": user_id,
            "email": email
        }
    
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 토큰이 만료되었거나 유효하지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"}
        )


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




def get_landmark_coords(landmarks: list[Dict], index: int) -> np.ndarray:
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


def normalize_landmarks(landmarks: list[Dict]) -> list[Dict]:
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


def calculate_body_ratio(landmarks: list[Dict]) -> Dict[str, float]:
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


def check_visibility_threshold(landmarks: list[Dict], threshold: float = 0.5) -> list[int]:
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


def calculate_center_of_mass(landmarks: list[Dict]) -> Dict[str, float]:
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


def detect_pose_symmetry(landmarks: list[Dict]) -> float:
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
    previous_landmarks: list[Dict],
    current_landmarks: list[Dict],
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