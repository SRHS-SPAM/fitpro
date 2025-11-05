import json
from typing import Dict, List, Any
from openai import AsyncOpenAI
from bson import ObjectId

from ..config import settings

# OpenAI 클라이언트 초기화
client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY
)

# --- 기존 단일 운동 생성 함수 (변경 없음) ---
async def generate_personalized_exercise(
    user_body_condition: Dict,
    exercise_type: str,
    intensity: str,
    duration_minutes: int,
    db
) -> Dict[str, Any]:
    """
    사용자 신체 상태 기반 AI 맞춤 운동 생성 (단일)
    """
    base_template = await get_base_template(db, exercise_type, user_body_condition)
    if not base_template:
        base_template = await create_default_template()

    prompt = create_exercise_prompt(
        user_body_condition=user_body_condition,
        base_template=base_template,
        exercise_type=exercise_type,
        intensity=intensity,
        duration_minutes=duration_minutes
    )

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini", # 모델 변경 안 했음. 약속 지킴.
            messages=[
                {"role": "system", "content": "당신은 전문 재활 운동 트레이너입니다. 사용자의 신체 상태에 맞는 안전하고 효과적인 운동 1개를 JSON 형식으로 생성합니다."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=2000
        )
        exercise_data = json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"OpenAI API 오류 (단일 생성): {e}")
        exercise_data = create_fallback_exercise(base_template, intensity, duration_minutes)

    customized_animation = customize_animation(
        base_animation=base_template.get("base_animation", {}),
        intensity=intensity,
        user_limitations=user_body_condition.get("limitations", [])
    )

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
            "intensity": intensity,
            "speed_multiplier": get_speed_multiplier(intensity),
            "rom_adjustment": get_rom_adjustment(user_body_condition),
            "hold_time_ms": get_hold_time(intensity)
        }
    }
    return final_exercise

# --- 추가된 부분 시작 ---

def create_recommendations_prompt(user_body_condition: Dict) -> str:
    """
    OpenAI API용 프롬프트 생성 (여러 운동 추천용)
    """
    injured_parts = user_body_condition.get("injured_parts", [])
    pain_level = user_body_condition.get("pain_level", 0)
    limitations = user_body_condition.get("limitations", [])

    prompt = f"""
다음 사용자 정보를 바탕으로, 맞춤 재활 운동 **3가지**를 추천해주세요.
응답은 반드시 'recommendations'라는 키를 가진 단일 JSON 객체여야 하며, 각 추천 운동은 리스트의 요소로 포함되어야 합니다.

**사용자 정보:**
- 부상 부위: {', '.join(injured_parts) if injured_parts else '없음'}
- 통증 수준 (0-10): {pain_level}
- 움직임 제한 사항: {', '.join(limitations) if limitations else '없음'}

**생성할 JSON 형식:**
{{
  "recommendations": [
    {{
      "name": "추천 운동 1 이름 (예: 벽 대고 천천히 스쿼트)",
      "description": "이 운동이 왜 사용자에게 좋은지에 대한 간단한 설명 (1-2 문장)",
      "duration_minutes": 10,
      "intensity": "low",
      "sets": 3,
      "repetitions": 8,
      "recommendation_reason": "사용자의 '{", ".join(injured_parts) if injured_parts else "몸"}' 상태를 고려했을 때, 이 운동은 [구체적인 이유] 때문에 추천합니다."
    }},
    {{
      "name": "추천 운동 2 이름 (예: 의자에 앉아 다리 뻗기)",
      "description": "...",
      "duration_minutes": 15,
      "intensity": "low",
      "sets": 3,
      "repetitions": 12,
      "recommendation_reason": "..."
    }},
    {{
      "name": "추천 운동 3 이름 (예: 폼롤러 햄스트링 스트레칭)",
      "description": "...",
      "duration_minutes": 5,
      "intensity": "stretching",
      "sets": 2,
      "repetitions": 1,
      "recommendation_reason": "..."
    }}
  ]
}}

**중요 지침:**
1.  **3개의 운동**을 반드시 생성해야 합니다.
2.  운동 강도(intensity)는 'low', 'medium', 'high', 'stretching' 중에서 선택하세요.
3.  `recommendation_reason`은 사용자 정보와 운동을 연결하여 매우 구체적이고 설득력 있게 작성해주세요.
4.  모든 텍스트는 한국어로 작성해주세요.
"""
    return prompt

async def generate_exercise_recommendations(user_body_condition: Dict) -> List[Dict[str, Any]]:
    """
    AI를 사용하여 사용자에게 여러 맞춤 운동을 추천합니다.
    """
    if not user_body_condition:
        return []

    prompt = create_recommendations_prompt(user_body_condition)

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini", # 약속대로 절대 안 바꿨습니다.
            messages=[
                {"role": "system", "content": "당신은 사용자의 데이터를 분석하여 맞춤 운동 여러 개를 추천하는 최고의 재활 전문가입니다. 응답은 반드시 지정된 JSON 형식의 리스트로 제공해야 합니다."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.8,
            max_tokens=3000
        )
        
        content = response.choices[0].message.content
        # OpenAI가 가끔 불필요한 마크다운을 추가하는 경우가 있어 제거
        if content.strip().startswith("```json"):
            content = content.strip()[7:-3]
            
        result = json.loads(content)
        return result.get("recommendations", [])

    except Exception as e:
        print(f"OpenAI API 오류 (다중 추천): {e}")
        return [] # 오류 발생 시 빈 리스트 반환

# --- 추가된 부분 끝 ---


# --- 아래는 기존 헬퍼 함수들 (변경 없음) ---
async def get_base_template(db, exercise_type: str, user_body_condition: Dict) -> Dict:
    injured_parts = user_body_condition.get("injured_parts", [])
    query = {
        "category": exercise_type,
        "contraindications": {"$not": {"$in": injured_parts}} if injured_parts else {}
    }
    return await db.exercise_templates.find_one(query)

async def create_default_template() -> Dict:
    return {
        "_id": None, "name": "기본 스쿼트", "category": "rehabilitation",
        "target_parts": ["무릎", "허벅지", "엉덩이"], "contraindications": [],
        "base_animation": { "fps": 30, "keyframes": [
                {"frame_number": 0, "timestamp_ms": 0, "pose_landmarks": generate_standing_pose(), "description": "시작 자세"},
                {"frame_number": 60, "timestamp_ms": 2000, "pose_landmarks": generate_squat_pose(), "description": "무릎 90도 굽힘"},
                {"frame_number": 120, "timestamp_ms": 4000, "pose_landmarks": generate_standing_pose(), "description": "원위치"}
            ]},
        "reference_angles": {"left_knee_min": 160, "left_knee_max": 90, "right_knee_min": 160, "right_knee_max": 90}
    }

def create_exercise_prompt(user_body_condition: Dict, base_template: Dict, exercise_type: str, intensity: str, duration_minutes: int) -> str:
    injured_parts = user_body_condition.get("injured_parts", [])
    pain_level = user_body_condition.get("pain_level", 0)
    limitations = user_body_condition.get("limitations", [])
    return f"""
다음 정보를 바탕으로 맞춤 재활 운동을 JSON 형식으로 생성해주세요:
**사용자 정보:** - 부상 부위: {', '.join(injured_parts) if injured_parts else '없음'} - 통증 수준: {pain_level}/10 - 제한 사항: {', '.join(limitations) if limitations else '없음'}
**운동 요구사항:** - 운동 타입: {exercise_type} - 강도: {intensity} - 목표 시간: {duration_minutes}분 - 기본 템플릿: {base_template.get('name', '기본 운동')}
**생성할 JSON 형식:**
{{
  "name": "운동 이름 (예: 무릎 보호 스쿼트)", "description": "운동 설명 (1-2문장)",
  "instructions": ["1단계: 구체적인 동작 설명", "2단계: 구체적인 동작 설명", "3단계: 구체적인 동작 설명"],
  "repetitions": 10, "sets": 3, "target_parts": ["타겟 부위1", "타겟 부위2"],
  "safety_warnings": ["주의사항1", "주의사항2"]
}}
**중요 지침:**
1. 사용자의 부상 부위를 피하거나 보호하는 동작으로 구성
2. 통증 수준이 높으면 강도를 낮추고 가동 범위를 줄임
3. 안전 경고는 구체적이고 실용적으로 작성
4. 모든 텍스트는 한국어로 작성
5. repetitions와 sets는 강도에 맞게 조정 (low: 8-10회, medium: 10-12회, high: 12-15회)
"""

def create_fallback_exercise(base_template: Dict, intensity: str, duration_minutes: int) -> Dict:
    reps_map = {"low": 8, "medium": 10, "high": 12}
    return {
        "name": f"{base_template.get('name', '기본 운동')} (맞춤)", "description": "신체 상태에 맞춘 안전한 운동입니다.",
        "instructions": ["바른 자세로 서서 시작하세요", "천천히 동작을 수행하세요", "호흡을 규칙적으로 유지하세요", "통증이 느껴지면 즉시 멈추세요"],
        "repetitions": reps_map.get(intensity, 10), "sets": 3, "target_parts": base_template.get("target_parts", ["전신"]),
        "safety_warnings": ["통증이 느껴지면 즉시 중단하세요", "무리하지 마세요"]
    }

def customize_animation(base_animation: Dict, intensity: str, user_limitations: List[str]) -> Dict:
    if not base_animation or "keyframes" not in base_animation:
        return {"keyframes": [{"timestamp_ms": 0, "pose_landmarks": generate_standing_pose(), "description": "시작"}]}
    speed_multiplier = get_speed_multiplier(intensity)
    customized_keyframes = []
    for keyframe in base_animation.get("keyframes", []):
        customized_keyframe = {"timestamp_ms": int(keyframe.get("timestamp_ms", 0) / speed_multiplier),
                               "pose_landmarks": adjust_pose_rom(keyframe.get("pose_landmarks", []), user_limitations),
                               "description": keyframe.get("description", "")}
        customized_keyframes.append(customized_keyframe)
    return {"keyframes": customized_keyframes}

def get_speed_multiplier(intensity: str) -> float:
    return {"low": 1.5, "medium": 1.0, "high": 0.7}.get(intensity, 1.0)

def get_rom_adjustment(user_body_condition: Dict) -> Dict:
    pain_level = user_body_condition.get("pain_level", 0)
    if pain_level >= 7: return {"reduction_percent": 40}
    elif pain_level >= 4: return {"reduction_percent": 20}
    else: return {"reduction_percent": 0}

def get_hold_time(intensity: str) -> int:
    return {"low": 2000, "medium": 1000, "high": 500}.get(intensity, 1000)

def adjust_pose_rom(pose_landmarks: List[Dict], user_limitations: List[str]) -> List[Dict]:
    return pose_landmarks

def generate_standing_pose() -> List[Dict]:
    return [{"x": 0.5, "y": 0.3 + (i * 0.02), "z": -0.1, "visibility": 0.99} for i in range(33)]

def generate_squat_pose() -> List[Dict]:
    return [{"x": 0.5, "y": 0.5 + (i * 0.015) if i > 23 else 0.3 + (i * 0.02), "z": -0.1, "visibility": 0.99} for i in range(33)]