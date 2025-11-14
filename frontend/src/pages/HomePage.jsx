import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recordsAPI } from '../services/api';
import { Activity, AlertCircle, ChevronRight } from 'lucide-react';
import BottomNav from '../components/BottomNav'; 
import './HomePage.css';

function HomePage({ user }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      setRecordsLoading(true);
      try {
        // 최근 기록 가져오기
        const response = await recordsAPI.getRecords(1, 1); 
        setRecords(response.data.records);
      } catch (err) {
        console.error("운동 기록을 불러오는 데 실패했습니다:", err);
      } finally {
        setRecordsLoading(false);
      }
    }; 
    if (user) fetchRecords();
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

          {user?.body_condition && (
            <div className="home-status-card-header">
              <div className="home-status-content-compact">
                {(user.body_condition.injured_parts?.length > 0 || user.body_condition.injured_parts_detail) && (
                  <div className="home-injured-section-compact">
                    <span className="home-label-compact">불편 부위:</span>
                    <div className="home-tag-container-compact">
                      {user.body_condition.injured_parts.map(part => ( 
                        <span key={part} className="home-tag-compact">{part}</span> 
                      ))}
                      {user.body_condition.injured_parts_detail && ( 
                        <span className="home-tag-compact detail">{user.body_condition.injured_parts_detail}</span> 
                      )}
                    </div>
                  </div>
                )}
                <div className="home-pain-level-compact">
                  <span className="home-label-compact">통증:</span>
                  <span className="home-pain-value-compact">{user.body_condition.pain_level}/10</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="home-main-content">
        <div className="home-exercise-card">
            <h2 className="home-main-card-title">운동 시작하기</h2>
            <img src="/home_img.png" alt="운동하는 모습" className='home-img'/>
            <p className="home-card-subtitle">AI가 상태에 맞춰 운동을 추천해 드립니다.</p>
            {error && (<div className="home-error-box"><AlertCircle className="home-error-icon" /><p className="home-error-text">{error}</p></div>)}
            <button onClick={handleStartExercise} className="home-generate-button">
              AI 맞춤 운동 추천받기
            </button>
        </div>

        <div className="home-records-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="home-main-card-title" style={{ margin: 0 }}>최근 운동 기록</h2>
              <button 
                onClick={() => navigate('/records')}
                className="home-see-more-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  color: '#6366f1',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#4f46e5'}
                onMouseLeave={(e) => e.target.style.color = '#6366f1'}
              >
                더보기
                <ChevronRight size={16} />
              </button>
            </div>
            {recordsLoading ? (<p>기록을 불러오는 중...</p>) 
            : records && records.length > 0 ? (
            <div className="home-records-list">
                {records.map(record => (
                <div key={record.record_id} className="home-record-item" onClick={() => navigate(`/records/${record.record_id}`)}>
                    <span className="record-exercise-name">{record.exercise_name}</span>
                    <span className="record-date">{new Date(record.completed_at).toLocaleDateString('ko-KR')}</span>
                    <span className="record-score">점수: {record.score}점</span>
                </div>
                ))}
            </div>
            ) : (<p>아직 운동 기록이 없습니다.</p>)}
        </div>
      </div>
      
      <BottomNav active="home" />
    </div>
  );
}

export default HomePage;