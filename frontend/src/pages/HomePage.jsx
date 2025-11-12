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
  const [recordsError, setRecordsError] = useState(null); // ✅ 기록 전용 에러 상태

  useEffect(() => {
    const fetchRecords = async () => {
      if (!user) {
        setRecordsLoading(false);
        return;
      }

      setRecordsLoading(true);
      setRecordsError(null);
      
      try {
        console.log('📊 최근 기록 조회 시작...');
        const response = await recordsAPI.getRecords(1, 5); // ✅ 최근 5개만 조회
        
        console.log('✅ 기록 조회 성공:', response.data);
        setRecords(response.data.records || []);
      } catch (err) {
        console.error('❌ 운동 기록 조회 실패:', err);
        
        // ✅ 에러 메시지 개선
        if (err.code === 'ERR_NETWORK') {
          setRecordsError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
        } else if (err.response?.status === 401) {
          setRecordsError('로그인이 필요합니다.');
        } else if (err.response?.status >= 500) {
          setRecordsError('서버 오류가 발생했습니다.');
        } else {
          setRecordsError('기록을 불러올 수 없습니다.');
        }
        
        setRecords([]); // 빈 배열로 초기화
      } finally {
        setRecordsLoading(false);
      }
    };

    fetchRecords();
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
            {error && (
              <div className="home-error-box">
                <AlertCircle className="home-error-icon" />
                <p className="home-error-text">{error}</p>
              </div>
            )}
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
            
            {/* ✅ 로딩/에러/빈 데이터 상태 개선 */}
            {recordsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <p className="ml-3 text-gray-600">기록을 불러오는 중...</p>
              </div>
            ) : recordsError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                <p className="text-red-600 text-sm">{recordsError}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
                >
                  다시 시도
                </button>
              </div>
            ) : records && records.length > 0 ? (
              <div className="home-records-list">
                {records.map(record => (
                  <div 
                    key={record.record_id} 
                    className="home-record-item" 
                    onClick={() => navigate(`/records/${record.record_id}`)}
                  >
                    <span className="record-exercise-name">{record.exercise_name}</span>
                    <span className="record-date">
                      {new Date(record.completed_at).toLocaleDateString('ko-KR')}
                    </span>
                    <span className="record-score">점수: {record.score}점</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>아직 운동 기록이 없습니다.</p>
                <p className="text-sm mt-2">운동을 시작해보세요! 💪</p>
              </div>
            )}
        </div>
      </div>
      
      <BottomNav active="home" />
    </div>
  );
}

export default HomePage;