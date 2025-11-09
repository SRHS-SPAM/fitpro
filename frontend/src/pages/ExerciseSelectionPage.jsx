import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Clock, Zap, CheckCircle, PlusCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';

const ExerciseSelectionPage = ({ myExercises, addMyExercise }) => {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false); // ✅ 새로고침 상태

  const savedExerciseIds = new Set(myExercises.map(ex => ex.exercise_id));

  // ✅ 운동 추천 함수 분리
  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        'http://localhost:8000/api/v1/exercises/recommendations',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setExercises(response.data.exercises || []);
    } catch (err) {
      console.error('추천 운동 불러오기 실패:', err.response?.data?.detail || err.message);
      setError(err.response?.data?.detail || '운동 추천을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false); // ✅ 새로고침 상태 해제
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  // ✅ 새로고침 핸들러
  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecommendations();
  };

  const getIntensityColor = (intensity) => {
    switch(intensity?.toLowerCase()) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      case 'stretching': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4 mx-auto"></div>
          <p className="text-white text-xl">AI가 맞춤 운동을 추천 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-white text-2xl mb-2">운동 추천 실패</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg">홈으로 돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 pb-24">
      <button 
        onClick={() => navigate('/')} 
        className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-gray-800 bg-opacity-80 hover:bg-opacity-100 px-4 py-2 rounded-lg transition backdrop-blur-sm"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>나가기</span>
      </button>

      <div className="max-w-4xl mx-auto pt-2 pb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-3">🤖 AI 맞춤 운동 추천</h1>
            <p className="text-gray-400 text-lg">당신의 상태에 맞는 운동을 선택하세요</p>
          </div>
          
          {/* ✅ 새로고침 버튼 */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
              refreshing 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? '생성 중...' : '다른 운동 추천받기'}</span>
          </button>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto space-y-4">
        {exercises.map((exercise) => {
          const isSaved = savedExerciseIds.has(exercise.exercise_id);
          return (
            <div key={exercise.exercise_id} className="bg-gray-800 rounded-xl p-6 border-2 border-transparent hover:border-blue-500 transition-colors duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">{exercise.name}</h3>
                  <p className="text-gray-400 text-sm mb-3">{exercise.description}</p>
                </div>
                <Dumbbell className="w-8 h-8 text-blue-400 flex-shrink-0 ml-4" />
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-900 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400">시간</span>
                  </div>
                  <p className="text-lg font-semibold">{exercise.duration_minutes}분</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400">강도</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getIntensityColor(exercise.intensity)}`}></span>
                    <p className="text-lg font-semibold capitalize">{exercise.intensity}</p>
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <span className="text-xs text-gray-400 block mb-1">세트 × 반복</span>
                  <p className="text-lg font-semibold">{exercise.sets} × {exercise.repetitions}</p>
                </div>
              </div>
              
              {exercise.recommendation_reason && (
                <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-200">
                    <span className="font-semibold">💡 추천 이유:</span> {exercise.recommendation_reason}
                  </p>
                </div>
              )}
              
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => addMyExercise(exercise)}
                  disabled={isSaved}
                  className={`w-full flex items-center justify-center p-3 rounded-lg font-semibold transition ${
                    isSaved 
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {isSaved ? <CheckCircle className="w-5 h-5 mr-2" /> : <PlusCircle className="w-5 h-5 mr-2" />}
                  {isSaved ? '저장됨' : '내 운동에 저장'}
                </button>
                <button 
                  onClick={() => navigate(`/exercise/${exercise.exercise_id}`)} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-semibold transition"
                >
                  바로 시작 →
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {exercises.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">추천할 운동이 없습니다.</p>
          <button 
            onClick={() => navigate('/')} 
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
          >
            홈으로 돌아가기
          </button>
        </div>
      )}
    </div>
  );
};

export default ExerciseSelectionPage;