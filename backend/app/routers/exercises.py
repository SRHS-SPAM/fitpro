"""
개선된 AI 포즈 생성 로직

주요 개선사항:
1. AI 프롬프트 상세화 및 구조화
2. 포즈 검증 로직 강화
3. 백업 포즈 라이브러리 확장
4. 키프레임 생성 개선
"""

import json
from typing import Dict, List, Any
from backend.app.services.exercise_generation_service import get_ankle_guide_poses, get_arm_raise_guide_poses, get_calf_raise_guide_poses, get_default_guide_poses_with_animation, get_leg_raise_guide_poses, get_lunge_guide_poses, get_neck_guide_poses, get_plank_guide_poses, get_pushup_guide_poses, get_shoulder_guide_poses, get_sitting_guide_poses, get_squat_guide_poses, get_stretching_guide_poses, get_wrist_guide_poses
from openai import AsyncOpenAI
from bson import ObjectId

from ..config import settings

# OpenAI 클라이언트 초기화
client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY
)

# ============================================
# ✅ 개선된 AI 포즈 생성
# ============================================

async def generate_poses_with_ai(exercise_name: str) -> List[Dict[str, Dict[str, float]]]:
    """
    AI를 사용하여 운동 포즈 생성 (대폭 개선된 버전)
    
    Args:
        exercise_name: 운동 이름
    
    Returns:
        MediaPipe 33개 랜드마크 포즈 리스트 (4-6개 프레임)
    """
    prompt = f"""
당신은 운동 동작 전문가이자 애니메이션 제작자입니다. 다음 운동의 **매우 상세한 MediaPipe Pose 랜드마크 좌표**를 생성해주세요.

**운동 이름:** {exercise_name}

**핵심 지침:**
1. **반드시 4-6개의 프레임**을 생성하여 부드러운 동작을 만드세요
2. 각 프레임은 운동의 핵심 단계를 나타내야 합니다
3. 시작 자세 → 중간 동작 → 최종 자세 → (필요시) 복귀 순서로 구성
4. 모든 좌표는 해부학적으로 정확하고 자연스러워야 합니다

**필수 랜드마크 좌표 (0-32번 모두 포함!):**
```
얼굴 (0-10):
  0: nose, 1-6: 눈 주변, 7-8: 귀, 9-10: 입

상체 (11-22):
  11-12: 어깨, 13-14: 팔꿈치, 15-16: 손목
  17-22: 손가락 (핑키, 검지, 엄지)

하체 (23-32):
  23-24: 엉덩이, 25-26: 무릎, 27-28: 발목
  29-30: 발뒤꿈치, 31-32: 발끝
```

**좌표 시스템:**
- x: 0.0(왼쪽) ~ 1.0(오른쪽), 중앙=0.5
- y: 0.0(위) ~ 1.0(아래)
- z: -0.5 ~ 0.5, 대부분 -0.1 ~ 0.1

**표준 자세 y좌표 가이드:**

서있는 자세:
- 코(0): 0.10-0.15
- 눈(1-6): 0.12-0.14
- 귀(7-8): 0.14-0.16
- 어깨(11-12): 0.25-0.30
- 팔꿈치(13-14): 0.45-0.52
- 손목(15-16): 0.68-0.72
- 엉덩이(23-24): 0.55-0.60
- 무릎(25-26): 0.78-0.82
- 발목(27-28): 0.92-0.95
- 발끝(31-32): 0.96-0.98

앉은 자세:
- 코(0): 0.20-0.25
- 어깨(11-12): 0.32-0.38
- 팔꿈치(13-14): 0.48-0.54
- 손목(15-16): 0.62-0.68
- 엉덩이(23-24): 0.60-0.68
- 무릎(25-26): 0.78-0.82
- 발목(27-28): 0.92-0.95

**반드시 지켜야 할 해부학적 규칙:**
1. 어깨 너비: x 차이 0.15-0.25
2. 엉덩이 너비: x 차이 0.12-0.18
3. 팔 길이: 어깨→팔꿈치→손목이 자연스럽게 연결
4. 다리 길이: 엉덩이→무릎→발목이 일직선
5. 좌우 대칭: 왼쪽/오른쪽 랜드마크 x값이 0.5 기준 대칭

**응답 형식 (JSON만, 주석 절대 금지!):**
{{
  "frames": [
    {{
      "0": {{"x": 0.50, "y": 0.15, "z": -0.1}},
      "1": {{"x": 0.51, "y": 0.14, "z": -0.1}},
      "2": {{"x": 0.52, "y": 0.14, "z": -0.1}},
      "3": {{"x": 0.53, "y": 0.14, "z": -0.1}},
      "4": {{"x": 0.49, "y": 0.14, "z": -0.1}},
      "5": {{"x": 0.48, "y": 0.14, "z": -0.1}},
      "6": {{"x": 0.47, "y": 0.14, "z": -0.1}},
      "7": {{"x": 0.54, "y": 0.16, "z": -0.1}},
      "8": {{"x": 0.46, "y": 0.16, "z": -0.1}},
      "9": {{"x": 0.51, "y": 0.18, "z": -0.1}},
      "10": {{"x": 0.49, "y": 0.18, "z": -0.1}},
      "11": {{"x": 0.40, "y": 0.30, "z": -0.1}},
      "12": {{"x": 0.60, "y": 0.30, "z": -0.1}},
      "13": {{"x": 0.35, "y": 0.50, "z": -0.1}},
      "14": {{"x": 0.65, "y": 0.50, "z": -0.1}},
      "15": {{"x": 0.30, "y": 0.70, "z": -0.1}},
      "16": {{"x": 0.70, "y": 0.70, "z": -0.1}},
      "17": {{"x": 0.28, "y": 0.72, "z": -0.1}},
      "18": {{"x": 0.72, "y": 0.72, "z": -0.1}},
      "19": {{"x": 0.28, "y": 0.72, "z": -0.1}},
      "20": {{"x": 0.72, "y": 0.72, "z": -0.1}},
      "21": {{"x": 0.28, "y": 0.72, "z": -0.1}},
      "22": {{"x": 0.72, "y": 0.72, "z": -0.1}},
      "23": {{"x": 0.42, "y": 0.60, "z": -0.1}},
      "24": {{"x": 0.58, "y": 0.60, "z": -0.1}},
      "25": {{"x": 0.40, "y": 0.80, "z": -0.1}},
      "26": {{"x": 0.60, "y": 0.80, "z": -0.1}},
      "27": {{"x": 0.38, "y": 0.95, "z": -0.1}},
      "28": {{"x": 0.62, "y": 0.95, "z": -0.1}},
      "29": {{"x": 0.36, "y": 0.97, "z": -0.1}},
      "30": {{"x": 0.64, "y": 0.97, "z": -0.1}},
      "31": {{"x": 0.36, "y": 0.98, "z": -0.1}},
      "32": {{"x": 0.64, "y": 0.98, "z": -0.1}}
    }},
    ... (총 4-6개 프레임)
  ]
}}

**최종 체크리스트:**
✅ 프레임 수: 4-6개
✅ 각 프레임에 랜드마크 0-32 모두 포함
✅ x, y 좌표가 0.0-1.0 범위 내
✅ 동작이 자연스럽고 연속적
✅ 해부학적으로 올바른 관절 각도
✅ JSON 형식만 반환 (주석, 설명 없이)
"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system", 
                    "content": "당신은 운동 동작을 MediaPipe Pose 좌표로 변환하는 전문가입니다. 항상 완전하고 유효한 JSON만 반환하세요. 주석이나 설명은 절대 포함하지 마세요."
                },
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=4000  # ✅ 토큰 증가 (더 많은 프레임 생성)
        )
        
        content = response.choices[0].message.content
        
        # ✅ 마크다운 코드 블록 제거
        if content.strip().startswith("```"):
            lines = content.strip().split('\n')
            if lines[0].startswith("```json") or lines[0] == "```":
                lines = lines[1:]
            if lines and lines[-1] == "```":
                lines = lines[:-1]
            content = '\n'.join(lines)
        
        result = json.loads(content)
        frames = result.get("frames", [])
        
        # ✅ 프레임 검증
        if not frames or len(frames) < 3:
            print(f"⚠️ AI 포즈 프레임 부족: {len(frames)}개")
            return None
        
        # ✅ 각 프레임 검증
        valid_frames = []
        for i, frame in enumerate(frames):
            if validate_pose_frame(frame):
                valid_frames.append(frame)
            else:
                print(f"⚠️ 프레임 {i+1} 검증 실패")
        
        if len(valid_frames) >= 3:
            print(f"✅ AI 포즈 생성 성공: {len(valid_frames)}개 프레임")
            return valid_frames
        else:
            print(f"⚠️ 유효한 프레임 부족: {len(valid_frames)}개")
            return None
            
    except Exception as e:
        print(f"❌ AI 포즈 생성 오류: {e}")
        return None


def validate_pose_frame(frame: Dict) -> bool:
    """
    포즈 프레임 검증
    - 필수 랜드마크 존재 확인
    - 좌표 범위 확인
    - 해부학적 타당성 확인
    """
    # 필수 랜드마크
    required_landmarks = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32]
    
    for idx in required_landmarks:
        key = str(idx)
        if key not in frame:
            print(f"  ❌ 필수 랜드마크 {idx} 없음")
            return False
        
        landmark = frame[key]
        if not isinstance(landmark, dict):
            print(f"  ❌ 랜드마크 {idx} 형식 오류")
            return False
        
        # 좌표 범위 확인
        x = landmark.get("x", -1)
        y = landmark.get("y", -1)
        
        if not (0.0 <= x <= 1.0) or not (0.0 <= y <= 1.0):
            print(f"  ❌ 랜드마크 {idx} 좌표 범위 초과: x={x}, y={y}")
            return False
    
    # 해부학적 타당성 확인
    nose_y = frame["0"]["y"]
    shoulder_y = (frame["11"]["y"] + frame["12"]["y"]) / 2
    hip_y = (frame["23"]["y"] + frame["24"]["y"]) / 2
    ankle_y = (frame["27"]["y"] + frame["28"]["y"]) / 2
    
    # 머리 < 어깨 < 엉덩이 < 발목 (y좌표)
    if not (nose_y < shoulder_y < hip_y < ankle_y):
        print(f"  ❌ 해부학적 순서 오류: nose={nose_y:.2f}, shoulder={shoulder_y:.2f}, hip={hip_y:.2f}, ankle={ankle_y:.2f}")
        return False
    
    return True


# ============================================
# ✅ 확장된 하드코딩 포즈 라이브러리
# ============================================

def get_exercise_specific_poses(exercise_name: str) -> List[Dict[str, Dict[str, float]]]:
    """
    운동 이름에서 키워드를 찾아 적절한 하드코딩 포즈 반환
    """
    name_lower = exercise_name.lower()
    
    # 팔 운동
    if any(kw in name_lower for kw in ["팔굽혀펴기", "푸시업", "pushup", "push-up"]):
        return get_pushup_guide_poses()
    elif any(kw in name_lower for kw in ["벽 팔", "wall push", "벽 밀기"]):
        return get_wall_pushup_guide_poses()
    elif any(kw in name_lower for kw in ["팔 들", "팔 올리", "어깨 올리", "shoulder raise"]):
        return get_arm_raise_guide_poses()
    
    # 다리 운동
    elif any(kw in name_lower for kw in ["스쿼트", "squat"]):
        return get_squat_guide_poses()
    elif any(kw in name_lower for kw in ["런지", "lunge"]):
        return get_lunge_guide_poses()
    elif any(kw in name_lower for kw in ["다리 뻗", "다리 들", "leg raise", "leg extension"]):
        return get_leg_raise_guide_poses()
    elif any(kw in name_lower for kw in ["카프", "종아리", "calf"]):
        return get_calf_raise_guide_poses()
    
    # 코어 운동
    elif any(kw in name_lower for kw in ["플랭크", "plank"]):
        return get_plank_guide_poses()
    
    # 특정 부위
    elif any(kw in name_lower for kw in ["목", "neck", "경추"]):
        return get_neck_guide_poses()
    elif any(kw in name_lower for kw in ["손목", "wrist"]):
        return get_wrist_guide_poses()
    elif any(kw in name_lower for kw in ["발목", "ankle"]):
        return get_ankle_guide_poses()
    elif any(kw in name_lower for kw in ["어깨", "shoulder"]):
        return get_shoulder_guide_poses()
    
    # 앉은 자세
    elif any(kw in name_lower for kw in ["의자", "앉아", "sitting", "seated"]):
        return get_sitting_guide_poses()
    
    # 스트레칭
    elif any(kw in name_lower for kw in ["스트레칭", "스트레치", "stretching", "stretch"]):
        return get_stretching_guide_poses()
    
    # 폼롤러
    elif any(kw in name_lower for kw in ["폼롤러", "foam roller", "롤러"]):
        return get_foam_roller_guide_poses()
    
    return None


# ============================================
# ✅ 새로운 포즈 추가
# ============================================

def get_wall_pushup_guide_poses() -> List[Dict[str, Dict[str, float]]]:
    """벽 팔굽혀펴기 전용 포즈 (6개 프레임)"""
    return [
        # 프레임 1: 시작 - 벽에서 팔 쭉 펴기
        create_full_pose(
            nose_y=0.15, shoulder_y=0.30, elbow_y=0.45, wrist_y=0.50,
            hip_y=0.60, knee_y=0.80, ankle_y=0.95
        ),
        # 프레임 2: 기울이기 시작
        create_full_pose(
            nose_y=0.17, shoulder_y=0.32, elbow_y=0.48, wrist_y=0.52,
            hip_y=0.61, knee_y=0.80, ankle_y=0.95
        ),
        # 프레임 3: 최대한 벽에 가까이
        create_full_pose(
            nose_y=0.20, shoulder_y=0.35, elbow_y=0.52, wrist_y=0.55,
            hip_y=0.63, knee_y=0.80, ankle_y=0.95
        ),
        # 프레임 4: 밀기 시작
        create_full_pose(
            nose_y=0.18, shoulder_y=0.33, elbow_y=0.50, wrist_y=0.53,
            hip_y=0.62, knee_y=0.80, ankle_y=0.95
        ),
        # 프레임 5: 거의 원위치
        create_full_pose(
            nose_y=0.16, shoulder_y=0.31, elbow_y=0.47, wrist_y=0.51,
            hip_y=0.61, knee_y=0.80, ankle_y=0.95
        ),
        # 프레임 6: 완전 원위치
        create_full_pose(
            nose_y=0.15, shoulder_y=0.30, elbow_y=0.45, wrist_y=0.50,
            hip_y=0.60, knee_y=0.80, ankle_y=0.95
        ),
    ]


def get_foam_roller_guide_poses() -> List[Dict[str, Dict[str, float]]]:
    """폼롤러 스트레칭 포즈 (누운 자세)"""
    return [
        # 프레임 1: 누워서 다리 펴기
        {
            "0": {"x": 0.50, "y": 0.70},
            "11": {"x": 0.35, "y": 0.72},
            "12": {"x": 0.65, "y": 0.72},
            "13": {"x": 0.25, "y": 0.75},
            "14": {"x": 0.75, "y": 0.75},
            "15": {"x": 0.20, "y": 0.78},
            "16": {"x": 0.80, "y": 0.78},
            "19": {"x": 0.18, "y": 0.80},
            "20": {"x": 0.82, "y": 0.80},
            "23": {"x": 0.42, "y": 0.80},
            "24": {"x": 0.58, "y": 0.80},
            "25": {"x": 0.40, "y": 0.88},
            "26": {"x": 0.60, "y": 0.88},
            "27": {"x": 0.38, "y": 0.95},
            "28": {"x": 0.62, "y": 0.95},
            "31": {"x": 0.36, "y": 0.98},
            "32": {"x": 0.64, "y": 0.98}
        },
        # 프레임 2: 무릎 구부리기
        {
            "0": {"x": 0.50, "y": 0.70},
            "11": {"x": 0.35, "y": 0.72},
            "12": {"x": 0.65, "y": 0.72},
            "13": {"x": 0.25, "y": 0.75},
            "14": {"x": 0.75, "y": 0.75},
            "15": {"x": 0.20, "y": 0.78},
            "16": {"x": 0.80, "y": 0.78},
            "19": {"x": 0.18, "y": 0.80},
            "20": {"x": 0.82, "y": 0.80},
            "23": {"x": 0.42, "y": 0.80},
            "24": {"x": 0.58, "y": 0.80},
            "25": {"x": 0.38, "y": 0.85},
            "26": {"x": 0.62, "y": 0.85},
            "27": {"x": 0.35, "y": 0.90},
            "28": {"x": 0.65, "y": 0.90},
            "31": {"x": 0.33, "y": 0.93},
            "32": {"x": 0.67, "y": 0.93}
        }
    ]


def create_full_pose(nose_y, shoulder_y, elbow_y, wrist_y, hip_y, knee_y, ankle_y) -> Dict[str, Dict[str, float]]:
    """
    y좌표만 지정하면 자동으로 33개 랜드마크 생성
    """
    return {
        # 얼굴 (0-10)
        "0": {"x": 0.50, "y": nose_y, "z": -0.1},
        "1": {"x": 0.51, "y": nose_y - 0.01, "z": -0.1},
        "2": {"x": 0.52, "y": nose_y - 0.01, "z": -0.1},
        "3": {"x": 0.53, "y": nose_y - 0.01, "z": -0.1},
        "4": {"x": 0.49, "y": nose_y - 0.01, "z": -0.1},
        "5": {"x": 0.48, "y": nose_y - 0.01, "z": -0.1},
        "6": {"x": 0.47, "y": nose_y - 0.01, "z": -0.1},
        "7": {"x": 0.54, "y": nose_y + 0.01, "z": -0.1},
        "8": {"x": 0.46, "y": nose_y + 0.01, "z": -0.1},
        "9": {"x": 0.51, "y": nose_y + 0.03, "z": -0.1},
        "10": {"x": 0.49, "y": nose_y + 0.03, "z": -0.1},
        
        # 상체 (11-22)
        "11": {"x": 0.40, "y": shoulder_y, "z": -0.1},
        "12": {"x": 0.60, "y": shoulder_y, "z": -0.1},
        "13": {"x": 0.35, "y": elbow_y, "z": -0.1},
        "14": {"x": 0.65, "y": elbow_y, "z": -0.1},
        "15": {"x": 0.30, "y": wrist_y, "z": -0.1},
        "16": {"x": 0.70, "y": wrist_y, "z": -0.1},
        "17": {"x": 0.28, "y": wrist_y + 0.02, "z": -0.1},
        "18": {"x": 0.72, "y": wrist_y + 0.02, "z": -0.1},
        "19": {"x": 0.28, "y": wrist_y + 0.02, "z": -0.1},
        "20": {"x": 0.72, "y": wrist_y + 0.02, "z": -0.1},
        "21": {"x": 0.28, "y": wrist_y + 0.02, "z": -0.1},
        "22": {"x": 0.72, "y": wrist_y + 0.02, "z": -0.1},
        
        # 하체 (23-32)
        "23": {"x": 0.42, "y": hip_y, "z": -0.1},
        "24": {"x": 0.58, "y": hip_y, "z": -0.1},
        "25": {"x": 0.40, "y": knee_y, "z": -0.1},
        "26": {"x": 0.60, "y": knee_y, "z": -0.1},
        "27": {"x": 0.38, "y": ankle_y, "z": -0.1},
        "28": {"x": 0.62, "y": ankle_y, "z": -0.1},
        "29": {"x": 0.36, "y": ankle_y + 0.02, "z": -0.1},
        "30": {"x": 0.64, "y": ankle_y + 0.02, "z": -0.1},
        "31": {"x": 0.36, "y": ankle_y + 0.03, "z": -0.1},
        "32": {"x": 0.64, "y": ankle_y + 0.03, "z": -0.1}
    }


# ============================================
# ✅ 개선된 guide_poses 생성
# ============================================

async def generate_guide_poses(exercise_name: str) -> List[Dict[str, Dict[str, float]]]:
    """
    운동 이름 기반 가이드 포즈 생성 (개선된 버전)
    1. 하드코딩 포즈 확인
    2. AI 생성 시도
    3. 기본 포즈 사용
    """
    print(f"🎯 generate_guide_poses 호출: '{exercise_name}'")
    
    # ✅ 1단계: 하드코딩 포즈 확인
    hardcoded_poses = get_exercise_specific_poses(exercise_name)
    if hardcoded_poses:
        print(f"✅ 하드코딩 포즈 사용: {len(hardcoded_poses)}개 프레임")
        return hardcoded_poses
    
    # ✅ 2단계: AI 생성 시도
    print(f"🤖 AI 포즈 생성 시도: {exercise_name}")
    ai_poses = await generate_poses_with_ai(exercise_name)
    
    if ai_poses and len(ai_poses) >= 3:
        print(f"✅ AI 포즈 생성 성공: {len(ai_poses)}개 프레임")
        return ai_poses
    
    # ✅ 3단계: 기본 포즈 사용
    print(f"⚠️ AI 포즈 생성 실패, 기본 포즈 사용")
    default = get_default_guide_poses_with_animation()
    print(f"✅ 기본 애니메이션 포즈 사용: {len(default)}개 프레임")
    return default


# ============================================
# ✅ 기존 함수들 (문서에서 가져온 코드)
# ============================================

# (여기에 기존 get_squat_guide_poses, get_lunge_guide_poses 등 모든 함수 포함)
# ... (문서 2번의 모든 포즈 생성 함수들)