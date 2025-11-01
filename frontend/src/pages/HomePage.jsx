import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exerciseAPI } from '../services/api';
import { Activity, Clock, Zap, History, User, AlertCircle, Home, Dumbbell, ClipboardList, UserCircle } from 'lucide-react';
import './HomePage.css';

function HomePage({ user }) {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('home');
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
    <div className="home-page-wrapper">
      {/* 헤더 */}
      <div className="home-header">
        <div className="home-header-content">
          <div className="home-logo-section">
            <div className="home-logo-icon">
              <Activity className="home-logo-icon-svg" />
            </div>
            <div>
              <h1 className="home-logo-text">Fitner</h1>
              <p className="home-user-text">{user?.name || '사용자'}님</p>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="home-main-content">
        {/* 신체 상태 카드 */}
        {user?.body_condition && (
          <div className="home-status-card">
            <h2 className="home-card-title">💪 현재 상태</h2>
            <div className="home-status-content">
              {user.body_condition.injured_parts?.length > 0 && (
                <div className="home-injured-section">
                  <span className="home-label">불편 부위:</span>
                  <div className="home-tag-container">
                    {user.body_condition.injured_parts.map(part => (
                      <span key={part} className="home-tag">
                        {part}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="home-pain-level">
                <span className="home-label">통증 수준:</span>
                <span className="home-pain-value">
                  {user.body_condition.pain_level}/10
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/onboarding')}
              className="home-edit-button"
            >
              정보 수정하기 →
            </button>
          </div>
        )}

        {/* 운동 생성 카드 */}
        <div className="home-exercise-card">
          <h2 className="home-main-card-title">🎯 맞춤 운동 생성</h2>

          {error && (
            <div className="home-error-box">
              <AlertCircle className="home-error-icon" />
              <p className="home-error-text">{error}</p>
            </div>
          )}

          {/* 운동 타입 */}
          <div className="home-section">
            <label className="home-section-label">운동 종류</label>
            <div className="home-type-grid">
              {[
                { value: 'rehabilitation', label: '재활', icon: '🏥' },
                { value: 'strength', label: '근력', icon: '💪' },
                { value: 'stretching', label: '스트레칭', icon: '🧘' }
              ].map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setOptions({ ...options, exercise_type: value })}
                  className={`home-type-button ${options.exercise_type === value ? 'active' : ''}`}
                >
                  <span className="home-type-icon">{icon}</span>
                  <span className="home-type-label">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 강도 */}
          <div className="home-section">
            <label className="home-section-label">운동 강도</label>
            <div className="home-intensity-grid">
              {[
                { value: 'low', label: '낮음', emoji: '🟢' },
                { value: 'medium', label: '보통', emoji: '🟡' },
                { value: 'high', label: '높음', emoji: '🔴' }
              ].map(({ value, label, emoji }) => (
                <button
                  key={value}
                  onClick={() => setOptions({ ...options, intensity: value })}
                  className={`home-intensity-button ${options.intensity === value ? 'active' : ''}`}
                >
                  <span className="home-intensity-emoji">{emoji}</span>
                  <span className="home-intensity-label">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 시간 */}
          <div className="home-section">
            <label className="home-section-label">운동 시간</label>
            <div className="home-time-grid">
              {[10, 15, 20, 30].map(minutes => (
                <button
                  key={minutes}
                  onClick={() => setOptions({ ...options, duration_minutes: minutes })}
                  className={`home-time-button ${options.duration_minutes === minutes ? 'active' : ''}`}
                >
                  <Clock className="home-time-icon" />
                  <span className="home-time-label">{minutes}분</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className={`home-generate-button ${generating ? 'disabled' : ''}`}
          >
            {generating ? (
              <span className="home-generating-text">
                <div className="home-spinner"></div>
                AI가 운동을 생성 중...
              </span>
            ) : (
              '✨ 맞춤 운동 생성하기'
            )}
          </button>
        </div>
      </div>

      {/* 하단 네비게이션 바 */}
      <div className="home-bottom-nav">
        <button
          onClick={() => {
            setActiveTab('home');
            navigate('/');
          }}
          className={`home-nav-button ${activeTab === 'home' ? 'active' : ''}`}
        >
          <Home className="home-nav-icon" />
          <span className="home-nav-label">홈</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('exercise');
          }}
          className={`home-nav-button ${activeTab === 'exercise' ? 'active' : ''}`}
        >
          <Dumbbell className="home-nav-icon" />
          <span className="home-nav-label">운동</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('records');
            navigate('/records');
          }}
          className={`home-nav-button ${activeTab === 'records' ? 'active' : ''}`}
        >
          <History className="home-nav-icon" />
          <span className="home-nav-label">기록</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('my-exercise');
          }}
          className={`home-nav-button ${activeTab === 'my-exercise' ? 'active' : ''}`}
        >
          <ClipboardList className="home-nav-icon" />
          <span className="home-nav-label">내 운동</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('profile');
            navigate('/onboarding');
          }}
          className={`home-nav-button ${activeTab === 'profile' ? 'active' : ''}`}
        >
          <UserCircle className="home-nav-icon" />
          <span className="home-nav-label">내 정보</span>
        </button>
      </div>
    </div>
  );
}

export default HomePage;