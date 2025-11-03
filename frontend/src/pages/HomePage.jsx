import { useState, useEffect } from 'react'; // useEffect를 사용합니다.
import { useNavigate } from 'react-router-dom';
import { exerciseAPI, recordsAPI } from '../services/api'; // recordsAPI를 import합니다.
import { Activity, Clock, History, AlertCircle, Home, Dumbbell, ClipboardList, UserCircle } from 'lucide-react';
import './HomePage.css';

function HomePage({ user }) {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  
  // 1. 운동 기록 목록과 로딩 상태를 위한 state 추가
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  const [options, setOptions] = useState({
    exercise_type: 'rehabilitation',
    intensity: 'low',
    duration_minutes: 15
  });

  // 2. 페이지가 처음 로드될 때, 백엔드에서 운동 기록을 불러옵니다.
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        // 기획서 API 명세에 따라 recordsAPI.getRecords()를 호출합니다.
        // 예시로 최근 3개의 기록만 가져옵니다. (page=1, limit=3)
        const response = await recordsAPI.getRecords(1, 3); 
        setRecords(response.data.records);
      } catch (err) {
        console.error("운동 기록을 불러오는 데 실패했습니다:", err);
      } finally {
        setRecordsLoading(false);
      }
    };

    if (user) { // 로그인한 사용자일 때만 기록을 불러옵니다.
      fetchRecords();
    }
  }, [user]); // user 정보가 있을 때 한 번만 실행됩니다.

  const handleGenerate = async () => {
    setError('');
    setGenerating(true);
    try {
      const response = await exerciseAPI.generate(options);
      // 기획서에 따라 exercise_id를 사용합니다.
      navigate(`/exercise/${response.data.exercise_id}`);
    } catch (err)
     {
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
      {/* --- 헤더 (수정 없음) --- */}
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
        {/* --- 신체 상태 카드 (수정 없음) --- */}
        {user?.body_condition && (
          <div className="home-status-card">
            <h2 className="home-card-title">💪 현재 상태</h2>
            <div className="home-status-content">
              {user.body_condition.injured_parts?.length > 0 && (
                <div className="home-injured-section">
                  <span className="home-label">불편 부위:</span>
                  <div className="home-tag-container">
                    {user.body_condition.injured_parts.map(part => (
                      <span key={part} className="home-tag">{part}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="home-pain-level">
                <span className="home-label">통증 수준:</span>
                <span className="home-pain-value">{user.body_condition.pain_level}/10</span>
              </div>
            </div>
            <button onClick={() => navigate('/onboarding')} className="home-edit-button">
              정보 수정하기 →
            </button>
          </div>
        )}

        {/* 3. "최근 운동 기록" 요약 섹션 UI 추가 */}
        <div className="home-records-card">
          <h2 className="home-main-card-title">📖 최근 운동 기록</h2>
          {recordsLoading ? (
            <p>기록을 불러오는 중...</p>
          ) : records && records.length > 0 ? (
            <div className="home-records-list">
              {records.map(record => (
                <div key={record.record_id} className="home-record-item" onClick={() => navigate(`/records/${record.record_id}`)}>
                  <span className="record-exercise-name">{record.exercise_name}</span>
                  <span className="record-date">{new Date(record.completed_at).toLocaleDateString()}</span>
                  <span className="record-score">점수: {record.score}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p>아직 운동 기록이 없습니다.</p>
          )}
          <button onClick={() => navigate('/records')} className="home-edit-button">
            전체 기록 보기 →
          </button>
        </div>

        {/* --- 운동 생성 카드 (수정 없음, 기획서에 맞는 역할) --- */}
        <div className="home-exercise-card">
          <h2 className="home-main-card-title">🎯 맞춤 운동 생성</h2>
          {/* ... (이하 운동 타입, 강도, 시간, 생성 버튼 등 UI는 그대로 유지) ... */}
        </div>
      </div>
      
      {/* --- 하단 네비게이션 바 (수정 없음) --- */}
      <div className="home-bottom-nav">
       {/* ... */}
      </div>
    </div>
  );
}

export default HomePage;