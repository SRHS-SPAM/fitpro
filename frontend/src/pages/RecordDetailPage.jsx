import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recordsAPI } from '../services/api';
import { 
  ChevronLeft, 
  Calendar, 
  Award, 
  Clock, 
  Flame, 
  Smile, 
  Frown,
  MessageSquare,
  Activity,
  BarChart3
} from 'lucide-react';

function RecordDetailPage() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecordDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await recordsAPI.getRecord(recordId);
        setRecord(response.data);
      } catch (err) {
        setError('기록을 불러오는 데 실패했습니다.');
        console.error("Failed to fetch record detail:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecordDetail();
  }, [recordId]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-orange-500';
  };

  // 시간대별 예상 점수 데이터 생성 (실제 score_history가 없을 경우)
  const generateEstimatedScoreData = () => {
    const finalScore = record.score;
    const duration = record.duration_minutes;
    
    // 10개 구간으로 나누기
    const numIntervals = Math.min(10, Math.max(5, duration));
    const data = [];
    
    for (let i = 0; i < numIntervals; i++) {
      const progress = i / (numIntervals - 1);
      const startMin = Math.floor((i / numIntervals) * duration);
      const endMin = Math.floor(((i + 1) / numIntervals) * duration);
      
      // 운동 초반에는 점수가 낮고, 중반부터 안정화되는 패턴
      let estimatedScore;
      if (progress < 0.3) {
        // 초반: 60-80% 사이
        estimatedScore = finalScore * (0.6 + progress * 0.7);
      } else {
        // 중후반: 최종 점수에 가까워짐 (±5점 변동)
        estimatedScore = finalScore + (Math.sin(progress * Math.PI * 3) * 5);
      }
      
      data.push({
        range: `${startMin}-${endMin}`,
        value: Math.round(Math.max(0, Math.min(100, estimatedScore)))
      });
    }
    
    return data;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">상세 기록 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-red-600 mb-4">{error}</h2>
        <button onClick={() => navigate('/records')} className="px-6 py-2 bg-blue-500 text-white rounded-lg">
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  if (!record) {
    return <div className="p-8 text-center">기록을 찾을 수 없습니다.</div>;
  }

  // score_history가 있으면 사용, 없으면 예상 데이터 생성
  const hasScoreHistory = record.score_history && record.score_history.length > 0;
  let scoreData = [];
  
  if (hasScoreHistory) {
    // 실제 데이터가 있는 경우
    const scores = record.score_history;
    const numIntervals = Math.min(10, Math.max(5, scores.length));
    const scoresPerInterval = Math.ceil(scores.length / numIntervals);
    
    for (let i = 0; i < numIntervals; i++) {
      const start = i * scoresPerInterval;
      const end = Math.min((i + 1) * scoresPerInterval, scores.length);
      const intervalScores = scores.slice(start, end);
      
      const avgScore = intervalScores.length > 0
        ? Math.round(intervalScores.reduce((a, b) => a + b, 0) / intervalScores.length)
        : 0;
      
      const totalDuration = record.duration_minutes;
      const startMin = Math.floor((start / scores.length) * totalDuration);
      const endMin = Math.floor((end / scores.length) * totalDuration);
      
      scoreData.push({
        range: `${startMin}-${endMin}`,
        value: avgScore
      });
    }
  } else {
    // 실제 데이터가 없는 경우 예상 데이터 사용
    scoreData = generateEstimatedScoreData();
  }
  
  const maxScore = scoreData.length > 0 ? Math.max(...scoreData.map(d => d.value)) : 100;

  return (
    <div className="min-h-screen bg-gray-50" style={{ maxWidth: '393px', margin: '0 auto' }}>
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/records')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 truncate">
            {record.exercise_name}
          </h1>
        </div>
      </div>

      <div className="p-4 pb-20">
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          {/* 날짜 정보 */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{new Date(record.completed_at).toLocaleString('ko-KR')}</span>
          </div>
          
          {/* 핵심 통계 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-xl">
              <Award className={`w-6 h-6 mx-auto mb-1 ${getScoreColor(record.score)}`} />
              <p className="font-bold text-xl">{record.score}점</p>
              <p className="text-xs text-gray-500">최종 점수</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <Clock className="w-6 h-6 mx-auto mb-1 text-gray-600" />
              <p className="font-bold text-xl">{record.duration_minutes}분</p>
              <p className="text-xs text-gray-500">운동 시간</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl col-span-2 md:col-span-1">
              <Flame className="w-6 h-6 mx-auto mb-1 text-red-500" />
              <p className="font-bold text-xl">{record.calories_burned} kcal</p>
              <p className="text-xs text-gray-500">소모 칼로리</p>
            </div>
          </div>

          {/* 시간대별 점수 변화 */}
          {scoreData.length > 0 && (
            <div>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-gray-800">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                시간대별 점수 변화
              </h3>
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-end justify-between gap-1 h-40">
                  {scoreData.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="relative w-full flex items-end justify-center h-32">
                        <div
                          className="w-full bg-blue-500 rounded-t transition-all duration-500 ease-out hover:bg-blue-600"
                          style={{ 
                            height: `${(item.value / maxScore) * 100}%`,
                            minHeight: '8px'
                          }}
                          title={`${item.range}분: ${item.value}점`}
                        ></div>
                      </div>
                      <span className="text-[10px] text-gray-500 text-center leading-tight">
                        {item.range}분
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    {hasScoreHistory ? '단위: 점수 (0-100)' : '단위: 예상 점수 (0-100)'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 통증 변화 */}
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-gray-800">
              <Activity className="w-5 h-5 text-blue-600" />
              통증 변화
            </h3>
            <div className="flex items-center justify-around bg-gray-50 p-4 rounded-xl text-center">
              <div>
                <p className="text-sm text-gray-500">운동 전</p>
                <p className="font-bold text-2xl text-gray-800">{record.pain_level_before ?? 'N/A'}</p>
              </div>
              <div className="text-2xl text-gray-300">→</div>
              <div>
                <p className="text-sm text-gray-500">운동 후</p>
                <p className="font-bold text-2xl text-gray-800">{record.pain_level_after}</p>
              </div>
            </div>
          </div>
          
          {/* AI 피드백 */}
          {record.feedback && (
            <div>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-gray-800">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                AI 종합 피드백
              </h3>
              <div className="space-y-4">
                <p className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-blue-800 italic">
                  "{record.feedback.summary}"
                </p>
                {record.feedback.strengths?.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-xl">
                    <h4 className="font-bold text-green-700 flex items-center gap-2 mb-2">
                      <Smile className="w-5 h-5" /> 잘한 점
                    </h4>
                    <ul className="list-disc list-inside text-green-700 text-sm space-y-1">
                      {record.feedback.strengths.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {record.feedback.improvements?.length > 0 && (
                  <div className="p-4 bg-orange-50 rounded-xl">
                    <h4 className="font-bold text-orange-700 flex items-center gap-2 mb-2">
                      <Frown className="w-5 h-5" /> 개선할 점
                    </h4>
                    <ul className="list-disc list-inside text-orange-700 text-sm space-y-1">
                      {record.feedback.improvements.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecordDetailPage;