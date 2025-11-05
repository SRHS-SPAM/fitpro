import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recordsAPI } from '../services/api';
import { ArrowLeft, Calendar, Award, TrendingUp, Clock, Flame } from 'lucide-react';
import './RecordsPage.css';

function RecordsPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadRecords();
  }, [page]);

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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  // --- [수정] 요청에 맞게 시간 포맷팅 함수 변경 ---
  const formatDuration = (minutes) => {
    // duration_minutes 값이 1보다 작으면 '0분'으로 표시
    if (minutes < 1) {
      return '0분';
    }
    // 그 외에는 숫자를 반올림하여 분 단위로만 표시
    return `${Math.round(minutes)}분`;
  };
  // --- 수정된 부분 끝 ---

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

  // 통계 계산
  const stats = {
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
          <button
            onClick={() => navigate('/')}
            className="records-back-button"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="records-title">운동 기록</h1>
        </div>
      </div>

      <div className="records-content">
        <div className="records-stats-grid">
          <div className="records-stat-card">
            <div className="records-stat-content">
              <div className="records-stat-icon primary">
                <Award />
              </div>
              <div>
                <p className="records-stat-label">평균 점수</p>
                <p className="records-stat-value">{stats.averageScore}</p>
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
                <p className="records-stat-value">{stats.thisWeek}회</p>
              </div>
            </div>
          </div>
          
          <div className="records-stat-card">
            <div className="records-stat-content">
              <div className="records-stat-icon orange">
                <Clock />
              </div>
              <div>
                <p className="records-stat-label">총 운동 시간</p>
                <p className="records-stat-value">{formatDuration(stats.totalMinutes)}</p>
              </div>
            </div>
          </div>

          <div className="records-stat-card">
            <div className="records-stat-content">
              <div className="records-stat-icon red">
                <Flame />
              </div>
              <div>
                <p className="records-stat-label">총 운동</p>
                <p className="records-stat-value">{stats.totalWorkouts}회</p>
              </div>
            </div>
          </div>
        </div>

        <div className="records-list">
          <h2 className="records-section-title">최근 운동</h2>
          
          {records.length === 0 ? (
            <div className="records-empty">
              <Calendar />
              <h3 className="records-empty-title">
                아직 운동 기록이 없습니다
              </h3>
              <p className="records-empty-text">
                첫 운동을 시작해보세요!
              </p>
              <button
                onClick={() => navigate('/exercise-selection')}
                className="records-empty-button"
              >
                AI 추천 받기
              </button>
            </div>
          ) : (
            records.map(record => {
              const badge = getScoreBadge(record.score);
              
              return (
                <div
                  key={record.record_id}
                  className="records-item"
                  onClick={() => navigate(`/records/${record.record_id}`)}
                >
                  <div className="records-item-header">
                    <div className="records-item-info">
                      <h3 className="records-item-name">
                        {record.exercise_name}
                      </h3>
                      <p className="records-item-date">
                        {formatDate(record.completed_at)}
                      </p>
                    </div>
                    <span className={`records-item-badge ${badge.className}`}>
                      {badge.text}
                    </span>
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
    </div>
  );
}

export default RecordsPage;