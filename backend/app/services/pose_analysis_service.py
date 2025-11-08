import numpy as np
from typing import Dict, List, Any
from openai import AsyncOpenAI

from ..config import settings
from ..utils.pose_calculator import (
    calculate_angle,
    get_landmark_coords,
)


# OpenAI 클라이언트 초기화
client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY
)


async def analyze_pose(
    pose_landmarks: List[Dict],
    exercise_data: Dict,
    timestamp_ms: int
) -> Dict[str, Any]:
    """
    실시간 자세 분석 및 피드백 생성
    """
    
    # 1. 현재 타임스탬프에 맞는 기준 자세 찾기
    reference_pose = get_reference_pose_at_timestamp(
        exercise_data.get("silhouette_animation", {}),
        timestamp_ms
    )
    
    if not reference_pose:
        return {
            "is_correct": False,
            "score": 0,
            "feedback": "기준 자세를 불러올 수 없습니다",
            "critical_error": True,
            "angle_errors": {}
        }
    
    # ✅ 운동 이름 기반으로 분석할 관절 결정
    exercise_name = exercise_data.get("name", "")
    target_joints = determine_target_joints(exercise_name)
    
    # 2. 주요 관절 각도 계산 (운동별 타겟 관절만)
    current_angles = calculate_key_angles(pose_landmarks, target_joints)
    reference_angles = calculate_key_angles(reference_pose, target_joints)
    
    # ✅ 각도 계산 실패 체크
    if not current_angles or not reference_angles:
        return {
            "is_correct": False,
            "score": 0,
            "feedback": "자세를 인식할 수 없습니다",
            "critical_error": True,
            "angle_errors": {}
        }
    
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
            exercise_name=exercise_data.get("name", "운동"),
            target_joints=target_joints
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


# ✅ 새로운 함수: 운동 종류별 타겟 관절 결정
def determine_target_joints(exercise_name: str) -> List[str]:
    """
    운동 이름을 기반으로 분석할 관절 결정
    
    Returns:
        분석할 관절 리스트 (예: ["left_elbow", "right_elbow"])
    """
    exercise_name_lower = exercise_name.lower()
    
    # 손목 운동
    if "손목" in exercise_name_lower or "wrist" in exercise_name_lower:
        return ["left_elbow", "right_elbow", "left_shoulder", "right_shoulder"]
    
    # 발목 운동
    if "발목" in exercise_name_lower or "ankle" in exercise_name_lower:
        return ["left_knee", "right_knee", "left_ankle", "right_ankle"]
    
    # 어깨 운동
    if "어깨" in exercise_name_lower or "shoulder" in exercise_name_lower:
        return ["left_shoulder", "right_shoulder", "left_elbow", "right_elbow"]
    
    # 팔 운동
    if ("팔" in exercise_name_lower and "굽" not in exercise_name_lower) or "arm" in exercise_name_lower:
        return ["left_shoulder", "right_shoulder", "left_elbow", "right_elbow"]
    
    # 팔굽혀펴기 / 푸시업
    if "팔굽혀펴기" in exercise_name_lower or "푸시업" in exercise_name_lower or "pushup" in exercise_name_lower:
        return ["left_elbow", "right_elbow", "left_shoulder", "right_shoulder", "left_hip", "right_hip"]
    
    # 플랭크
    if "플랭크" in exercise_name_lower or "plank" in exercise_name_lower:
        return ["left_elbow", "right_elbow", "left_shoulder", "right_shoulder", "left_hip", "right_hip"]
    
    # 스쿼트
    if "스쿼트" in exercise_name_lower or "squat" in exercise_name_lower:
        return ["left_knee", "right_knee", "left_hip", "right_hip"]
    
    # 런지
    if "런지" in exercise_name_lower or "lunge" in exercise_name_lower:
        return ["left_knee", "right_knee", "left_hip", "right_hip", "left_ankle", "right_ankle"]
    
    # 레그 레이즈 / 다리 운동
    if "레그" in exercise_name_lower or "다리" in exercise_name_lower or "leg" in exercise_name_lower:
        return ["left_hip", "right_hip", "left_knee", "right_knee"]
    
    # 종아리 / 카프 레이즈
    if "종아리" in exercise_name_lower or "카프" in exercise_name_lower or "calf" in exercise_name_lower:
        return ["left_knee", "right_knee", "left_ankle", "right_ankle"]
    
    # 기본값: 전신 운동 (모든 관절)
    return ["left_knee", "right_knee", "left_elbow", "right_elbow", "left_hip", "right_hip"]


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


