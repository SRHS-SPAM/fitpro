import numpy as np
from typing import Dict, List, Any
from openai import AsyncOpenAI

from ..config import settings
from ..utils.pose_calculator import (
    calculate_angle,
    get_landmark_coords,
)


# OpenAI 클라이언트 초기화
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def analyze_pose(
    pose_landmarks: List[Dict],
    exercise_data: Dict,
    timestamp_ms: int
) -> Dict[str, Any]:
    """
    실시간 자세 분석 및 피드백 생성
    
    Args:
        pose_landmarks: MediaPipe에서 추출한 33개 랜드마크
        exercise_data: 운동 정보 (애니메이션, 기준 각도 등)
        timestamp_ms: 현재 타임스탬프 (밀리초)
    
    Returns:
        분석 결과 및 피드백
    """
    
    # 1. 현재 타임스탬프에 맞는 기준 자세 찾기
    reference_pose = get_reference_pose_at_timestamp(
        exercise_data.get("silhouette_animation", {}),
        timestamp_ms
    )
    
    if not reference_pose:
        return {
            "is_correct": True,
            "score": 100,
            "feedback": "운동을 진행해주세요",
            "critical_error": False,
            "angle_errors": {}
        }
    
    # 2. 주요 관절 각도 계산
    current_angles = calculate_key_angles(pose_landmarks)
    reference_angles = calculate_key_angles(reference_pose)
    
    # 3. 각도 오차 계산
    angle_errors = calculate_angle_errors(current_angles, reference_angles)
    
    # 4. 점수 계산 (0-100)
    score = calculate_pose_score(angle_errors)
    
    # 5. 자세 정확도 판단
    is_correct = score >= 70
    critical_error = score < 50
    
    # 6. 피드백 생성
    if critical_error or not is_correct:
        # 오차가 큰 경우 AI 피드백 생성
        feedback = await generate_ai_feedback(
            angle_errors=angle_errors,
            current_angles=current_angles,
            reference_angles=reference_angles,
            exercise_name=exercise_data.get("name", "운동")
        )
    else:
        # 오차가 작으면 기본 메시지
        feedback = "좋습니다! 자세를 유지하세요."
    
    return {
        "is_correct": is_correct,
        "score": score,
        "feedback": feedback,
        "critical_error": critical_error,
        "angle_errors": format_angle_errors(angle_errors)
    }


def get_reference_pose_at_timestamp(animation: Dict, timestamp_ms: int) -> List[Dict]:
    """
    특정 타임스탬프에 해당하는 기준 자세 반환 (보간 처리)
    """
    keyframes = animation.get("keyframes", [])
    
    if not keyframes:
        return None
    
    # 타임스탬프가 첫 프레임 이전이면 첫 프레임 반환
    if timestamp_ms <= keyframes[0]["timestamp_ms"]:
        return keyframes[0]["pose_landmarks"]
    
    # 타임스탬프가 마지막 프레임 이후면 마지막 프레임 반환
    if timestamp_ms >= keyframes[-1]["timestamp_ms"]:
        return keyframes[-1]["pose_landmarks"]
    
    # 두 키프레임 사이의 보간
    for i in range(len(keyframes) - 1):
        if keyframes[i]["timestamp_ms"] <= timestamp_ms <= keyframes[i + 1]["timestamp_ms"]:
            # 선형 보간
            t1 = keyframes[i]["timestamp_ms"]
            t2 = keyframes[i + 1]["timestamp_ms"]
            ratio = (timestamp_ms - t1) / (t2 - t1)
            
            pose1 = keyframes[i]["pose_landmarks"]
            pose2 = keyframes[i + 1]["pose_landmarks"]
            
            return interpolate_poses(pose1, pose2, ratio)
    
    return keyframes[0]["pose_landmarks"]


def interpolate_poses(pose1: List[Dict], pose2: List[Dict], ratio: float) -> List[Dict]:
    """
    두 자세 사이를 선형 보간
    """
    interpolated = []
    
    for i in range(len(pose1)):
        landmark = {
            "x": pose1[i]["x"] + (pose2[i]["x"] - pose1[i]["x"]) * ratio,
            "y": pose1[i]["y"] + (pose2[i]["y"] - pose1[i]["y"]) * ratio,
            "z": pose1[i]["z"] + (pose2[i]["z"] - pose1[i]["z"]) * ratio,
            "visibility": pose1[i]["visibility"]
        }
        interpolated.append(landmark)
    
    return interpolated


