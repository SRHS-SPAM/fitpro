import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Heart, AlertCircle } from 'lucide-react';

const BODY_PARTS = [
  '목', '어깨', '팔꿈치', '손목', '허리', '무릎', '발목', '기타'
];

function OnboardingPage({ user, setUser }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    injured_parts: [],
    pain_level: 5,
    limitations: []
  });
  const [customPart, setCustomPart] = useState('');
  const [customLimitation, setCustomLimitation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePartToggle = (part) => {
    setFormData(prev => ({
      ...prev,
      injured_parts: prev.injured_parts.includes(part)
        ? prev.injured_parts.filter(p => p !== part)
        : [...prev.injured_parts, part]
    }));
  };

  const addCustomPart = () => {
    if (customPart.trim() && !formData.injured_parts.includes(customPart.trim())) {
      setFormData(prev => ({
        ...prev,
        injured_parts: [...prev.injured_parts, customPart.trim()]
      }));
      setCustomPart('');
    }
  };

  const addLimitation = () => {
    if (customLimitation.trim() && !formData.limitations.includes(customLimitation.trim())) {
      setFormData(prev => ({
        ...prev,
        limitations: [...prev.limitations, customLimitation.trim()]
      }));
      setCustomLimitation('');
    }
  };

  const removeLimitation = (limitation) => {
    setFormData(prev => ({
      ...prev,
      limitations: prev.limitations.filter(l => l !== limitation)
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 p-4">
      <div className="max-w-2xl mx-auto pt-8 pb-20">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">맞춤 운동을 위한 설정</h1>
          <p className="text-gray-600 mt-2">
            {user?.name}님의 현재 상태를 알려주세요
          </p>
        </div>

        {/* 진행 표시 */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-3 h-3 rounded-full transition-colors ${step >= 1 ? 'bg-primary-500' : 'bg-gray-300'}`}></div>
          <div className={`w-3 h-3 rounded-full transition-colors ${step >= 2 ? 'bg-primary-500' : 'bg-gray-300'}`}></div>
          <div className={`w-3 h-3 rounded-full transition-colors ${step >= 3 ? 'bg-primary-500' : 'bg-gray-300'}`}></div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Step 1: 부상 부위 */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                불편하거나 다친 부위가 있나요?
              </h2>
              <p className="text-gray-600 mb-6">
                해당하는 부위를 모두 선택해주세요 (선택사항)
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {BODY_PARTS.map(part => (
                  <button
                    key={part}
                    onClick={() => handlePartToggle(part)}
                    className={`py-3 px-4 rounded-lg border-2 transition-all ${
                      formData.injured_parts.includes(part)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {part}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPart}
                  onChange={(e) => setCustomPart(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomPart()}
                  placeholder="직접 입력 (예: 왼쪽 무릎)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={addCustomPart}
                  className="px-6 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  추가
                </button>
              </div>

              {formData.injured_parts.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {formData.injured_parts.map(part => (
                    <span key={part} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                      {part}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                className="w-full mt-8 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
              >
                다음
              </button>
            </div>
          )}

          {/* Step 2: 통증 수준 */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                현재 통증 수준은 어떤가요?
              </h2>
              <p className="text-gray-600 mb-6">
                0 (통증 없음) ~ 10 (매우 심함)
              </p>

              <div className="mb-8">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={formData.pain_level}
                  onChange={(e) => setFormData({ ...formData, pain_level: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>0</span>
                  <span className="text-2xl font-bold text-primary-500">{formData.pain_level}</span>
                  <span>10</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  이전
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
                >
                  다음
                </button>
              </div>
            </div>
          )}

          {/* Step 3: 운동 제한사항 */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                하기 어려운 동작이 있나요?
              </h2>
              <p className="text-gray-600 mb-6">
                예: 쪼그려 앉기, 팔 들어올리기 등 (선택사항)
              </p>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={customLimitation}
                  onChange={(e) => setCustomLimitation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLimitation()}
                  placeholder="예: 쪼그려 앉기 어려움"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={addLimitation}
                  className="px-6 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  추가
                </button>
              </div>

              {formData.limitations.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {formData.limitations.map(limitation => (
                    <span
                      key={limitation}
                      onClick={() => removeLimitation(limitation)}
                      className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm cursor-pointer hover:bg-orange-200"
                    >
                      {limitation} ×
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  이전
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50"
                >
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