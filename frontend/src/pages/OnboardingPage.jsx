import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { AlertCircle, ChevronLeft, Mic, MicOff } from 'lucide-react';
import './OnboardingPage.css';

const BODY_PARTS = [
  '목', '어깨', '팔꿈치', '손목', '허리', '무릎', '발목', '기타'
];

function OnboardingPage({ user, setUser }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

        // 가장 최근 결과만 가져오기
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        // 실시간으로 전체 transcript 업데이트 (중복 방지)
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

        // 가장 최근 결과만 가져오기
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        // 실시간으로 전체 transcript 업데이트 (중복 방지)
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

  const handlePartToggle = (part) => {
    setFormData(prev => ({
      ...prev,
      injured_parts: prev.injured_parts.includes(part)
        ? prev.injured_parts.filter(p => p !== part)
        : [...prev.injured_parts, part]
    }));
  };

  // 첫 번째 입력창 음성인식 토글
  const toggleRecording1 = () => {
    if (!recognitionRef1.current) {
      setError('이 브라우저는 음성인식을 지원하지 않습니다.');
      return;
    }

    if (isRecording1) {
      recognitionRef1.current.stop();
      setIsRecording1(false);
      setVoiceGuide1('');
      // 중지할 때 인식된 텍스트를 textarea에 반영
      if (liveTranscript1.trim()) {
        setFormData(prev => ({
          ...prev,
          injured_parts_detail: prev.injured_parts_detail + liveTranscript1
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

  // 두 번째 입력창 음성인식 토글
  const toggleRecording2 = () => {
    if (!recognitionRef2.current) {
      setError('이 브라우저는 음성인식을 지원하지 않습니다.');
      return;
    }

    if (isRecording2) {
      recognitionRef2.current.stop();
      setIsRecording2(false);
      setVoiceGuide2('');
      // 중지할 때 인식된 텍스트를 textarea에 반영
      if (liveTranscript2.trim()) {
        setFormData(prev => ({
          ...prev,
          limitations_detail: prev.limitations_detail + liveTranscript2
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

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.updateBodyCondition(formData);
      setUser({ ...user, body_condition: response.data.body_condition });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
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
          {step === 1 && (
            <div>
              <h2 className="onboarding-title">
                현재 치료 중이신 병명이나<br />불편한 부위를 입력해주세요
              </h2>
              <div className="onboarding-parts-grid">
                {BODY_PARTS.map(part => (
                  <button key={part} onClick={() => handlePartToggle(part)} className={`onboarding-part-button ${formData.injured_parts.includes(part) ? 'active' : ''}`}>
                    {part}
                  </button>
                ))}
              </div>
              <div className="onboarding-input-group single">
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={formData.injured_parts_detail}
                    onChange={(e) => setFormData({ ...formData, injured_parts_detail: e.target.value })}
                    placeholder="상세한 내용을 직접 입력해주세요 (예: 인후통, 두통, 관절염)"
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
              <button onClick={() => setStep(2)} className="onboarding-next-button">
                다음
              </button>
            </div>
          )}

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
                    placeholder="예: 쪼그려 앉기 어려움, 팔을 머리 위로 올리기 힘듦"
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
            
            {/* 실시간 인식 텍스트 표시 - 편집 가능 */}
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