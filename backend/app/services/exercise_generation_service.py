import json
from typing import Dict, List, Any
from openai import AsyncOpenAI
from bson import ObjectId

from ..config import settings

# OpenAI 클라이언트 초기화
client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY
)

# --- 기존 단일 운동 생성 함수 (guide_poses 추가) ---
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
            model="gpt-4o-mini",
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

    # ✨ guide_poses 생성 추가
    guide_poses = generate_guide_poses(exercise_data.get("name", "기본 운동"))

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
        "guide_poses": guide_poses,
        "customization_params": {
            "intensity": intensity,
            "speed_multiplier": get_speed_multiplier(intensity),
            "rom_adjustment": get_rom_adjustment(user_body_condition),
            "hold_time_ms": get_hold_time(intensity)
        }
    }
    return final_exercise

# --- 추천 운동 생성 함수 (guide_poses 추가) ---

def create_recommendations_prompt(user_body_condition: Dict) -> str:
    injured_parts = user_body_condition.get("injured_parts", [])
    pain_level = user_body_condition.get("pain_level", 0)
    limitations = user_body_condition.get("limitations", [])

    return f"""
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

async def generate_exercise_recommendations(user_body_condition: Dict) -> List[Dict[str, Any]]:
    if not user_body_condition:
        return []

    prompt = create_recommendations_prompt(user_body_condition)

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "당신은 사용자의 데이터를 분석하여 맞춤 운동 여러 개를 추천하는 최고의 재활 전문가입니다. 응답은 반드시 지정된 JSON 형식의 리스트로 제공해야 합니다."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.8,
            max_tokens=3000
        )
        
        content = response.choices[0].message.content
        if content.strip().startswith("```json"):
            content = content.strip()[7:-3]
            
        result = json.loads(content)
        recommendations = result.get("recommendations", [])
        
        for rec in recommendations:
            rec["guide_poses"] = generate_guide_poses(rec.get("name", "기본 운동"))
        
        return recommendations

    except Exception as e:
        print(f"OpenAI API 오류 (다중 추천): {e}")
        return []


# ✨ ============ 가이드 포즈 생성 함수 (세밀한 관절 추가) ============

def generate_guide_poses(exercise_name: str) -> List[Dict[str, Dict[str, float]]]:
    """
    운동 이름 기반 가이드 포즈 생성 (손목, 발목까지 세밀하게)
    
    MediaPipe Pose 랜드마크:
    0: 코, 1-10: 얼굴
    11: 왼쪽 어깨, 12: 오른쪽 어깨
    13: 왼쪽 팔꿈치, 14: 오른쪽 팔꿈치
    15: 왼쪽 손목, 16: 오른쪽 손목
    17: 왼쪽 새끼손가락, 18: 오른쪽 새끼손가락
    19: 왼쪽 검지, 20: 오른쪽 검지
    21: 왼쪽 엄지, 22: 오른쪽 엄지
    23: 왼쪽 엉덩이, 24: 오른쪽 엉덩이
    25: 왼쪽 무릎, 26: 오른쪽 무릎
    27: 왼쪽 발목, 28: 오른쪽 발목
    29: 왼쪽 발뒤꿈치, 30: 오른쪽 발뒤꿈치
    31: 왼쪽 발끝, 32: 오른쪽 발끝
    """
    exercise_name_lower = exercise_name.lower()
    
    if "스쿼트" in exercise_name:
        return get_squat_guide_poses()
    elif "런지" in exercise_name:
        return get_lunge_guide_poses()
    elif "플랭크" in exercise_name:
        return get_plank_guide_poses()
    elif "팔굽혀펴기" in exercise_name or "푸시업" in exercise_name:
        return get_pushup_guide_poses()
    elif "레그" in exercise_name and "레이즈" in exercise_name:
        return get_leg_raise_guide_poses()
    elif "손목" in exercise_name:
        return get_wrist_guide_poses()
    elif "발목" in exercise_name:  # ✨ 추가
        return get_ankle_guide_poses()
    elif "어깨" in exercise_name:
        return get_shoulder_guide_poses()
    elif "팔" in exercise_name and ("벌리기" in exercise_name or "들기" in exercise_name):
        return get_arm_raise_guide_poses()
    elif "종아리" in exercise_name or "카프" in exercise_name:  # ✨ 추가
        return get_calf_raise_guide_poses()
    elif "스트레칭" in exercise_name or "스트레치" in exercise_name:
        return get_stretching_guide_poses()
    else:
        return get_default_guide_poses()
    
# ✨ 손목 운동 가이드 포즈 추가
def get_wrist_guide_poses() -> List[Dict[str, Dict[str, float]]]:
    """손목 돌리기/굽히기 가이드 포즈 (4개 프레임으로 회전 표현)"""
    return [
        # 프레임 1: 손목 중앙 (시작)
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.4, "y": 0.3},
            "12": {"x": 0.6, "y": 0.3},
            "13": {"x": 0.35, "y": 0.45},
            "14": {"x": 0.65, "y": 0.45},
            "15": {"x": 0.32, "y": 0.6},   # 손목
            "16": {"x": 0.68, "y": 0.6},
            "19": {"x": 0.3, "y": 0.65},   # 검지 - 위쪽
            "20": {"x": 0.7, "y": 0.65},
            "21": {"x": 0.28, "y": 0.63},  # 엄지
            "22": {"x": 0.72, "y": 0.63},
            "23": {"x": 0.42, "y": 0.6},
            "24": {"x": 0.58, "y": 0.6},
            "25": {"x": 0.4, "y": 0.8},
            "26": {"x": 0.6, "y": 0.8},
            "27": {"x": 0.38, "y": 0.95},
            "28": {"x": 0.62, "y": 0.95},
            "31": {"x": 0.36, "y": 0.98},
            "32": {"x": 0.64, "y": 0.98}
        },
        # 프레임 2: 손목 오른쪽으로
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.4, "y": 0.3},
            "12": {"x": 0.6, "y": 0.3},
            "13": {"x": 0.35, "y": 0.45},
            "14": {"x": 0.65, "y": 0.45},
            "15": {"x": 0.32, "y": 0.6},
            "16": {"x": 0.68, "y": 0.6},
            "19": {"x": 0.35, "y": 0.6},   # 검지 - 오른쪽
            "20": {"x": 0.73, "y": 0.6},
            "21": {"x": 0.3, "y": 0.58},
            "22": {"x": 0.7, "y": 0.58},
            "23": {"x": 0.42, "y": 0.6},
            "24": {"x": 0.58, "y": 0.6},
            "25": {"x": 0.4, "y": 0.8},
            "26": {"x": 0.6, "y": 0.8},
            "27": {"x": 0.38, "y": 0.95},
            "28": {"x": 0.62, "y": 0.95},
            "31": {"x": 0.36, "y": 0.98},
            "32": {"x": 0.64, "y": 0.98}
        },
        # 프레임 3: 손목 아래로
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.4, "y": 0.3},
            "12": {"x": 0.6, "y": 0.3},
            "13": {"x": 0.35, "y": 0.45},
            "14": {"x": 0.65, "y": 0.45},
            "15": {"x": 0.32, "y": 0.6},
            "16": {"x": 0.68, "y": 0.6},
            "19": {"x": 0.3, "y": 0.55},   # 검지 - 아래쪽
            "20": {"x": 0.7, "y": 0.55},
            "21": {"x": 0.28, "y": 0.57},
            "22": {"x": 0.72, "y": 0.57},
            "23": {"x": 0.42, "y": 0.6},
            "24": {"x": 0.58, "y": 0.6},
            "25": {"x": 0.4, "y": 0.8},
            "26": {"x": 0.6, "y": 0.8},
            "27": {"x": 0.38, "y": 0.95},
            "28": {"x": 0.62, "y": 0.95},
            "31": {"x": 0.36, "y": 0.98},
            "32": {"x": 0.64, "y": 0.98}
        },
        # 프레임 4: 손목 왼쪽으로
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.4, "y": 0.3},
            "12": {"x": 0.6, "y": 0.3},
            "13": {"x": 0.35, "y": 0.45},
            "14": {"x": 0.65, "y": 0.45},
            "15": {"x": 0.32, "y": 0.6},
            "16": {"x": 0.68, "y": 0.6},
            "19": {"x": 0.27, "y": 0.6},   # 검지 - 왼쪽
            "20": {"x": 0.65, "y": 0.6},
            "21": {"x": 0.3, "y": 0.62},
            "22": {"x": 0.68, "y": 0.62},
            "23": {"x": 0.42, "y": 0.6},
            "24": {"x": 0.58, "y": 0.6},
            "25": {"x": 0.4, "y": 0.8},
            "26": {"x": 0.6, "y": 0.8},
            "27": {"x": 0.38, "y": 0.95},
            "28": {"x": 0.62, "y": 0.95},
            "31": {"x": 0.36, "y": 0.98},
            "32": {"x": 0.64, "y": 0.98}
        }
    ]
    
# ✨ 어깨 운동 가이드 포즈 추가
def get_shoulder_guide_poses() -> List[Dict[str, Dict[str, float]]]:
    """어깨 돌리기/으쓱하기 가이드 포즈"""
    return [
        # 프레임 1: 어깨 내림
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.4, "y": 0.35},   # 어깨 낮게
            "12": {"x": 0.6, "y": 0.35},
            "13": {"x": 0.35, "y": 0.5},
            "14": {"x": 0.65, "y": 0.5},
            "15": {"x": 0.3, "y": 0.7},
            "16": {"x": 0.7, "y": 0.7},
            "19": {"x": 0.28, "y": 0.72},
            "20": {"x": 0.72, "y": 0.72},
            "23": {"x": 0.42, "y": 0.6},
            "24": {"x": 0.58, "y": 0.6},
            "25": {"x": 0.4, "y": 0.8},
            "26": {"x": 0.6, "y": 0.8},
            "27": {"x": 0.38, "y": 0.95},
            "28": {"x": 0.62, "y": 0.95},
            "31": {"x": 0.36, "y": 0.98},
            "32": {"x": 0.64, "y": 0.98}
        },
        # 프레임 2: 어깨 올림 (으쓱)
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.4, "y": 0.25},   # 어깨 높게
            "12": {"x": 0.6, "y": 0.25},
            "13": {"x": 0.35, "y": 0.4},
            "14": {"x": 0.65, "y": 0.4},
            "15": {"x": 0.3, "y": 0.6},
            "16": {"x": 0.7, "y": 0.6},
            "19": {"x": 0.28, "y": 0.62},
            "20": {"x": 0.72, "y": 0.62},
            "23": {"x": 0.42, "y": 0.55},
            "24": {"x": 0.58, "y": 0.55},
            "25": {"x": 0.4, "y": 0.75},
            "26": {"x": 0.6, "y": 0.75},
            "27": {"x": 0.38, "y": 0.9},
            "28": {"x": 0.62, "y": 0.9},
            "31": {"x": 0.36, "y": 0.93},
            "32": {"x": 0.64, "y": 0.93}
        }
    ]

# ✨ 팔 들기 운동 가이드 포즈 추가
def get_arm_raise_guide_poses() -> List[Dict[str, Dict[str, float]]]:
    """팔 벌리기/들기 가이드 포즈"""
    return [
        # 프레임 1: 팔 내림
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.4, "y": 0.3},
            "12": {"x": 0.6, "y": 0.3},
            "13": {"x": 0.35, "y": 0.5},
            "14": {"x": 0.65, "y": 0.5},
            "15": {"x": 0.3, "y": 0.7},
            "16": {"x": 0.7, "y": 0.7},
            "19": {"x": 0.28, "y": 0.72},
            "20": {"x": 0.72, "y": 0.72},
            "23": {"x": 0.42, "y": 0.6},
            "24": {"x": 0.58, "y": 0.6},
            "25": {"x": 0.4, "y": 0.8},
            "26": {"x": 0.6, "y": 0.8},
            "27": {"x": 0.38, "y": 0.95},
            "28": {"x": 0.62, "y": 0.95},
            "31": {"x": 0.36, "y": 0.98},
            "32": {"x": 0.64, "y": 0.98}
        },
        # 프레임 2: 팔 옆으로 벌림 (90도)
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.4, "y": 0.3},
            "12": {"x": 0.6, "y": 0.3},
            "13": {"x": 0.25, "y": 0.35},  # 팔꿈치 옆으로
            "14": {"x": 0.75, "y": 0.35},
            "15": {"x": 0.15, "y": 0.35},  # 손목 완전히 옆으로
            "16": {"x": 0.85, "y": 0.35},
            "19": {"x": 0.12, "y": 0.35},  # 검지
            "20": {"x": 0.88, "y": 0.35},
            "23": {"x": 0.42, "y": 0.6},
            "24": {"x": 0.58, "y": 0.6},
            "25": {"x": 0.4, "y": 0.8},
            "26": {"x": 0.6, "y": 0.8},
            "27": {"x": 0.38, "y": 0.95},
            "28": {"x": 0.62, "y": 0.95},
            "31": {"x": 0.36, "y": 0.98},
            "32": {"x": 0.64, "y": 0.98}
        }
    ]
    
def get_ankle_guide_poses() -> List[Dict[str, Dict[str, float]]]:
    """발목 돌리기/굽히기 가이드 포즈 (4개 프레임으로 회전 표현)"""
    return [
        # 프레임 1: 발목 중앙 (시작)
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.4, "y": 0.3},
            "12": {"x": 0.6, "y": 0.3},
            "13": {"x": 0.35, "y": 0.5},
            "14": {"x": 0.65, "y": 0.5},
            "15": {"x": 0.3, "y": 0.7},
            "16": {"x": 0.7, "y": 0.7},
            "19": {"x": 0.28, "y": 0.72},
            "20": {"x": 0.72, "y": 0.72},
            "23": {"x": 0.42, "y": 0.6},
            "24": {"x": 0.58, "y": 0.6},
            "25": {"x": 0.4, "y": 0.8},
            "26": {"x": 0.6, "y": 0.8},
            "27": {"x": 0.38, "y": 0.92},  # 발목
            "28": {"x": 0.62, "y": 0.92},
            "29": {"x": 0.36, "y": 0.93},  # 발뒤꿈치
            "30": {"x": 0.64, "y": 0.93},
            "31": {"x": 0.38, "y": 0.95},  # 발끝 - 중앙
            "32": {"x": 0.62, "y": 0.95}
        },
        # 프레임 2: 발끝 위로 (발목 굽힘)
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.4, "y": 0.3},
            "12": {"x": 0.6, "y": 0.3},
            "13": {"x": 0.35, "y": 0.5},
            "14": {"x": 0.65, "y": 0.5},
            "15": {"x": 0.3, "y": 0.7},
            "16": {"x": 0.7, "y": 0.7},
            "19": {"x": 0.28, "y": 0.72},
            "20": {"x": 0.72, "y": 0.72},
            "23": {"x": 0.42, "y": 0.6},
            "24": {"x": 0.58, "y": 0.6},
            "25": {"x": 0.4, "y": 0.8},
            "26": {"x": 0.6, "y": 0.8},
            "27": {"x": 0.38, "y": 0.92},
            "28": {"x": 0.62, "y": 0.92},
            "29": {"x": 0.36, "y": 0.95},  # 발뒤꿈치 아래로
            "30": {"x": 0.64, "y": 0.95},
            "31": {"x": 0.38, "y": 0.88},  # 발끝 위로
            "32": {"x": 0.62, "y": 0.88}
        },
        # 프레임 3: 발끝 오른쪽으로
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.4, "y": 0.3},
            "12": {"x": 0.6, "y": 0.3},
            "13": {"x": 0.35, "y": 0.5},
            "14": {"x": 0.65, "y": 0.5},
            "15": {"x": 0.3, "y": 0.7},
            "16": {"x": 0.7, "y": 0.7},
            "19": {"x": 0.28, "y": 0.72},
            "20": {"x": 0.72, "y": 0.72},
            "23": {"x": 0.42, "y": 0.6},
            "24": {"x": 0.58, "y": 0.6},
            "25": {"x": 0.4, "y": 0.8},
            "26": {"x": 0.6, "y": 0.8},
            "27": {"x": 0.38, "y": 0.92},
            "28": {"x": 0.62, "y": 0.92},
            "29": {"x": 0.34, "y": 0.93},
            "30": {"x": 0.6, "y": 0.93},
            "31": {"x": 0.32, "y": 0.95},  # 발끝 왼쪽으로
            "32": {"x": 0.66, "y": 0.95}   # 발끝 오른쪽으로
        },
        # 프레임 4: 발끝 아래로 (발목 펴기)
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.4, "y": 0.3},
            "12": {"x": 0.6, "y": 0.3},
            "13": {"x": 0.35, "y": 0.5},
            "14": {"x": 0.65, "y": 0.5},
            "15": {"x": 0.3, "y": 0.7},
            "16": {"x": 0.7, "y": 0.7},
            "19": {"x": 0.28, "y": 0.72},
            "20": {"x": 0.72, "y": 0.72},
            "23": {"x": 0.42, "y": 0.6},
            "24": {"x": 0.58, "y": 0.6},
            "25": {"x": 0.4, "y": 0.8},
            "26": {"x": 0.6, "y": 0.8},
            "27": {"x": 0.38, "y": 0.92},
            "28": {"x": 0.62, "y": 0.92},
            "29": {"x": 0.36, "y": 0.9},   # 발뒤꿈치 위로
            "30": {"x": 0.64, "y": 0.9},
            "31": {"x": 0.38, "y": 0.98},  # 발끝 아래로 (발레 자세)
            "32": {"x": 0.62, "y": 0.98}
        }
    ]


# ✨ 종아리(카프) 레이즈 가이드 포즈 추가
def get_calf_raise_guide_poses() -> List[Dict[str, Dict[str, float]]]:
    """종아리 올리기 (카프 레이즈) 가이드 포즈"""
    return [
        # 프레임 1: 발뒤꿈치 내림 (시작)
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.4, "y": 0.3},
            "12": {"x": 0.6, "y": 0.3},
            "13": {"x": 0.35, "y": 0.5},
            "14": {"x": 0.65, "y": 0.5},
            "15": {"x": 0.3, "y": 0.7},
            "16": {"x": 0.7, "y": 0.7},
            "19": {"x": 0.28, "y": 0.72},
            "20": {"x": 0.72, "y": 0.72},
            "23": {"x": 0.42, "y": 0.6},
            "24": {"x": 0.58, "y": 0.6},
            "25": {"x": 0.4, "y": 0.8},
            "26": {"x": 0.6, "y": 0.8},
            "27": {"x": 0.38, "y": 0.95},  # 발목
            "28": {"x": 0.62, "y": 0.95},
            "29": {"x": 0.36, "y": 0.97},  # 발뒤꿈치 낮게
            "30": {"x": 0.64, "y": 0.97},
            "31": {"x": 0.38, "y": 0.98},  # 발끝
            "32": {"x": 0.62, "y": 0.98}
        },
        # 프레임 2: 발뒤꿈치 올림 (까치발)
        {
            "0": {"x": 0.5, "y": 0.1},   # 전체적으로 위로
            "11": {"x": 0.4, "y": 0.25},
            "12": {"x": 0.6, "y": 0.25},
            "13": {"x": 0.35, "y": 0.45},
            "14": {"x": 0.65, "y": 0.45},
            "15": {"x": 0.3, "y": 0.65},
            "16": {"x": 0.7, "y": 0.65},
            "19": {"x": 0.28, "y": 0.67},
            "20": {"x": 0.72, "y": 0.67},
            "23": {"x": 0.42, "y": 0.55},
            "24": {"x": 0.58, "y": 0.55},
            "25": {"x": 0.4, "y": 0.75},
            "26": {"x": 0.6, "y": 0.75},
            "27": {"x": 0.38, "y": 0.88},  # 발목 위로
            "28": {"x": 0.62, "y": 0.88},
            "29": {"x": 0.36, "y": 0.85},  # 발뒤꿈치 높게
            "30": {"x": 0.64, "y": 0.85},
            "31": {"x": 0.38, "y": 0.98},  # 발끝은 그대로
            "32": {"x": 0.62, "y": 0.98}
        }
    ]


def get_squat_guide_poses() -> List[Dict[str, Dict[str, float]]]:
    """스쿼트 가이드 포즈 (손목, 발목까지 세밀하게)"""
    return [
        # 프레임 1: 서있는 자세
        {
            "0": {"x": 0.5, "y": 0.15},    # 코
            "11": {"x": 0.4, "y": 0.3},    # 왼쪽 어깨
            "12": {"x": 0.6, "y": 0.3},    # 오른쪽 어깨
            "13": {"x": 0.35, "y": 0.5},   # 왼쪽 팔꿈치
            "14": {"x": 0.65, "y": 0.5},   # 오른쪽 팔꿈치
            "15": {"x": 0.3, "y": 0.7},    # 왼쪽 손목
            "16": {"x": 0.7, "y": 0.7},    # 오른쪽 손목
            "19": {"x": 0.28, "y": 0.72},  # 왼쪽 검지
            "20": {"x": 0.72, "y": 0.72},  # 오른쪽 검지
            "23": {"x": 0.42, "y": 0.6},   # 왼쪽 엉덩이
            "24": {"x": 0.58, "y": 0.6},   # 오른쪽 엉덩이
            "25": {"x": 0.4, "y": 0.8},    # 왼쪽 무릎
            "26": {"x": 0.6, "y": 0.8},    # 오른쪽 무릎
            "27": {"x": 0.38, "y": 0.95},  # 왼쪽 발목
            "28": {"x": 0.62, "y": 0.95},  # 오른쪽 발목
            "31": {"x": 0.36, "y": 0.98},  # 왼쪽 발끝
            "32": {"x": 0.64, "y": 0.98}   # 오른쪽 발끝
        },
        # 프레임 2: 앉은 자세
        {
            "0": {"x": 0.5, "y": 0.25},
            "11": {"x": 0.4, "y": 0.4},
            "12": {"x": 0.6, "y": 0.4},
            "13": {"x": 0.32, "y": 0.55},
            "14": {"x": 0.68, "y": 0.55},
            "15": {"x": 0.25, "y": 0.7},
            "16": {"x": 0.75, "y": 0.7},
            "19": {"x": 0.23, "y": 0.72},
            "20": {"x": 0.77, "y": 0.72},
            "23": {"x": 0.42, "y": 0.75},
            "24": {"x": 0.58, "y": 0.75},
            "25": {"x": 0.35, "y": 0.85},
            "26": {"x": 0.65, "y": 0.85},
            "27": {"x": 0.33, "y": 0.95},
            "28": {"x": 0.67, "y": 0.95},
            "31": {"x": 0.31, "y": 0.98},
            "32": {"x": 0.69, "y": 0.98}
        }
    ]


def get_lunge_guide_poses() -> List[Dict[str, Dict[str, float]]]:
    """런지 가이드 포즈"""
    return [
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.4, "y": 0.3},
            "12": {"x": 0.6, "y": 0.3},
            "13": {"x": 0.35, "y": 0.5},
            "14": {"x": 0.65, "y": 0.5},
            "15": {"x": 0.3, "y": 0.7},
            "16": {"x": 0.7, "y": 0.7},
            "23": {"x": 0.42, "y": 0.6},
            "24": {"x": 0.58, "y": 0.6},
            "25": {"x": 0.4, "y": 0.8},
            "26": {"x": 0.6, "y": 0.8},
            "27": {"x": 0.38, "y": 0.95},
            "28": {"x": 0.62, "y": 0.95},
            "31": {"x": 0.36, "y": 0.98},
            "32": {"x": 0.64, "y": 0.98}
        },
        {
            "0": {"x": 0.5, "y": 0.2},
            "11": {"x": 0.4, "y": 0.35},
            "12": {"x": 0.6, "y": 0.35},
            "13": {"x": 0.32, "y": 0.55},
            "14": {"x": 0.68, "y": 0.55},
            "15": {"x": 0.28, "y": 0.75},
            "16": {"x": 0.72, "y": 0.75},
            "23": {"x": 0.42, "y": 0.65},
            "24": {"x": 0.58, "y": 0.65},
            "25": {"x": 0.35, "y": 0.8},
            "26": {"x": 0.65, "y": 0.85},
            "27": {"x": 0.33, "y": 0.92},
            "28": {"x": 0.67, "y": 0.97},
            "29": {"x": 0.32, "y": 0.93},
            "30": {"x": 0.68, "y": 0.98},
            "31": {"x": 0.31, "y": 0.95},
            "32": {"x": 0.69, "y": 0.99}
        }
    ]


def get_plank_guide_poses() -> List[Dict[str, Dict[str, float]]]:
    """플랭크 가이드 포즈"""
    return [
        {
            "0": {"x": 0.5, "y": 0.4},
            "11": {"x": 0.35, "y": 0.45},
            "12": {"x": 0.65, "y": 0.45},
            "13": {"x": 0.25, "y": 0.5},
            "14": {"x": 0.75, "y": 0.5},
            "15": {"x": 0.2, "y": 0.55},
            "16": {"x": 0.8, "y": 0.55},
            "19": {"x": 0.18, "y": 0.56},
            "20": {"x": 0.82, "y": 0.56},
            "23": {"x": 0.38, "y": 0.55},
            "24": {"x": 0.62, "y": 0.55},
            "25": {"x": 0.4, "y": 0.65},
            "26": {"x": 0.6, "y": 0.65},
            "27": {"x": 0.42, "y": 0.75},
            "28": {"x": 0.58, "y": 0.75},
            "31": {"x": 0.44, "y": 0.78},
            "32": {"x": 0.56, "y": 0.78}
        }
    ]


def get_pushup_guide_poses() -> List[Dict[str, Dict[str, float]]]:
    """팔굽혀펴기 가이드 포즈"""
    return [
        {
            "0": {"x": 0.5, "y": 0.35},
            "11": {"x": 0.35, "y": 0.4},
            "12": {"x": 0.65, "y": 0.4},
            "13": {"x": 0.25, "y": 0.45},
            "14": {"x": 0.75, "y": 0.45},
            "15": {"x": 0.2, "y": 0.5},
            "16": {"x": 0.8, "y": 0.5},
            "19": {"x": 0.18, "y": 0.52},
            "20": {"x": 0.82, "y": 0.52},
            "23": {"x": 0.38, "y": 0.5},
            "24": {"x": 0.62, "y": 0.5},
            "25": {"x": 0.4, "y": 0.6},
            "26": {"x": 0.6, "y": 0.6},
            "27": {"x": 0.42, "y": 0.7},
            "28": {"x": 0.58, "y": 0.7},
            "31": {"x": 0.44, "y": 0.73},
            "32": {"x": 0.56, "y": 0.73}
        },
        {
            "0": {"x": 0.5, "y": 0.47},
            "11": {"x": 0.35, "y": 0.52},
            "12": {"x": 0.65, "y": 0.52},
            "13": {"x": 0.28, "y": 0.54},
            "14": {"x": 0.72, "y": 0.54},
            "15": {"x": 0.2, "y": 0.55},
            "16": {"x": 0.8, "y": 0.55},
            "19": {"x": 0.18, "y": 0.56},
            "20": {"x": 0.82, "y": 0.56},
            "23": {"x": 0.38, "y": 0.58},
            "24": {"x": 0.62, "y": 0.58},
            "25": {"x": 0.4, "y": 0.68},
            "26": {"x": 0.6, "y": 0.68},
            "27": {"x": 0.42, "y": 0.78},
            "28": {"x": 0.58, "y": 0.78},
            "31": {"x": 0.44, "y": 0.81},
            "32": {"x": 0.56, "y": 0.81}
        }
    ]


def get_leg_raise_guide_poses() -> List[Dict[str, Dict[str, float]]]:
    """레그 레이즈 가이드 포즈"""
    return [
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.45, "y": 0.3},
            "12": {"x": 0.55, "y": 0.3},
            "13": {"x": 0.4, "y": 0.5},
            "14": {"x": 0.6, "y": 0.5},
            "15": {"x": 0.35, "y": 0.7},
            "16": {"x": 0.65, "y": 0.7},
            "23": {"x": 0.48, "y": 0.6},
            "24": {"x": 0.52, "y": 0.6},
            "25": {"x": 0.48, "y": 0.8},
            "26": {"x": 0.52, "y": 0.8},
            "27": {"x": 0.48, "y": 0.95},
            "28": {"x": 0.52, "y": 0.95},
            "31": {"x": 0.48, "y": 0.98},
            "32": {"x": 0.52, "y": 0.98}
        },
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.45, "y": 0.3},
            "12": {"x": 0.55, "y": 0.3},
            "13": {"x": 0.4, "y": 0.5},
            "14": {"x": 0.6, "y": 0.5},
            "15": {"x": 0.35, "y": 0.7},
            "16": {"x": 0.65, "y": 0.7},
            "23": {"x": 0.48, "y": 0.6},
            "24": {"x": 0.52, "y": 0.6},
            "25": {"x": 0.35, "y": 0.65},
            "26": {"x": 0.52, "y": 0.8},
            "27": {"x": 0.25, "y": 0.7},
            "28": {"x": 0.52, "y": 0.95},
            "29": {"x": 0.24, "y": 0.71},
            "31": {"x": 0.22, "y": 0.73},
            "32": {"x": 0.52, "y": 0.98}
        }
    ]


def get_stretching_guide_poses() -> List[Dict[str, Dict[str, float]]]:
    """스트레칭 가이드 포즈"""
    return [
        {
            "0": {"x": 0.5, "y": 0.2},
            "11": {"x": 0.4, "y": 0.35},
            "12": {"x": 0.6, "y": 0.35},
            "13": {"x": 0.3, "y": 0.4},
            "14": {"x": 0.7, "y": 0.4},
            "15": {"x": 0.2, "y": 0.45},
            "16": {"x": 0.8, "y": 0.45},
            "19": {"x": 0.18, "y": 0.46},
            "20": {"x": 0.82, "y": 0.46},
            "23": {"x": 0.42, "y": 0.6},
            "24": {"x": 0.58, "y": 0.6},
            "25": {"x": 0.4, "y": 0.8},
            "26": {"x": 0.6, "y": 0.8},
            "27": {"x": 0.38, "y": 0.95},
            "28": {"x": 0.62, "y": 0.95},
            "31": {"x": 0.36, "y": 0.98},
            "32": {"x": 0.64, "y": 0.98}
        }
    ]


def get_default_guide_poses() -> List[Dict[str, Dict[str, float]]]:
    """기본 가이드 포즈 (서있는 자세)"""
    return [
        {
            "0": {"x": 0.5, "y": 0.15},
            "11": {"x": 0.4, "y": 0.3},
            "12": {"x": 0.6, "y": 0.3},
            "13": {"x": 0.35, "y": 0.5},
            "14": {"x": 0.65, "y": 0.5},
            "15": {"x": 0.3, "y": 0.7},
            "16": {"x": 0.7, "y": 0.7},
            "19": {"x": 0.28, "y": 0.72},
            "20": {"x": 0.72, "y": 0.72},
            "23": {"x": 0.42, "y": 0.6},
            "24": {"x": 0.58, "y": 0.6},
            "25": {"x": 0.4, "y": 0.8},
            "26": {"x": 0.6, "y": 0.8},
            "27": {"x": 0.38, "y": 0.95},
            "28": {"x": 0.62, "y": 0.95},
            "31": {"x": 0.36, "y": 0.98},
            "32": {"x": 0.64, "y": 0.98}
        }
    ]


# --- 아래는 기존 헬퍼 함수들 ---

async def get_base_template(db, exercise_type: str, user_body_condition: Dict) -> Dict:
    injured_parts = user_body_condition.get("injured_parts", [])
    query = {"category": exercise_type, "contraindications": {"$not": {"$in": injured_parts}} if injured_parts else {}}
    return await db.exercise_templates.find_one(query)

async def create_default_template() -> Dict:
    return {
        "_id": None, "name": "기본 스쿼트", "category": "rehabilitation",
        "target_parts": ["무릎", "허벅지", "엉덩이"], "contraindications": [],
        "base_animation": {"fps": 30, "keyframes": [
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