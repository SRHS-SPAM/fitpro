from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict
import logging

from ..services.body_analysis_service import BodyAnalysisService
from ..config import settings
from ..utils.jwt_handler import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/body-analysis", tags=["Body Analysis"])

# 서비스 인스턴스 생성
body_analysis_service = BodyAnalysisService(api_key=settings.OPENAI_API_KEY)


class AnalyzeBodyRequest(BaseModel):
    image_base64: str  # "data:image/jpeg;base64,..." 또는 순수 base64


class AnalyzeBodyResponse(BaseModel):
    injured_parts: List[str]
    suspected_conditions: List[str]
    confidence: str  # "high", "medium", "low"
    recommendations: List[str]
    error: str = None


@router.post("/analyze", response_model=AnalyzeBodyResponse)
async def analyze_body_from_image(
    request: AnalyzeBodyRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    사용자가 촬영한 전신 사진을 분석하여 신체 상태를 추론합니다.
    
    - **image_base64**: base64 인코딩된 이미지 (JPEG/PNG)
    - 반환: 부상 부위, 관찰 사항, 신뢰도, 권장사항
    """
    try:
        # data:image/jpeg;base64, 제거
        image_data = request.image_base64
        if "," in image_data:
            image_data = image_data.split(",")[1]
        
        # 이미지 분석
        result = await body_analysis_service.analyze_body_condition(image_data)
        
        return AnalyzeBodyResponse(**result)
        
    except Exception as e:
        logger.error(f"Body analysis endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"신체 분석 중 오류가 발생했습니다: {str(e)}"
        )