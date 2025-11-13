import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { AlertCircle, ChevronLeft, Mic, MicOff, Camera, Loader2, CheckCircle } from 'lucide-react';
import Webcam from 'react-webcam';
import './OnboardingPage.css';
import api from '../services/api'; 

const BODY_PARTS = [
  '목', '어깨', '팔꿈치', '손목', '허리', '무릎', '발목', '기타'
];

function OnboardingPage({ user, setUser }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0: 초기 선택, 1~3: 기존 스텝
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 카메라 스캔 상태
  const [showCamera, setShowCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const webcamRef = useRef(null);

  // 음성인식 상태
  const [isRecording1, setIsRecording1] = useState(false);
  const [isRecording2, setIsRecording2] = useState(false);
  const [voiceGuide1, setVoiceGuide1] = useState('');
  const [voiceGuide2, setVoiceGuide2] = useState('');
  const [liveTranscript1, setLiveTranscript1] = useState('');
  const [liveTranscript2, setLiveTranscript2] = useState('');
  const recognitionRef1 = useRef(null);
  const recognitionRef2 = useRef(null);

  const [formData, setFormData] = useState({
    injured_parts: user?.body_condition?.injured_parts || [],
    pain_level: user?.body_condition?.pain_level || 5,
    limitations: user?.body_condition?.limitations || [],
    injured_parts_detail: user?.body_condition?.injured_parts_detail || '',
    limitations_detail: user?.body_condition?.limitations_detail || '',
  });

  // 음성인식 초기화
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      // 첫 번째 입력창용 음성인식
      recognitionRef1.current = new SpeechRecognition();
      recognitionRef1.current.lang = 'ko-KR';
      recognitionRef1.current.continuous = true;
      recognitionRef1.current.interimResults = true;

      recognitionRef1.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setLiveTranscript1(transcript);
      };

      recognitionRef1.current.onerror = (event) => {
        console.error('음성인식 오류:', event.error);
        setIsRecording1(false);
      };

      recognitionRef1.current.onend = () => {
        setIsRecording1(false);
      };

      // 두 번째 입력창용 음성인식
      recognitionRef2.current = new SpeechRecognition();
      recognitionRef2.current.lang = 'ko-KR';
      recognitionRef2.current.continuous = true;
      recognitionRef2.current.interimResults = true;

      recognitionRef2.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setLiveTranscript2(transcript);
      };

      recognitionRef2.current.onerror = (event) => {
        console.error('음성인식 오류:', event.error);
        setIsRecording2(false);
      };

      recognitionRef2.current.onend = () => {
        setIsRecording2(false);
      };
    }

    return () => {
      if (recognitionRef1.current) {
        recognitionRef1.current.stop();
      }
      if (recognitionRef2.current) {
        recognitionRef2.current.stop();
      }
    };
  }, []);

