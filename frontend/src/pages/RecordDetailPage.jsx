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
    Activity
    } from 'lucide-react';

    // ⭐ [핵심] 더 이상 별도의 CSS 파일을 import할 필요가 없습니다.

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
                    {record.feedback.improvements?.length > <strong>0</strong> && (
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