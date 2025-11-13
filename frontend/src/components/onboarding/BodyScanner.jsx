import { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import { Camera, Loader2, AlertCircle } from 'lucide-react';

const BodyScanner = ({ onAnalysisComplete }) => {
  const webcamRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  const captureAndAnalyze = async () => {
    setIsScanning(true);
    setError(null);

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      
      if (!imageSrc) {
        throw new Error('사진 촬영에 실패했습니다');
      }

      const response = await fetch('/api/v1/analysis/body-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: imageSrc })
      });

      if (!response.ok) {
        throw new Error('분석 요청 실패');
      }

      const result = await response.json();
      
      // 부모 컴포넌트로 결과 전달
      onAnalysisComplete(result);
      setShowCamera(false);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      {!showCamera ? (
        <button
          onClick={() => setShowCamera(true)}
          className="w-full py-3 px-4 bg-blue-500 text-white rounded-lg 
                     hover:bg-blue-600 transition flex items-center justify-center gap-2"
        >
          <Camera className="w-5 h-5" />
          카메라로 자동 분석하기
        </button>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden bg-gray-900">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                facingMode: 'user',
                width: 720,
                height: 1280
              }}
              className="w-full"
            />
            
            {/* 가이드 오버레이 */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-x-8 inset-y-16 border-2 border-white/50 
                              rounded-lg flex items-center justify-center">
                <div className="text-white text-center bg-black/50 p-2 rounded">
                  <p className="text-sm">전신이 보이도록</p>
                  <p className="text-sm">프레임 안에 서주세요</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={captureAndAnalyze}
              disabled={isScanning}
              className="flex-1 py-3 px-4 bg-green-500 text-white rounded-lg 
                       hover:bg-green-600 disabled:bg-gray-400 transition
                       flex items-center justify-center gap-2"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  분석 중...
                </>
              ) : (
                '사진 촬영 및 분석'
              )}
            </button>
            
            <button
              onClick={() => setShowCamera(false)}
              disabled={isScanning}
              className="px-4 py-3 border border-gray-300 rounded-lg 
                       hover:bg-gray-50 transition"
            >
              취소
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border 
                          border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">분석 실패</p>
                <p>{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 안내 문구 */}
      <div className="text-sm text-gray-600 space-y-1">
        <p>💡 <strong>촬영 팁:</strong></p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li>밝은 조명에서 촬영하세요</li>
          <li>전신이 화면에 들어오도록 하세요</li>
          <li>보조기구가 있다면 함께 보이게 하세요</li>
          <li>부정확할 수 있으니 수동 입력도 확인하세요</li>
        </ul>
      </div>
    </div>
  );
};

export default BodyScanner;