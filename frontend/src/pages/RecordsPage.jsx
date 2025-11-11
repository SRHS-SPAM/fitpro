import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { recordsAPI } from '../services/api';
import { ArrowLeft, Calendar, Award, TrendingUp, Clock, Flame, Trash2, Trophy } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import './RecordsPage.css';

function RecordsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [cumulativeStats, setCumulativeStats] = useState(null);

  useEffect(() => {
    loadRecords();
    loadCumulativeStats();
  }, [page]);

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      setTimeout(() => setSuccessMessage(''), 3000);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const response = await recordsAPI.getRecords(page, 10);
      setRecords(response.data.records);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCumulativeStats = async () => {
    try {
      const response = await recordsAPI.getStatistics('cumulative');
      setCumulativeStats(response.data);
    } catch (err) {
      console.error('Failed to load cumulative stats:', err);
    }
  };

  const handleDelete = async (recordId) => {
    setDeleting(true);
    try {
      await recordsAPI.deleteRecord(recordId);
      setRecords(prev => prev.filter(r => r.record_id !== recordId));
      setTotal(prev => prev - 1);
      setSuccessMessage('기록이 삭제되었습니다.');
      setTimeout(() => setSuccessMessage(''), 3000);
      setDeleteId(null);
    } catch (err) {
      console.error('Failed to delete record:', err);
      alert('기록 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const formatDuration = (minutes) => {
    if (minutes < 1) return '0분';
    return `${Math.round(minutes)}분`;
  };

  const getScoreColorClass = (score) => {
    if (score >= 80) return 'score-green';
    if (score >= 60) return 'score-yellow';
    return 'score-orange';
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return { text: '훌륭해요!', className: 'excellent' };
    if (score >= 60) return { text: '잘했어요', className: 'good' };
    return { text: '연습 필요', className: 'practice' };
  };

  const getProgressColorClass = (score) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'orange';
  };

  // 현재 기록 기반 통계
  const currentStats = {
    totalWorkouts: total,
    averageScore: records.length > 0
      ? Math.round(records.reduce((sum, r) => sum + (r.score || 0), 0) / records.length)
      : 0,
    totalMinutes: records.reduce((sum, r) => sum + (r.duration_minutes || 0), 0),
    thisWeek: records.filter(r => {
      const date = new Date(r.completed_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date > weekAgo;
    }).length
  };

  if (loading && records.length === 0) {
    return (
      <div className="records-loading">
        <div className="records-loading-content">
          <div className="records-loading-spinner"></div>
          <p className="records-loading-text">기록 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="records-page">
      <div className="records-header">
        <div className="records-header-content">
          <button onClick={() => navigate('/')} className="records-back-button">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="records-title">운동 기록</h1>
        </div>
      </div>

      {successMessage && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#10b981',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 50,
          animation: 'fadeIn 0.3s ease-in'
        }}>
          {successMessage}
        </div>
      )}

      <div className="records-content">
        {/* 누적 통계 카드 */}
        {cumulativeStats && (
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <Trophy style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af', margin: 0 }}>
                전체 누적 기록
              </h3>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              fontSize: '14px'
            }}>
              <div>
                <p style={{ color: '#64748b', margin: '0 0 4px 0' }}>총 운동</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af', margin: 0 }}>
                  {cumulativeStats.total_workouts_ever}회
                </p>
              </div>
              <div>
                <p style={{ color: '#64748b', margin: '0 0 4px 0' }}>총 시간</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af', margin: 0 }}>
                  {formatDuration(cumulativeStats.total_duration_minutes_ever)}
                </p>
              </div>
              <div>
                <p style={{ color: '#64748b', margin: '0 0 4px 0' }}>총 칼로리</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af', margin: 0 }}>
                  {cumulativeStats.total_calories_burned_ever} kcal
                </p>
              </div>
            </div>
            <p style={{
              fontSize: '12px',
              color: '#64748b',
              marginTop: '12px',
              marginBottom: 0
            }}>
              * 삭제된 기록도 포함된 전체 누적 통계입니다
            </p>
          </div>
        )}

        {/* 현재 기록 기반 통계 */}
        <div className="records-stats-grid">
          <div className="records-stat-card">
            <div className="records-stat-content">
              <div className="records-stat-icon primary">
                <Award />
              </div>
              <div>
                <p className="records-stat-label">평균 점수</p>
                <p className="records-stat-value">{currentStats.averageScore}</p>
              </div>
            </div>
          </div>

          <div className="records-stat-card">
            <div className="records-stat-content">
              <div className="records-stat-icon green">
                <TrendingUp />
              </div>
              <div>
                <p className="records-stat-label">이번 주</p>
                <p className="records-stat-value">{currentStats.thisWeek}회</p>
              </div>
            </div>
          </div>
          
          <div className="records-stat-card">
            <div className="records-stat-content">
              <div className="records-stat-icon orange">
                <Clock />
              </div>
              <div>
                <p className="records-stat-label">현재 운동 시간</p>
                <p className="records-stat-value">{formatDuration(currentStats.totalMinutes)}</p>
              </div>
            </div>
          </div>

          <div className="records-stat-card">
            <div className="records-stat-content">
              <div className="records-stat-icon red">
                <Flame />
              </div>
              <div>
                <p className="records-stat-label">현재 운동</p>
                <p className="records-stat-value">{currentStats.totalWorkouts}회</p>
              </div>
            </div>
          </div>
        </div>

        <div className="records-list">
          <h2 className="records-section-title">최근 운동</h2>
          
          {records.length === 0 ? (
            <div className="records-empty">
              <Calendar />
              <h3 className="records-empty-title">운동 기록이 없습니다</h3>
              <p className="records-empty-text">운동을 시작해보세요!</p>
              <button onClick={() => navigate('/exercise-selection')} className="records-empty-button">
                AI 추천 받기
              </button>
            </div>
          ) : (
            records.map(record => {
              const badge = getScoreBadge(record.score);
              
              return (
                <div key={record.record_id} style={{ position: 'relative', marginBottom: '16px' }}>
                  <div className="records-item" onClick={() => navigate(`/records/${record.record_id}`)}>
                    <div className="records-item-header">
                      <div className="records-item-info">
                        <h3 className="records-item-name">{record.exercise_name}</h3>
                        <p className="records-item-date">{formatDate(record.completed_at)}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`records-item-badge ${badge.className}`}>
                          {badge.text}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(record.record_id);
                          }}
                          style={{
                            padding: '8px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Trash2 style={{ width: '18px', height: '18px', color: '#ef4444' }} />
                        </button>
                      </div>
                    </div>

                    <div className="records-item-details">
                      <div className={`records-item-detail ${getScoreColorClass(record.score)}`}>
                        <Award />
                        <span>{record.score}점</span>
                      </div>
                      <div className="records-item-detail time">
                        <Clock />
                        <span>{formatDuration(record.duration_minutes)}</span>
                      </div>
                    </div>

                    <div className="records-progress-bar">
                      <div
                        className={`records-progress-fill ${getProgressColorClass(record.score)}`}
                        style={{ width: `${record.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {total > 10 && (
          <div className="records-pagination">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="records-pagination-button"
            >
              이전
            </button>
            <span className="records-pagination-info">
              {page} / {Math.ceil(total / 10)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 10)}
              className="records-pagination-button"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 삭제 확인 */}
      {deleteId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              backgroundColor: '#fee2e2',
              borderRadius: '50%',
              margin: '0 auto 16px'
            }}>
              <Trash2 style={{ width: '24px', height: '24px', color: '#dc2626' }} />
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#111827',
              textAlign: 'center',
              marginBottom: '8px'
            }}>
              기록을 삭제하시겠습니까?
            </h3>
            <p style={{
              color: '#6b7280',
              textAlign: 'center',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              삭제된 기록은 복구할 수 없습니다.
            </p>
            <p style={{
              color: '#3b82f6',
              textAlign: 'center',
              marginBottom: '24px',
              fontSize: '13px',
              fontWeight: '500'
            }}>
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  borderRadius: '8px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.5 : 1
                }}
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {deleting ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid white',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    삭제 중...
                  </>
                ) : (
                  '삭제'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNav active="records" />
    </div>
  );
}

export default RecordsPage;