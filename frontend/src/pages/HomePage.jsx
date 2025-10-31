import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exerciseAPI } from '../services/api';
import { Activity, Clock, Zap, History, User, AlertCircle } from 'lucide-react';

function HomePage({ user }) {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState({
    exercise_type: 'rehabilitation',
    intensity: 'low',
    duration_minutes: 15
  });

  const handleGenerate = async () => {
    setError('');
    setGenerating(true);

    try {
      const response = await exerciseAPI.generate(options);
      navigate(`/exercise/${response.data.exercise_id}`);
    } catch (err) {
      setError(err.response?.data?.detail || '운동 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100">
      {/* 헤더 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Fitner</h1>
              <p className="text-xs text-gray-500">{user?.name}님</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <User className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 pb-20">
        {/* 신체 상태 카드 */}
        {user?.body_condition && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">현재 상태</h2>
            <div className="space-y-2">
              {user.body_condition.injured_parts?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-600">불편 부위:</span>
                  {user.body_condition.injured_parts.map(part => (
                    <span key={part} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                      {part}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">통증 수준:</span>
                <span className="font-semibold text-primary-600">
                  {user.body_condition.pain_level}/10
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/onboarding')}
              className="mt-4 text-sm text-primary-500 hover:text-primary-600"
            >
              정보 수정하기 →
            </button>
          </div>
        )}

        {/* 운동 생성 카드 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">맞춤 운동 생성</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* 운동 타입 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              운동 종류
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'rehabilitation', label: '재활', icon: Activity },
                { value: 'strength', label: '근력', icon: Zap },
                { value: 'stretching', label: '스트레칭', icon: Activity }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setOptions({ ...options, exercise_type: value })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    options.exercise_type === value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${
                    options.exercise_type === value ? 'text-primary-500' : 'text-gray-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    options.exercise_type === value ? 'text-primary-700' : 'text-gray-700'
                  }`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 강도 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              운동 강도
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'low', label: '낮음' },
                { value: 'medium', label: '보통' },
                { value: 'high', label: '높음' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setOptions({ ...options, intensity: value })}
                  className={`py-3 rounded-lg border-2 transition-all ${
                    options.intensity === value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 시간 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              운동 시간
            </label>
            <div className="grid grid-cols-4 gap-3">
              {[10, 15, 20, 30].map(minutes => (
                <button
                  key={minutes}
                  onClick={() => setOptions({ ...options, duration_minutes: minutes })}
                  className={`py-3 rounded-lg border-2 transition-all ${
                    options.duration_minutes === minutes
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <Clock className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-sm">{minutes}분</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-4 bg-primary-500 text-white rounded-xl font-bold text-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                AI가 운동을 생성 중...
              </span>
            ) : (
              '맞춤 운동 생성하기'
            )}
          </button>
        </div>

        {/* 운동 기록 버튼 */}
        <button
          onClick={() => navigate('/records')}
          className="w-full bg-white rounded-2xl shadow-lg p-6 flex items-center justify-between hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <History className="w-6 h-6 text-gray-600" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-900">운동 기록</h3>
              <p className="text-sm text-gray-500">지난 운동 내역 확인</p>
            </div>
          </div>
          <span className="text-2xl text-gray-400">›</span>
        </button>
      </div>
    </div>
  );
}

export default HomePage; 