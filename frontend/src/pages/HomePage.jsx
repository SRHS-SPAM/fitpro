import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exerciseAPI, recordsAPI } from '../services/api';
import { Activity, Clock, History, AlertCircle, Home, Dumbbell, UserCircle } from 'lucide-react';
import './HomePage.css';

// App.jsx로부터 user와 setUser를 props로 받습니다.
function HomePage({ user, setUser }) {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await recordsAPI.getRecords(1, 3); 
        setRecords(response.data.records);
      } catch (err) {
        console.error("운동 기록을 불러오는 데 실패했습니다:", err);
      } finally {
        setRecordsLoading(false);
      }
    };

    if (user) {
      fetchRecords();
    }
  }, [user]);

  const handleStartExercise = () => {
    navigate('/exercise-selection');
  };

  return (
    <div className="home-page-wrapper">
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

      <div className="home-main-content">
        {user?.body_condition && (
            <div className="home-status-card">
              <h2 className="home-card-title">💪 현재 상태</h2>
              <div className="home-status-content">
                  {(user.body_condition.injured_parts?.length > 0 || user.body_condition.injured_parts_detail) && (
                  <div className="home-injured-section">
                      <span className="home-label">불편 부위:</span>
                      <div className="home-tag-container">
                      {user.body_condition.injured_parts.map(part => (
                          <span key={part} className="home-tag">{part}</span>
                      ))}
                      {user.body_condition.injured_parts_detail && (
                          <span className="home-tag detail">{user.body_condition.injured_parts_detail}</span>
                      )}
                      </div>
                  </div>
                  )}
                  <div className="home-pain-level">
                      <span className="home-label">통증 수준:</span>
                      <span className="home-pain-value">{user.body_condition.pain_level}/10</span>
                  </div>
              </div>
              {/* --- [핵심 수정] 잘 작동하는 온보딩 페이지로 링크를 변경 --- */}
              <button onClick={() => navigate('/onboarding')} className="home-edit-button">
                  정보 수정하기 →
              </button>
            </div>
        )}

        <div className="home-records-card">
            <h2 className="home-main-card-title">📖 최근 운동 기록</h2>
            {recordsLoading ? (
            <p>기록을 불러오는 중...</p>
            ) : records && records.length > 0 ? (
            <div className="home-records-list">
                {records.map(record => (
                <div key={record.record_id} className="home-record-item" onClick={() => navigate(`/records/${record.record_id}`)}>
                    <span className="record-exercise-name">{record.exercise_name}</span>
                    <span className="record-date">{new Date(record.completed_at).toLocaleDateString('ko-KR')}</span>
                    <span className="record-score">점수: {record.score}점</span>
                </div>
                ))}
            </div>
            ) : (
            <p>아직 운동 기록이 없습니다.</p>
            )}
        </div>

        <div className="home-exercise-card">
            <h2 className="home-main-card-title">🚀 운동 시작하기</h2>
            {error && (
              <div className="home-error-box">
                <AlertCircle className="home-error-icon" />
                <p className="home-error-text">{error}</p>
              </div>
            )}
            <button
              onClick={handleStartExercise}
              className="home-generate-button"
            >
              ✨ AI 맞춤 운동 추천받기
            </button>
        </div>
      </div>
      
      <div className="home-bottom-nav">
        <button onClick={() => navigate('/')} className="home-nav-button active">
          <Home className="home-nav-icon" />
          <span className="home-nav-label">홈</span>
        </button>
        <button onClick={() => navigate('/exercise-selection')} className="home-nav-button">
          <Dumbbell className="home-nav-icon" />
          <span className="home-nav-label">운동</span>
        </button>
        <button onClick={() => navigate('/records')} className="home-nav-button">
          <History className="home-nav-icon" />
          <span className="home-nav-label">기록</span>
        </button>
        <button onClick={() => navigate('/info')} className="home-nav-button">
          <UserCircle className="home-nav-icon" />
          <span className="home-nav-label">내 정보</span>
        </button>
      </div>
    </div>
  );
}

export default HomePage;