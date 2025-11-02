import json
from typing import Dict, List, Any
from openai import AsyncOpenAI
from bson import ObjectId

from ..config import settings

from .. import settings

# OpenAI 클라이언트 초기화
client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY
    # proxies 파라미터 제거!
)


async def generate_personalized_exercise(
    user_body_condition: Dict,
    exercise_type: str,
    intensity: str,
    duration_minutes: int,
    db
) -> Dict[str, Any]:
    """
    사용자 신체 상태 기반 AI 맞춤 운동 생성
    
    Args:
        user_body_condition: 사용자 신체 상태 정보
        exercise_type: 운동 타입 (rehabilitation, strength, stretching)
        intensity: 강도 (low, medium, high)
        duration_minutes: 운동 시간 (분)
        db: MongoDB 데이터베이스 객체
    
    Returns:
        생성된 운동 데이터 (Dict)
    """
    
    # 1. 기본 템플릿 조회
    base_template = await get_base_template(db, exercise_type, user_body_condition)
    
    if not base_template:
        # 템플릿이 없으면 기본 스쿼트 사용
        base_template = await create_default_template()
    
    # 2. OpenAI API로 맞춤 운동 생성
    prompt = create_exercise_prompt(
        user_body_condition=user_body_condition,
        base_template=base_template,
        exercise_type=exercise_type,
        intensity=intensity,
        duration_minutes=duration_minutes
    )
    
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",  #이 모델이 젤 싼데 내가 돈내고 있다 이거 바꾸면 죽여버린다
            messages=[
                {
                    "role": "system",
                    "content": "당신은 전문 재활 운동 트레이너입니다. 사용자의 신체 상태에 맞는 안전하고 효과적인 운동을 JSON 형식으로 생성합니다."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=2000
        )
        
        exercise_data = json.loads(response.choices[0].message.content)
        
    except Exception as e:
        print(f"OpenAI API 오류: {e}")
        # API 실패 시 기본 운동 반환
        exercise_data = create_fallback_exercise(base_template, intensity, duration_minutes)
    
    # 3. 애니메이션 파라미터 조정
    customized_animation = customize_animation(
        base_animation=base_template.get("base_animation", {}),
        intensity=intensity,
        user_limitations=user_body_condition.get("limitations", [])
    )
    
    # 4. 최종 운동 데이터 구성
    final_exercise = {
        "base_template_id": base_template.get("_id"),
        "name": exercise_data.get("name", "맞춤 재활 운동"),
        "description": exercise_data.get("description", "사용자 신체 상태에 맞춘 운동입니다."),
        "instructions": exercise_data.get("instructions", ["준비 자세를 취하세요", "천천히 동작을 수행하세요"]),
        "duration_seconds": duration_minutes * 60,
        "repetitions": exercise_data.get("repetitions", 10),
        "sets": exercise_data.get("sets", 3),
        "target_parts": exercise_data.get("target_parts", ["전신"]),
        "safety_warnings": exercise_data.get("safety_warnings", ["통증이 느껴지면 즉시 중단하세요"]),
        "silhouette_animation": customized_animation,
        "customization_params": {
            "speed_multiplier": get_speed_multiplier(intensity),
            "rom_adjustment": get_rom_adjustment(user_body_condition),
            "hold_time_ms": get_hold_time(intensity),
            "intensity": intensity
        }
    }
    
    return final_exercise


async def get_base_template(db, exercise_type: str, user_body_condition: Dict) -> Dict:
    """
    DB에서 적합한 기본 템플릿 조회
    """
    # 금기 사항 체크
    injured_parts = user_body_condition.get("injured_parts", [])
    
    query = {
        "category": exercise_type,
        "contraindications": {"$not": {"$in": injured_parts}} if injured_parts else {}
    }
    
    template = await db.exercise_templates.find_one(query)
    return template


async def create_default_template() -> Dict:
    """
    기본 스쿼트 템플릿 생성 (템플릿이 없을 경우)
    """
    return {
        "_id": None,
        "name": "기본 스쿼트",
        "category": "rehabilitation",
        "target_parts": ["무릎", "허벅지", "엉덩이"],
        "contraindications": [],
        "base_animation": {
            "fps": 30,
            "keyframes": [
                {
                    "frame_number": 0,
                    "timestamp_ms": 0,
                    "pose_landmarks": generate_standing_pose(),
                    "description": "시작 자세"
                },
                {
                    "frame_number": 60,
                    "timestamp_ms": 2000,
                    "pose_landmarks": generate_squat_pose(),
                    "description": "무릎 90도 굽힘"
                },
                {
                    "frame_number": 120,
                    "timestamp_ms": 4000,
                    "pose_landmarks": generate_standing_pose(),
                    "description": "원위치"
                }
            ]
        },
        "reference_angles": {
            "left_knee_min": 160,
            "left_knee_max": 90,
            "right_knee_min": 160,
            "right_knee_max": 90
        }
    }


def create_exercise_prompt(
    user_body_condition: Dict,
    base_template: Dict,
    exercise_type: str,
    intensity: str,
    duration_minutes: int
) -> str:
    """
    OpenAI API용 프롬프트 생성
    """
    injured_parts = user_body_condition.get("injured_parts", [])
    pain_level = user_body_condition.get("pain_level", 0)
    limitations = user_body_condition.get("limitations", [])
    
    prompt = f"""
다음 정보를 바탕으로 맞춤 재활 운동을 JSON 형식으로 생성해주세요:

**사용자 정보:**
- 부상 부위: {', '.join(injured_parts) if injured_parts else '없음'}
- 통증 수준: {pain_level}/10
- 제한 사항: {', '.join(limitations) if limitations else '없음'}

**운동 요구사항:**
- 운동 타입: {exercise_type}
- 강도: {intensity}
- 목표 시간: {duration_minutes}분
- 기본 템플릿: {base_template.get('name', '기본 운동')}

**생성할 JSON 형식:**
{{
  "name": "운동 이름 (예: 무릎 보호 스쿼트)",
  "description": "운동 설명 (1-2문장)",
  "instructions": [
    "1단계: 구체적인 동작 설명",
    "2단계: 구체적인 동작 설명",
    "3단계: 구체적인 동작 설명"
  ],
  "repetitions": 10,
  "sets": 3,
  "target_parts": ["타겟 부위1", "타겟 부위2"],
  "safety_warnings": [
    "주의사항1",
    "주의사항2"
  ]
}}

**중요 지침:**
1. 사용자의 부상 부위를 피하거나 보호하는 동작으로 구성
2. 통증 수준이 높으면 강도를 낮추고 가동 범위를 줄임
3. 안전 경고는 구체적이고 실용적으로 작성
4. 모든 텍스트는 한국어로 작성
5. repetitions와 sets는 강도에 맞게 조정 (low: 8-10회, medium: 10-12회, high: 12-15회)
"""
    
    return prompt


def create_fallback_exercise(base_template: Dict, intensity: str, duration_minutes: int) -> Dict:
    """
    API 실패 시 기본 운동 생성
    """
    reps_map = {"low": 8, "medium": 10, "high": 12}
    
    return {
        "name": f"{base_template.get('name', '기본 운동')} (맞춤)",
        "description": "신체 상태에 맞춘 안전한 운동입니다.",
        "instructions": [
            "바른 자세로 서서 시작하세요",
            "천천히 동작을 수행하세요",
            "호흡을 규칙적으로 유지하세요",
            "통증이 느껴지면 즉시 멈추세요"
        ],
        "repetitions": reps_map.get(intensity, 10),
        "sets": 3,
        "target_parts": base_template.get("target_parts", ["전신"]),
        "safety_warnings": [
            "통증이 느껴지면 즉시 중단하세요",
            "무리하지 마세요"
        ]
    }


def customize_animation(base_animation: Dict, intensity: str, user_limitations: List[str]) -> Dict:
    """
    사용자 상태에 맞게 애니메이션 커스터마이징
    """
    if not base_animation or "keyframes" not in base_animation:
        return {
            "keyframes": [
                {
                    "timestamp_ms": 0,
                    "pose_landmarks": generate_standing_pose(),
                    "description": "시작"
                }
            ]
        }
    
    # 속도 조정
    speed_multiplier = get_speed_multiplier(intensity)
    customized_keyframes = []
    
    for keyframe in base_animation.get("keyframes", []):
        customized_keyframe = {
            "timestamp_ms": int(keyframe.get("timestamp_ms", 0) / speed_multiplier),
            "pose_landmarks": adjust_pose_rom(
                keyframe.get("pose_landmarks", []),
                user_limitations
            ),
            "description": keyframe.get("description", "")
        }
        customized_keyframes.append(customized_keyframe)
    
    return {"keyframes": customized_keyframes}


def get_speed_multiplier(intensity: str) -> float:
    """
    강도에 따른 속도 배율 반환
    """
    speed_map = {
        "low": 1.5,      # 느리게
        "medium": 1.0,   # 보통
        "high": 0.7      # 빠르게
    }
    return speed_map.get(intensity, 1.0)


def get_rom_adjustment(user_body_condition: Dict) -> Dict:
    """
    가동 범위(Range of Motion) 조정 파라미터
    """
    pain_level = user_body_condition.get("pain_level", 0)
    
    if pain_level >= 7:
        return {"reduction_percent": 40}
    elif pain_level >= 4:
        return {"reduction_percent": 20}
    else:
        return {"reduction_percent": 0}


def get_hold_time(intensity: str) -> int:
    """
    동작 유지 시간 (밀리초)
    """
    hold_map = {
        "low": 2000,
        "medium": 1000,
        "high": 500
    }
    return hold_map.get(intensity, 1000)


def adjust_pose_rom(pose_landmarks: List[Dict], user_limitations: List[str]) -> List[Dict]:
    """
    사용자 제한 사항에 맞게 자세 가동 범위 조정
    """
    # 실제로는 각 landmark의 좌표를 조정해야 하지만,
    # 여기서는 그대로 반환 (프론트엔드에서 시각적 조정 가능)
    return pose_landmarks


def generate_standing_pose() -> List[Dict]:
    """
    기본 서있는 자세 랜드마크 생성 (33개)
    """
    # MediaPipe Pose 33개 랜드마크의 기본 서있는 자세
    # 실제로는 정확한 3D 좌표가 필요하지만, 여기서는 간단한 예시
    landmarks = []
    for i in range(33):
        landmarks.append({
            "x": 0.5,
            "y": 0.3 + (i * 0.02),
            "z": -0.1,
            "visibility": 0.99
        })
    return landmarks


def generate_squat_pose() -> List[Dict]:
    """
    스쿼트 자세 랜드마크 생성 (33개)
    """
    landmarks = []
    for i in range(33):
        # 스쿼트 시 무릎과 엉덩이가 구부러진 자세
        y_offset = 0.5 + (i * 0.015) if i > 23 else 0.3 + (i * 0.02)
        landmarks.append({
            "x": 0.5,
            "y": y_offset,
            "z": -0.1,
            "visibility": 0.99
        })
    return landmarks