from typing import List, Dict, Optional
from openai import AsyncOpenAI
import base64
from io import BytesIO
from PIL import Image
import logging

logger = logging.getLogger(__name__)

class BodyAnalysisService:
    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)
    
    async def analyze_body_condition(
        self, 
        image_base64: str
    ) -> Dict[str, any]:
        """
        이미지를 분석하여 신체 상태를 추론합니다.
        
        Returns:
            {
                "injured_parts": ["왼쪽 무릎", "오른쪽 어깨"],
                "suspected_conditions": ["무릎 보호대 착용", "어깨 움직임 제한"],
                "confidence": "medium",
                "recommendations": ["정확한 진단을 위해 수동 확인 권장"]
            }
        """
        try:
            # 이미지 전처리 (선택사항 - 파일 크기 줄이기)
            processed_image = self._preprocess_image(image_base64)
            
            # OpenAI Vision API 호출
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",  # 비용 효율적
                messages=[
                    {
                        "role": "system",
                        "content": """당신은 물리치료 전문가입니다. 
사용자의 전신 사진을 분석하여 다음을 판단하세요:
1. 보호대, 깁스, 붕대 등 의료 기구 착용 여부
2. 자세의 비대칭성 (한쪽으로 기울어짐, 다리 길이 차이 등)
3. 특정 신체 부위의 부자연스러운 움직임이나 위치

**중요**: 
- 명확하게 보이는 것만 언급하세요
- 추측은 신중하게 하되, 불확실하면 "의심됨"이라고 표시하세요
- 의료 진단이 아닌 재활 운동 조정을 위한 참고 정보임을 명심하세요

JSON 형식으로만 응답하세요:
{
  "injured_parts": ["부위1", "부위2"],
  "suspected_conditions": ["관찰 사항1", "관찰 사항2"],
  "confidence": "high|medium|low",
  "recommendations": ["권장사항1"]
}

한국어로 응답하고, 부위는 "왼쪽/오른쪽 + 무릎/어깨/발목/팔꿈치/손목/허리/목" 형식으로 작성하세요."""
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "이 사진 속 사람의 신체 상태를 분석해주세요. 보호대, 깁스, 자세 이상 등을 확인해주세요."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{processed_image}",
                                    "detail": "low"  # 비용 절감
                                }
                            }
                        ]
                    }
                ],
                max_tokens=500,
                temperature=0.3  # 일관된 분석을 위해 낮은 temperature
            )
            
            # 응답 파싱
            content = response.choices[0].message.content
            
            # JSON 추출 (마크다운 코드 블록 제거)
            import json
            import re
            
            json_match = re.search(r'```json\s*(.*?)\s*```', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_str = content
            
            result = json.loads(json_str)
            
            # 결과 검증 및 보완
            result = self._validate_and_enhance_result(result)
            
            logger.info(f"Body analysis completed: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Body analysis failed: {str(e)}")
            return {
                "injured_parts": [],
                "suspected_conditions": [],
                "confidence": "low",
                "recommendations": ["자동 분석 실패. 수동으로 입력해주세요."],
                "error": str(e)
            }
    
    def _preprocess_image(self, image_base64: str) -> str:
        """이미지 크기를 줄여 API 비용 절감"""
        try:
            # base64 디코딩
            image_data = base64.b64decode(image_base64)
            image = Image.open(BytesIO(image_data))
            
            # 최대 크기 제한 (긴 쪽 기준 1024px)
            max_size = 1024
            if max(image.size) > max_size:
                ratio = max_size / max(image.size)
                new_size = tuple(int(dim * ratio) for dim in image.size)
                image = image.resize(new_size, Image.Resampling.LANCZOS)
            
            # JPEG로 변환 (품질 85)
            buffer = BytesIO()
            if image.mode in ('RGBA', 'LA', 'P'):
                image = image.convert('RGB')
            image.save(buffer, format='JPEG', quality=85)
            
            # base64 인코딩
            processed_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            return processed_base64
            
        except Exception as e:
            logger.warning(f"Image preprocessing failed, using original: {str(e)}")
            return image_base64
    
    def _validate_and_enhance_result(self, result: Dict) -> Dict:
        """결과 검증 및 기본값 설정"""
        # 필수 필드 확인
        if "injured_parts" not in result:
            result["injured_parts"] = []
        if "suspected_conditions" not in result:
            result["suspected_conditions"] = []
        if "confidence" not in result:
            result["confidence"] = "low"
        if "recommendations" not in result:
            result["recommendations"] = []
        
        # 부위 정규화 (예: "왼무릎" → "왼쪽 무릎")
        normalized_parts = []
        for part in result["injured_parts"]:
            normalized = self._normalize_body_part(part)
            if normalized:
                normalized_parts.append(normalized)
        result["injured_parts"] = normalized_parts
        
        # 신뢰도가 낮으면 권장사항 추가
        if result["confidence"] == "low" and not result["injured_parts"]:
            result["recommendations"].append(
                "명확한 부상 징후가 보이지 않습니다. 불편한 부위가 있다면 수동으로 입력해주세요."
            )
        
        return result
    
    def _normalize_body_part(self, part: str) -> Optional[str]:
        """신체 부위 이름 정규화"""
        # 매핑 테이블
        mapping = {
            # 방향
            "왼": "왼쪽", "좌": "왼쪽", "left": "왼쪽",
            "오른": "오른쪽", "우": "오른쪽", "right": "오른쪽",
            
            # 부위
            "knee": "무릎", "shoulder": "어깨", "ankle": "발목",
            "elbow": "팔꿈치", "wrist": "손목", "back": "허리",
            "neck": "목", "hip": "엉덩이"
        }
        
        normalized = part.lower().strip()
        for key, value in mapping.items():
            normalized = normalized.replace(key, value)
        
        # 유효한 부위인지 확인
        valid_parts = ["무릎", "어깨", "발목", "팔꿈치", "손목", "허리", "목", "엉덩이"]
        if any(vp in normalized for vp in valid_parts):
            return normalized
        
        return None