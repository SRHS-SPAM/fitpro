import numpy as np
from typing import Tuple, List, Dict, Any

# MediaPipe Pose 랜드마크 인덱스
LANDMARKS = {
    "LEFT_SHOULDER": 11,
    "LEFT_ELBOW": 13,
    "LEFT_WRIST": 15,
    "RIGHT_SHOULDER": 12,
    "RIGHT_ELBOW": 14,
    "RIGHT_WRIST": 16,
    "LEFT_HIP": 23,
    "LEFT_KNEE": 25,
    "LEFT_ANKLE": 27,
    "RIGHT_HIP": 24,
    "RIGHT_KNEE": 26,
    "RIGHT_ANKLE": 28,
}

def calculate_angle(
    a: Tuple[float, float, float], 
    b: Tuple[float, float, float], 
    c: Tuple[float, float, float]
) -> float:
    """
    세 점(A, B, C)을 사용하여 B를 중심으로 하는 관절 각도를 계산합니다.
    """
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    vector_ba = a - b
    vector_bc = c - b

    dot_product = np.dot(vector_ba, vector_bc)
    magnitude_ba = np.linalg.norm(vector_ba)
    magnitude_bc = np.linalg.norm(vector_bc)

    if magnitude_ba == 0 or magnitude_bc == 0:
        return 0.0

    cosine_angle = dot_product / (magnitude_ba * magnitude_bc)
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
    
    angle_rad = np.arccos(cosine_angle)
    angle_deg = np.degrees(angle_rad)

    return float(angle_deg)


def get_landmark_coords(landmarks: List[Dict[str, float]], joint_name: str) -> Tuple[float, float, float]:
    """
    MediaPipe 랜드마크 리스트에서 특정 관절의 3D 좌표를 추출합니다.
    """
    idx = LANDMARKS.get(joint_name)
    if idx is None or idx >= len(landmarks):
        raise ValueError(f"Invalid joint name or index for {joint_name}")
    
    landmark_data = landmarks[idx]
    return (landmark_data['x'], landmark_data['y'], landmark_data['z'])


def analyze_pose(landmarks: List[Dict[str, float]]) -> Dict[str, float]:
    """
    주요 관절의 각도를 계산하여 딕셔너리 형태로 반환합니다.
    """
    if not landmarks or len(landmarks) < 33:
        return {}

    angles = {}
    
    try:
        shoulder_l = get_landmark_coords(landmarks, "LEFT_SHOULDER")
        elbow_l = get_landmark_coords(landmarks, "LEFT_ELBOW")
        wrist_l = get_landmark_coords(landmarks, "LEFT_WRIST")
        angles['left_elbow_angle'] = calculate_angle(shoulder_l, elbow_l, wrist_l)
        
        shoulder_r = get_landmark_coords(landmarks, "RIGHT_SHOULDER")
        elbow_r = get_landmark_coords(landmarks, "RIGHT_ELBOW")
        wrist_r = get_landmark_coords(landmarks, "RIGHT_WRIST")
        angles['right_elbow_angle'] = calculate_angle(shoulder_r, elbow_r, wrist_r)
    except Exception as e:
        print(f"Error calculating elbow angle: {e}")
        
    try:
        hip_l = get_landmark_coords(landmarks, "LEFT_HIP")
        knee_l = get_landmark_coords(landmarks, "LEFT_KNEE")
        ankle_l = get_landmark_coords(landmarks, "LEFT_ANKLE")
        angles['left_knee_angle'] = calculate_angle(hip_l, knee_l, ankle_l)
        
        hip_r = get_landmark_coords(landmarks, "RIGHT_HIP")
        knee_r = get_landmark_coords(landmarks, "RIGHT_KNEE")
        ankle_r = get_landmark_coords(landmarks, "RIGHT_ANKLE")
        angles['right_knee_angle'] = calculate_angle(hip_r, knee_r, ankle_r)
    except Exception as e:
        print(f"Error calculating knee angle: {e}")
    
    return angles

# 예시 사용 (테스트용)
# landmark_mock = [{'x': 0, 'y': 0, 'z': 0}] * 33 
# analyzed_data = analyze_pose(landmark_mock)

# 기존 코드는 그대로 두고, 맨 아래에 추가

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
    """
    dx = point2["x"] - point1["x"]
    dy = point2["y"] - point1["y"]
    
    distance = np.sqrt(dx**2 + dy**2)
    return distance


def calculate_distance_3d(point1: Dict, point2: Dict) -> float:
    """
    두 점 사이의 3D 거리 계산
    """
    dx = point2["x"] - point1["x"]
    dy = point2["y"] - point1["y"]
    dz = point2["z"] - point1["z"]
    
    distance = np.sqrt(dx**2 + dy**2 + dz**2)
    return distance
