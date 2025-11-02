import numpy as np
from typing import Tuple, List, Dict, Any

# MediaPipe Pose 랜드마크 인덱스 (필수적인 관절만 예시로 정의)
# 전체 랜드마크는 0부터 32까지입니다.
LANDMARKS = {
    # 어깨, 팔꿈치, 손목 (팔)
    "LEFT_SHOULDER": 11,
    "LEFT_ELBOW": 13,
    "LEFT_WRIST": 15,
    "RIGHT_SHOULDER": 12,
    "RIGHT_ELBOW": 14,
    "RIGHT_WRIST": 16,
    # 엉덩이, 무릎, 발목 (다리)
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
    A: 시작점, B: 중심점 (관절), C: 끝점
    
    Args:
        a, b, c: 3D 랜드마크 좌표 (x, y, z)
        
    Returns:
        중심점 B를 기준으로 한 각도 (0 ~ 180도)
    """
    a = np.array(a)  # A (시작점)
    b = np.array(b)  # B (관절)
    c = np.array(c)  # C (끝점)

    # 벡터 BA와 BC를 계산
    vector_ba = a - b
    vector_bc = c - b

    # 코사인 값 계산: cos(theta) = (A . B) / (|A| * |B|)
    dot_product = np.dot(vector_ba, vector_bc)
    magnitude_ba = np.linalg.norm(vector_ba)
    magnitude_bc = np.linalg.norm(vector_bc)

    # 0으로 나누는 것을 방지
    if magnitude_ba == 0 or magnitude_bc == 0:
        return 0.0

    cosine_angle = dot_product / (magnitude_ba * magnitude_bc)
    
    # cos 값은 -1 ~ 1 범위로 클램프 (부동 소수점 오차 방지)
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
    
    # 라디안에서 도로 변환
    angle_rad = np.arccos(cosine_angle)
    angle_deg = np.degrees(angle_rad)

    # 각도를 0도에서 180도 사이로 보정
    # MediaPipe의 3D 좌표는 뷰에 따라 각도가 180도를 넘지 않도록 보정해야 함
    # 이 함수는 기본적으로 내부 각도(0-180)를 반환합니다.
    return float(angle_deg)


def get_landmark_coords(landmarks: List[Dict[str, float]], joint_name: str) -> Tuple[float, float, float]:
    """
    MediaPipe 랜드마크 리스트에서 특정 관절의 3D 좌표를 추출합니다.
    Args:
        landmarks: 프론트엔드에서 받은 랜드마크 리스트 (x, y, z, visibility)
        joint_name: LANDMARKS 딕셔너리의 키 (예: "LEFT_ELBOW")
    """
    idx = LANDMARKS.get(joint_name)
    if idx is None or idx >= len(landmarks):
        # 유효하지 않은 관절 이름 또는 인덱스
        raise ValueError(f"Invalid joint name or index for {joint_name}")
    
    landmark_data = landmarks[idx]
    # x, y, z를 추출하여 반환
    return (landmark_data['x'], landmark_data['y'], landmark_data['z'])


def analyze_pose(landmarks: List[Dict[str, float]]) -> Dict[str, float]:
    """
    주요 관절의 각도를 계산하여 딕셔너리 형태로 반환합니다.
    
    Args:
        landmarks: MediaPipe 33개 랜드마크 (x, y, z, visibility 포함)
        
    Returns:
        { "left_elbow_angle": 120.5, "right_knee_angle": 90.1, ... }
    """
    if not landmarks or len(landmarks) < 33:
        # 랜드마크 데이터가 불완전한 경우
        return {}

    angles = {}
    
    # 1. 팔꿈치 각도 (예: 왼팔꿈치)
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
        
    # 2. 무릎 각도 (예: 왼무릎)
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

    # TODO: 어깨 각도, 엉덩이 각도 등 필요한 다른 관절 각도 추가
    
    return angles

# 예시 사용 (테스트용)
# landmark_mock = [{'x': 0, 'y': 0, 'z': 0}] * 33 
# analyzed_data = analyze_pose(landmark_mock)

def calculate_angle_error(current_angle: float, target_angle: float) -> float:
    """
    현재 각도와 목표 각도의 오차 계산 (절댓값)
    """
    return abs(current_angle - target_angle)