def calculate_key_angles(landmarks: List[Dict], target_joints: List[str] = None) -> Dict[str, float]:
    """
    주요 관절 각도 계산 (타겟 관절만)
    
    Args:
        landmarks: MediaPipe 랜드마크
        target_joints: 계산할 관절 리스트 (None이면 모든 관절)
    
    MediaPipe Pose 랜드마크 인덱스:
    - 11, 12: 어깨 (왼쪽, 오른쪽)
    - 13, 14: 팔꿈치
    - 15, 16: 손목
    - 23, 24: 엉덩이
    - 25, 26: 무릎
    - 27, 28: 발목
    """
    # 기본값: 모든 관절
    if target_joints is None:
        target_joints = ["left_knee", "right_knee", "left_elbow", "right_elbow", "left_hip", "right_hip"]
    
    angles = {}
    
    try:
        # 왼쪽 무릎 각도
        if "left_knee" in target_joints:
            angles["left_knee"] = calculate_angle(
                get_landmark_coords(landmarks, 23),  # 왼쪽 엉덩이
                get_landmark_coords(landmarks, 25),  # 왼쪽 무릎
                get_landmark_coords(landmarks, 27)   # 왼쪽 발목
            )
        
        # 오른쪽 무릎 각도
        if "right_knee" in target_joints:
            angles["right_knee"] = calculate_angle(
                get_landmark_coords(landmarks, 24),
                get_landmark_coords(landmarks, 26),
                get_landmark_coords(landmarks, 28)
            )
        
        # 왼쪽 팔꿈치 각도
        if "left_elbow" in target_joints:
            angles["left_elbow"] = calculate_angle(
                get_landmark_coords(landmarks, 11),
                get_landmark_coords(landmarks, 13),
                get_landmark_coords(landmarks, 15)
            )
        
        # 오른쪽 팔꿈치 각도
        if "right_elbow" in target_joints:
            angles["right_elbow"] = calculate_angle(
                get_landmark_coords(landmarks, 12),
                get_landmark_coords(landmarks, 14),
                get_landmark_coords(landmarks, 16)
            )
        
        # 왼쪽 엉덩이 각도
        if "left_hip" in target_joints:
            angles["left_hip"] = calculate_angle(
                get_landmark_coords(landmarks, 11),
                get_landmark_coords(landmarks, 23),
                get_landmark_coords(landmarks, 25)
            )
        
        # 오른쪽 엉덩이 각도
        if "right_hip" in target_joints:
            angles["right_hip"] = calculate_angle(
                get_landmark_coords(landmarks, 12),
                get_landmark_coords(landmarks, 24),
                get_landmark_coords(landmarks, 26)
            )
        
        # ✅ 왼쪽 어깨 각도 (팔꿈치-어깨-엉덩이)
        if "left_shoulder" in target_joints:
            angles["left_shoulder"] = calculate_angle(
                get_landmark_coords(landmarks, 13),  # 왼쪽 팔꿈치
                get_landmark_coords(landmarks, 11),  # 왼쪽 어깨
                get_landmark_coords(landmarks, 23)   # 왼쪽 엉덩이
            )
        
        # ✅ 오른쪽 어깨 각도
        if "right_shoulder" in target_joints:
            angles["right_shoulder"] = calculate_angle(
                get_landmark_coords(landmarks, 14),  # 오른쪽 팔꿈치
                get_landmark_coords(landmarks, 12),  # 오른쪽 어깨
                get_landmark_coords(landmarks, 24)   # 오른쪽 엉덩이
            )
        
        # ✅ 왼쪽 발목 각도 (무릎-발목-발끝)
        if "left_ankle" in target_joints:
            angles["left_ankle"] = calculate_angle(
                get_landmark_coords(landmarks, 25),  # 왼쪽 무릎
                get_landmark_coords(landmarks, 27),  # 왼쪽 발목
                get_landmark_coords(landmarks, 31)   # 왼쪽 발끝
            )
        
        # ✅ 오른쪽 발목 각도
        if "right_ankle" in target_joints:
            angles["right_ankle"] = calculate_angle(
                get_landmark_coords(landmarks, 26),  # 오른쪽 무릎
                get_landmark_coords(landmarks, 28),  # 오른쪽 발목
                get_landmark_coords(landmarks, 32)   # 오른쪽 발끝
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
    exercise_name: str,
    target_joints: List[str]
) -> str:
    """
    OpenAI API로 맞춤 피드백 생성 (타겟 관절 기반)
    """
    # ✅ 타겟 관절 중에서 가장 큰 오차를 보이는 관절 찾기
    relevant_errors = {k: v for k, v in angle_errors.items() if k in target_joints}
    
    if not relevant_errors:
        return "자세를 조금 더 정확하게 유지해주세요."
    
    max_error_joint = max(relevant_errors.items(), key=lambda x: x[1]["diff"])[0]
    
    # 간단한 프롬프트 생성 (토큰 절약)
    prompt = f"""
운동: {exercise_name}
문제 관절: {translate_joint_name(max_error_joint)}
현재 각도: {angle_errors[max_error_joint]['current']}도
목표 각도: {angle_errors[max_error_joint]['target']}도

한 문장으로 간단하고 구체적인 교정 피드백을 작성해주세요.
예: "손목을 조금 더 구부려주세요", "팔을 더 펴주세요"
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
    diff = error_info["diff"]
    
    # 차이가 너무 작으면 일반 메시지
    if diff < 5:
        return f"거의 완벽합니다! {joint_name} 자세를 유지하세요."
    
    if current > target:
        action = "구부려" if "무릎" in joint_name or "팔꿈치" in joint_name else "내려"
        return f"{joint_name}을(를) 조금 더 {action}주세요."
    else:
        action = "펴" if "무릎" in joint_name or "팔꿈치" in joint_name or "발목" in joint_name else "올려"
        return f"{joint_name}을(를) 조금 더 {action}주세요."


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
        "right_hip": "오른쪽 엉덩이",
        "left_shoulder": "왼쪽 어깨",
        "right_shoulder": "오른쪽 어깨",
        "left_ankle": "왼쪽 발목",
        "right_ankle": "오른쪽 발목",
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