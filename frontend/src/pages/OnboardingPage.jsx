import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import './OnboardingPage.css';

const BODY_PARTS = [
  '목', '어깨', '팔꿈치', '손목', '허리', '무릎', '발목', '기타'
];

function OnboardingPage({ user, setUser }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    injured_parts: user?.body_condition?.injured_parts || [],
    pain_level: user?.body_condition?.pain_level || 5,
    limitations: user?.body_condition?.limitations || [],
    injured_parts_detail: user?.body_condition?.injured_parts_detail || '',
    limitations_detail: user?.body_condition?.limitations_detail || '',
  });

  const handlePartToggle = (part) => {
    setFormData(prev => ({
      ...prev,
      injured_parts: prev.injured_parts.includes(part)
        ? prev.injured_parts.filter(p => p !== part)
        : [...prev.injured_parts, part]
    }));
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
                <textarea
                  value={formData.injured_parts_detail}
                  onChange={(e) => setFormData({ ...formData, injured_parts_detail: e.target.value })}
                  placeholder="상세한 내용을 직접 입력해주세요 (예: 인후통, 두통, 관절염)"
                  className="onboarding-textarea"
                  rows="4"
                />
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
                <textarea
                  value={formData.limitations_detail}
                  onChange={(e) => setFormData({ ...formData, limitations_detail: e.target.value })}
                  placeholder="예: 쪼그려 앉기 어려움, 팔을 머리 위로 올리기 힘듦"
                  className="onboarding-textarea"
                  rows="4"
                />
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
    </div>
  );
}

export default OnboardingPage;