// 카메라 촬영 및 분석
const captureAndAnalyze = async () => {
  setIsScanning(true);
  setError('');

  try {
    const imageSrc = webcamRef.current.getScreenshot();
    
    if (!imageSrc) {
      throw new Error('사진 촬영에 실패했습니다');
    }

    console.log('🚀 AI 분석 요청 시작');

    // ✅ api.js의 axios 인스턴스 사용 (baseURL이 자동으로 붙음)
    const response = await api.post('/body-analysis/analyze', {
      image_base64: imageSrc
    });

    console.log('✅ AI 분석 결과:', response.data);
    
    const result = response.data;
    
    // 에러가 있으면 표시
    if (result.error) {
      setError(result.error);
    }
    
    setAnalysisResult(result);
    
    // confidence가 문자열이므로 변환
    const confidenceMap = { high: 80, medium: 50, low: 30 };
    const confidenceValue = confidenceMap[result.confidence] || 0;
    
    // AI 결과를 formData에 반영
    setFormData(prev => ({
      ...prev,
      injured_parts: [...new Set([...prev.injured_parts, ...(result.injured_parts || [])])],
      pain_level: prev.pain_level, // 백엔드에서 estimated_pain_level을 제공하지 않으므로 유지
      limitations_detail: result.recommendations?.join(', ') || prev.limitations_detail
    }));

    setShowCamera(false);
    
    // 신뢰도가 낮으면 경고 표시
    if (confidenceValue < 40) {
      setError('분석 신뢰도가 낮습니다. 직접 입력하거나 다시 촬영해주세요.');
    }
    
    setStep(1); // 바로 스텝 1로 이동
    
  } catch (err) {
    console.error('❌ 분석 실패:', err);
    
    // axios 에러 처리
    if (err.response) {
      // 서버가 응답했지만 에러 상태
      const status = err.response.status;
      const message = err.response.data?.detail;
      
      if (status === 405) {
        setError('AI 분석 기능이 현재 서버에서 비활성화되어 있습니다.\n직접 입력 방식을 이용해주세요.');
      } else if (status === 404) {
        setError('AI 분석 엔드포인트를 찾을 수 없습니다.\n백엔드 팀에 문의하세요.');
      } else if (status === 401) {
        setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
        // 토큰 제거하고 로그인 페이지로 이동 (선택사항)
        // localStorage.removeItem('access_token');
        // navigate('/login');
      } else {
        setError(message || `분석 요청 실패 (${status})`);
      }
    } else if (err.request) {
      // 요청은 보냈지만 응답이 없음
      setError('서버 응답이 없습니다. 네트워크 연결을 확인해주세요.');
    } else {
      // 요청 생성 중 에러
      setError(err.message || '신체 분석 중 오류가 발생했습니다. 직접 입력해주세요.');
    }
    
    setShowCamera(false);
  } finally {
    setIsScanning(false);
  }
};
  const handlePartToggle = (part) => {
    setFormData(prev => ({
      ...prev,
      injured_parts: prev.injured_parts.includes(part)
        ? prev.injured_parts.filter(p => p !== part)
        : [...prev.injured_parts, part]
    }));
  };

  const toggleRecording1 = () => {
    if (!recognitionRef1.current) {
      setError('이 브라우저는 음성인식을 지원하지 않습니다.');
      return;
    }

    if (isRecording1) {
      recognitionRef1.current.stop();
      setIsRecording1(false);
      setVoiceGuide1('');
      if (liveTranscript1.trim()) {
        setFormData(prev => ({
          ...prev,
          injured_parts_detail: prev.injured_parts_detail + ' ' + liveTranscript1
        }));
      }
      setLiveTranscript1('');
    } else {
      try {
        recognitionRef1.current.start();
        setIsRecording1(true);
        setVoiceGuide1('겪고 계신 병명이나 불편한 부위를 말씀해주세요...');
        setLiveTranscript1('');
        setError('');
      } catch (err) {
        console.error('음성인식 시작 실패:', err);
        setError('음성인식을 시작할 수 없습니다.');
      }
    }
  };

  const toggleRecording2 = () => {
    if (!recognitionRef2.current) {
      setError('이 브라우저는 음성인식을 지원하지 않습니다.');
      return;
    }

    if (isRecording2) {
      recognitionRef2.current.stop();
      setIsRecording2(false);
      setVoiceGuide2('');
      if (liveTranscript2.trim()) {
        setFormData(prev => ({
          ...prev,
          limitations_detail: prev.limitations_detail + ' ' + liveTranscript2
        }));
      }
      setLiveTranscript2('');
    } else {
      try {
        recognitionRef2.current.start();
        setIsRecording2(true);
        setVoiceGuide2('하기 어려운 동작을 말씀해주세요...');
        setLiveTranscript2('');
        setError('');
      } catch (err) {
        console.error('음성인식 시작 실패:', err);
        setError('음성인식을 시작할 수 없습니다.');
      }
    }
  };

  const parseTextToArray = (text) => {
    if (!text || text.trim() === '') return [];
    return text
      .split(/[,.\n;]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const detailParts = parseTextToArray(formData.injured_parts_detail);
      const detailLimitations = parseTextToArray(formData.limitations_detail);

      const allInjuredParts = [
        ...formData.injured_parts,
        ...detailParts
      ];

      const uniqueInjuredParts = [...new Set(allInjuredParts)];
      const uniqueLimitations = [...new Set(detailLimitations)];

      const dataToSend = {
        injured_parts: uniqueInjuredParts,
        pain_level: formData.pain_level,
        limitations: uniqueLimitations
      };

      console.log('🚀 전송할 데이터:', dataToSend);

      const response = await authAPI.updateBodyCondition(dataToSend);
      setUser({ ...user, body_condition: response.data.body_condition });
      navigate('/');
    } catch (err) {
      console.error('저장 실패:', err);
      setError(err.response?.data?.detail || '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // confidence 문자열을 숫자로 변환하는 헬퍼 함수
  const getConfidenceDisplay = () => {
    if (!analysisResult) return '';
    const confidenceMap = { high: '높음 (80%)', medium: '보통 (50%)', low: '낮음 (30%)' };
    return confidenceMap[analysisResult.confidence] || '알 수 없음';
  };

  return (
    <div className="onboarding-wrapper">
      <div className="onboarding-header">
        <button onClick={() => navigate('/')} className="onboarding-back-button">
          <ChevronLeft className="onboarding-back-icon" />
        </button>
        <h1 className="onboarding-header-title">신체 정보 입력</h1>
        <div style={{ width: '40px' }}></div>
      </div>

      <div className="onboarding-content">
        <div className="onboarding-progress">
          <div className={`onboarding-progress-dot ${step >= 1 ? 'active' : ''}`}></div>
          <div className={`onboarding-progress-dot ${step >= 2 ? 'active' : ''}`}></div>
          <div className={`onboarding-progress-dot ${step >= 3 ? 'active' : ''}`}></div>
        </div>

        {error && (
          <div className="onboarding-error-box">
            <AlertCircle className="onboarding-error-icon" />
            <p className="onboarding-error-text">{error}</p>
          </div>
        )}

        <div className="onboarding-card">
          {/* Step 0: 초기 선택 화면 */}
          {step === 0 && (
            <div>
              <h2 className="onboarding-title">
                신체 상태를 입력해주세요
              </h2>
              <p className="onboarding-subtitle" style={{ marginBottom: '24px' }}>
                재활 운동 맞춤화를 위해 현재 상태를 알려주세요
              </p>

              {/* AI 분석 결과 표시 */}
              {analysisResult && analysisResult.confidence && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '12px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <CheckCircle size={20} style={{ color: '#2563eb', marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '600', color: '#1e3a8a', marginBottom: '4px' }}>
                        AI 분석 완료 (신뢰도: {getConfidenceDisplay()})
                      </p>
                      {analysisResult.suspected_conditions && analysisResult.suspected_conditions.length > 0 && (
                        <p style={{ fontSize: '14px', color: '#1e40af' }}>
                          감지: {analysisResult.suspected_conditions.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!showCamera ? (
                <>
                  {/* 자동 분석 버튼 */}
                  <button
                    onClick={() => setShowCamera(true)}
                    className="onboarding-next-button"
                    style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Camera size={20} style={{ marginRight: '8px' }} />
                    카메라로 자동 분석하기
                  </button>

                  {/* 구분선 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    margin: '20px 0'
                  }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>또는</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                  </div>

                  {/* 수동 입력 버튼 */}
                  <button
                    onClick={() => setStep(1)}
                    className="onboarding-prev-button"
                    style={{ width: '100%', border: '2px solid #e5e7eb' }}
                  >
                    직접 입력하기
                  </button>

                  {/* 안내 문구 */}
                  <div style={{
                    marginTop: '24px',
                    padding: '16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#4b5563'
                  }}>
                    <p style={{ fontWeight: '600', marginBottom: '8px' }}>💡 촬영 팁:</p>
                    <ul style={{ listStyle: 'disc', paddingLeft: '20px', margin: 0 }}>
                      <li>밝은 조명에서 촬영하세요</li>
                      <li>전신이 화면에 들어오도록 하세요</li>
                      <li>보조기구가 있다면 함께 보이게 하세요</li>
                      <li>부정확할 수 있으니 결과를 확인 후 수정하세요</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  {/* 카메라 뷰 */}
                  <div style={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: '#000',
                    marginBottom: '16px'
                  }}>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        facingMode: 'user',
                        width: 720,
                        height: 1280
                      }}
                      style={{ width: '100%', display: 'block' }}
                    />
                    
                    {/* 가이드 오버레이 */}
                    <div style={{
                      position: 'absolute',
                      inset: '32px',
                      border: '2px solid rgba(255,255,255,0.5)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none'
                    }}>
                      <div style={{
                        color: 'white',
                        textAlign: 'center',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        padding: '8px 16px',
                        borderRadius: '8px'
                      }}>
                        <p style={{ fontSize: '14px', margin: 0 }}>전신이 보이도록</p>
                        <p style={{ fontSize: '14px', margin: 0 }}>프레임 안에 서주세요</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={captureAndAnalyze}
                      disabled={isScanning}
                      className="onboarding-next-button"
                      style={{ flex: 1, backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {isScanning ? (
                        <>
                          <Loader2 size={20} style={{ marginRight: '8px' }} className="spinning" />
                          분석 중...
                        </>
                      ) : (
                        '사진 촬영 및 분석'
                      )}
                    </button>
                    
                    <button
                      onClick={() => setShowCamera(false)}
                      disabled={isScanning}
                      className="onboarding-prev-button"
                      style={{ padding: '0 16px' }}
                    >
                      취소
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 1: 불편 부위 입력 */}
          {step === 1 && (
            <div>
              <h2 className="onboarding-title">
                현재 치료 중이신 병명이나<br />불편한 부위를 입력해주세요
              </h2>
              
              {/* AI 분석 결과가 있으면 표시 */}
              {analysisResult && analysisResult.confidence !== 'low' && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#eff6ff',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#1e40af'
                }}>
                  ✓ AI가 감지한 부위가 자동으로 선택되었습니다. 수정하거나 추가할 수 있습니다.
                </div>
              )}

              <div className="onboarding-parts-grid">
                {BODY_PARTS.map(part => (
                  <button 
                    key={part} 
                    onClick={() => handlePartToggle(part)} 
                    className={`onboarding-part-button ${formData.injured_parts.includes(part) ? 'active' : ''}`}
                  >
                    {part}
                  </button>
                ))}
              </div>
              <div className="onboarding-input-group single">
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={formData.injured_parts_detail}
                    onChange={(e) => setFormData({ ...formData, injured_parts_detail: e.target.value })}
                    placeholder="상세한 내용을 직접 입력해주세요
예: 인후통, 두통, 관절염
여러 개는 쉼표로 구분해주세요"
                    className="onboarding-textarea"
                    rows="4"
                  />
                  <button
                    onClick={toggleRecording1}
                    className={`voice-input-button ${isRecording1 ? 'recording' : ''}`}
                    type="button"
                  >
                    {isRecording1 ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                </div>
              </div>
              {formData.injured_parts.length > 0 && (
                <div className="onboarding-tags">
                  {formData.injured_parts.map(part => (
                    <span key={part} onClick={() => handlePartToggle(part)} className="onboarding-tag removable">
                      {part} ×
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setStep(0)} 
                  className="onboarding-prev-button"
                  style={{ width: '80px' }}
                >
                  이전
                </button>
                <button 
                  onClick={() => setStep(2)} 
                  className="onboarding-next-button"
                  style={{ flex: 1 }}
                >
                  다음
                </button>
              </div>
            </div>
          )}

          {/* Step 2: 통증 수준 */}
          {step === 2 && (
            <div>
              <h2 className="onboarding-title">
                현재 통증 수준은 어떤가요?
              </h2>
              <p className="onboarding-subtitle">
                0 (통증 없음) ~ 10 (매우 심함)
              </p>
              <div className="onboarding-slider-container">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={formData.pain_level}
                  onChange={(e) => setFormData({ ...formData, pain_level: parseInt(e.target.value) })}
                  className="onboarding-slider"
                />
                <div className="onboarding-slider-labels">
                  <span>0</span>
                  <span className="onboarding-slider-value">{formData.pain_level}</span>
                  <span>10</span>
                </div>
              </div>
              <div className="onboarding-button-group">
                <button onClick={() => setStep(1)} className="onboarding-prev-button">
                  이전
                </button>
                <button onClick={() => setStep(3)} className="onboarding-next-button">
                  다음
                </button>
              </div>
            </div>
          )}

          {/* Step 3: 동작 제한 */}
          {step === 3 && (
            <div>
              <h2 className="onboarding-title">
                하기 어려운 동작이 있나요?
              </h2>
              <p className="onboarding-subtitle">
                예: 쪼그려 앉기, 팔 들어올리기 등 (선택사항)
              </p>
              <div className="onboarding-input-group single">
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={formData.limitations_detail}
                    onChange={(e) => setFormData({ ...formData, limitations_detail: e.target.value })}
                    placeholder="예: 쪼그려 앉기 어려움, 팔을 머리 위로 올리기 힘듦
여러 개는 쉼표로 구분해주세요"
                    className="onboarding-textarea"
                    rows="4"
                  />
                  <button
                    onClick={toggleRecording2}
                    className={`voice-input-button ${isRecording2 ? 'recording' : ''}`}
                    type="button"
                  >
                    {isRecording2 ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                </div>
              </div>
              <div className="onboarding-button-group">
                <button onClick={() => setStep(2)} className="onboarding-prev-button">
                  이전
                </button>
                <button onClick={handleSubmit} disabled={loading} className="onboarding-next-button">
                  {loading ? '저장 중...' : '완료'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 음성인식 모달 팝업 */}
      {(voiceGuide1 || voiceGuide2) && (
        <div className="voice-modal-overlay" onClick={() => {
          if (isRecording1) toggleRecording1();
          if (isRecording2) toggleRecording2();
        }}>
          <div className="voice-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="voice-modal-mic-container">
              <div className="voice-modal-wave wave-1"></div>
              <div className="voice-modal-wave wave-2"></div>
              <div className="voice-modal-wave wave-3"></div>
              <div className="voice-modal-mic-icon">
                <Mic size={48} />
              </div>
            </div>
            <h3 className="voice-modal-title">음성 인식 중...</h3>
            <p className="voice-modal-message">{voiceGuide1 || voiceGuide2}</p>
            
            <textarea
              className="voice-modal-transcript-editable"
              value={isRecording1 ? liveTranscript1 : liveTranscript2}
              onChange={(e) => {
                if (isRecording1) {
                  setLiveTranscript1(e.target.value);
                } else {
                  setLiveTranscript2(e.target.value);
                }
              }}
              placeholder="말씀하시면 여기에 표시됩니다. 잘못 인식된 부분은 직접 수정할 수 있습니다."
              rows="5"
            />
            
            <button 
              onClick={() => {
                if (isRecording1) toggleRecording1();
                if (isRecording2) toggleRecording2();
              }}
              className="voice-modal-stop-button"
            >
              완료
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OnboardingPage;