import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recordsAPI } from '../services/api';
import { ArrowLeft, Calendar, Award, TrendingUp, Clock, Flame } from 'lucide-react';

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

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return { text: '훌륭해요!', color: 'bg-green-100 text-green-700' };
    if (score >= 60) return { text: '잘했어요', color: 'bg-yellow-100 text-yellow-700' };
    return { text: '연습 필요', color: 'bg-orange-100 text-orange-700' };
  };

  // 통계 계산
  const stats = {
    totalWorkouts: records.length,
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
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">기록 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100">
      {/* 헤더 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">운동 기록</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 pb-20">
        {/* 통계 카드 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">평균 점수</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageScore}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">이번 주</p>
                <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}회</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">총 운동 시간</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMinutes}분</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Flame className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">총 운동</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalWorkouts}회</p>
              </div>
            </div>
          </div>
        </div>

        {/* 운동 기록 목록 */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 px-2">최근 운동</h2>
          
          {records.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                아직 운동 기록이 없습니다
              </h3>
              <p className="text-gray-500 mb-6">
                첫 운동을 시작해보세요!
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
              >
                운동 시작하기
              </button>
            </div>
          ) : (
            records.map(record => {
              const badge = getScoreBadge(record.score);
              
              return (
                <div
                  key={record.record_id}
                  className="bg-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => navigate(`/records/${record.record_id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">
                        {record.exercise_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(record.completed_at)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                      {badge.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Award className={`w-4 h-4 ${getScoreColor(record.score)}`} />
                      <span className={`font-bold ${getScoreColor(record.score)}`}>
                        {record.score}점
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{record.duration_minutes}분</span>
                    </div>
                  </div>

                  {/* 점수 바 */}
                  <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        record.score >= 80
                          ? 'bg-green-500'
                          : record.score >= 60
                          ? 'bg-yellow-500'
                          : 'bg-orange-500'
                      }`}
                      style={{ width: `${record.score}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 페이지네이션 */}
        {total > 10 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="px-4 py-2 bg-white rounded-lg shadow">
              {page} / {Math.ceil(total / 10)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 10)}
              className="px-4 py-2 bg-white rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed"
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