def calculate_key_angles(landmarks: List[Dict]) -> Dict[str, float]:
    """
    주요 관절 각도 계산
    
    MediaPipe Pose 랜드마크 인덱스:
    - 11, 12: 어깨 (왼쪽, 오른쪽)
    - 13, 14: 팔꿈치
    - 15, 16: 손목
    - 23, 24: 엉덩이
    - 25, 26: 무릎
    - 27, 28: 발목
    """
    angles = {}
    
    try:
        # 왼쪽 무릎 각도 (엉덩이-무릎-발목)
        angles["left_knee"] = calculate_angle(
            get_landmark_coords(landmarks, 23),  # 왼쪽 엉덩이
            get_landmark_coords(landmarks, 25),  # 왼쪽 무릎
            get_landmark_coords(landmarks, 27)   # 왼쪽 발목
        )
        
        # 오른쪽 무릎 각도
        angles["right_knee"] = calculate_angle(
            get_landmark_coords(landmarks, 24),
            get_landmark_coords(landmarks, 26),
            get_landmark_coords(landmarks, 28)
        )
        
        # 왼쪽 팔꿈치 각도 (어깨-팔꿈치-손목)
        angles["left_elbow"] = calculate_angle(
            get_landmark_coords(landmarks, 11),
            get_landmark_coords(landmarks, 13),
            get_landmark_coords(landmarks, 15)
        )
        
        # 오른쪽 팔꿈치 각도
        angles["right_elbow"] = calculate_angle(
            get_landmark_coords(landmarks, 12),
            get_landmark_coords(landmarks, 14),
            get_landmark_coords(landmarks, 16)
        )
        
        # 왼쪽 엉덩이 각도 (어깨-엉덩이-무릎)
        angles["left_hip"] = calculate_angle(
            get_landmark_coords(landmarks, 11),
            get_landmark_coords(landmarks, 23),
            get_landmark_coords(landmarks, 25)
        )
        
        # 오른쪽 엉덩이 각도
        angles["right_hip"] = calculate_angle(
            get_landmark_coords(landmarks, 12),
            get_landmark_coords(landmarks, 24),
            get_landmark_coords(landmarks, 26)
        )
        
    except Exception as e:
        print(f"각도 계산 오류: {e}")
    
    return angles


def calculate_angle_errors(current_angles: Dict, reference_angles: Dict) -> Dict[str, Dict]:
    """
    각 관절의 각도 오차 계산
    """
    errors = {}
    
    for joint in current_angles:
        if joint in reference_angles:
            current = current_angles[joint]
            target = reference_angles[joint]
            diff = abs(current - target)
            
            errors[joint] = {
                "current": round(current, 1),
                "target": round(target, 1),
                "diff": round(diff, 1)
            }
    
    return errors


def calculate_pose_score(angle_errors: Dict) -> int:
    """
    각도 오차 기반 점수 계산 (0-100)
    
    - 각도 차이 0-10도: 100점
    - 각도 차이 10-20도: 80점
    - 각도 차이 20-30도: 60점
    - 각도 차이 30도 이상: 40점 이하
    """
    if not angle_errors:
        return 100
    
    total_score = 0
    joint_count = 0
    
    for joint, error_info in angle_errors.items():
        diff = error_info["diff"]
        
        if diff <= 10:
            joint_score = 100
        elif diff <= 20:
            joint_score = 80
        elif diff <= 30:
            joint_score = 60
        else:
            joint_score = max(40 - (diff - 30), 0)
        
        total_score += joint_score
        joint_count += 1
    
    average_score = int(total_score / joint_count) if joint_count > 0 else 100
    return average_score


async def generate_ai_feedback(
    angle_errors: Dict,
    current_angles: Dict,
    reference_angles: Dict,
    exercise_name: str
) -> str:
    """
    OpenAI API로 맞춤 피드백 생성
    """
    # 가장 큰 오차를 보이는 관절 찾기
    max_error_joint = max(angle_errors.items(), key=lambda x: x[1]["diff"])[0] if angle_errors else None
    
    if not max_error_joint:
        return "자세를 조금 더 정확하게 유지해주세요."
    
    # 간단한 프롬프트 생성 (토큰 절약)
    prompt = f"""
운동: {exercise_name}
문제 관절: {translate_joint_name(max_error_joint)}
현재 각도: {angle_errors[max_error_joint]['current']}도
목표 각도: {angle_errors[max_error_joint]['target']}도

한 문장으로 간단하고 구체적인 교정 피드백을 작성해주세요.
예: "무릎을 조금 더 구부려주세요", "팔을 더 펴주세요"
"""
    
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "당신은 친절한 운동 코치입니다. 간단하고 구체적인 피드백을 한국어로 제공합니다."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=100
        )
        
        feedback = response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"AI 피드백 생성 오류: {e}")
        # API 실패 시 기본 피드백
        feedback = generate_fallback_feedback(max_error_joint, angle_errors[max_error_joint])
    
    return feedback


def generate_fallback_feedback(joint: str, error_info: Dict) -> str:
    """
    API 실패 시 기본 피드백 생성
    """
    joint_name = translate_joint_name(joint)
    current = error_info["current"]
    target = error_info["target"]
    
    if current > target:
        return f"{joint_name}을(를) 조금 더 구부려주세요."
    else:
        return f"{joint_name}을(를) 조금 더 펴주세요."


def translate_joint_name(joint: str) -> str:
    """
    관절 이름 한글 번역
    """
    translations = {
        "left_knee": "왼쪽 무릎",
        "right_knee": "오른쪽 무릎",
        "left_elbow": "왼쪽 팔꿈치",
        "right_elbow": "오른쪽 팔꿈치",
        "left_hip": "왼쪽 엉덩이",
        "right_hip": "오른쪽 엉덩이"
    }
    return translations.get(joint, joint)


def format_angle_errors(angle_errors: Dict) -> Dict:
    """
    클라이언트에 전달할 각도 오차 포맷팅
    """
    formatted = {}
    
    for joint, error_info in angle_errors.items():
        if error_info["diff"] > 10:  # 10도 이상 오차만 전달
            formatted[joint] = error_info
    
    return formatted