import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Clock, Zap, CheckCircle, PlusCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';

// ✅ (1/3) 재활 부위별 이미지 경로를 반환하는 헬퍼 함수
// API 응답에 맞춰 case의 값들 (예: "목", "팔")을 수정해야 할 수 있습니다.
const partImageMap = {
  // --- 기존 매핑 ---
  '목': '/pain/nack.png',
  '팔': '/pain/arm.png',
  '손목': '/pain/arm.png',
  '팔꿈치': '/pain/arm.png',
  '다리': '/pain/leg.png',
  '허리': '/pain/waist.png',
  '발': '/pain/foot.png',
  '발목': '/pain/foot.png',
  '무릎': '/pain/leg.png',
  '엉덩이': '/pain/leg.png',
  '고관절': '/pain/leg.png',
  '어깨': '/pain/arm.png',
  '가슴': '/pain/arm.png',
  '등': '/pain/waist.png',
};

// ✅✅✅ 로직 수정: 배열의 첫 번째 요소만 확인
const getRehabImage = (targetParts) => {
  // 1. 배열이 아니거나 비어있는지 확인
  if (!Array.isArray(targetParts) || targetParts.length === 0) {
    console.log('[이미지] targetParts가 배열이 아니거나 비어있음:', targetParts);
    return null;
  }

  // 2. 오직 첫 번째 요소 (targetParts[0])만 가져옴
  const firstPart = targetParts[0]; // 예: '무릎'

  // 3. partImageMap에서 해당 요소가 있는지 확인
  if (partImageMap[firstPart]) {
    // 4. ✅ 디버깅: 일치하는 키와 반환될 경로를 로그로 확인
    console.log(`[이미지] 일치! Key: "${firstPart}", Path: "${partImageMap[firstPart]}"`);
    return partImageMap[firstPart]; // 예: '/pain/leg.png' 반환
  }

  // 5. ❌ 디버깅: 첫 번째 요소가 맵에 없는 경우
  console.log(`[이미지] 불일치. 첫 번째 부위 "${firstPart}"가 partImageMap에 없습니다.`);
  return null;
};

const ExerciseSelectionPage = ({ myExercises, addMyExercise }) => {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const savedExerciseIds = new Set(
    Array.isArray(myExercises) ? myExercises.map(ex => ex.exercise_id) : []
  );

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        'http://localhost:8000/api/v1/exercises/recommendations',
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 4 }
        }
      );
      // ❗ API 응답 데이터 예시 (가정)
      // response.data.exercises = [
      //   { exercise_id: 1, name: "목 스트레칭", target_part: "목", ... },
      //   { exercise_id: 2, name: "런지", target_part: "다리", ... },
      // ]
      setExercises(response.data.exercises || []);
    } catch (err) {
      console.error('추천 운동 불러오기 실패:', err.response?.data?.detail || err.message);
      setError(err.response?.data?.detail || '운동 추천을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

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

  // --- 로딩 및 에러 화면 (기존과 동일) ---
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
  // --- 로딩 및 에러 화면 끝 ---

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-3 pb-24">
      <button 
        onClick={() => navigate('/')} 
        className="mb-3 flex items-center gap-2 bg-gray-800 bg-opacity-80 hover:bg-opacity-100 px-4 py-2 rounded-lg transition backdrop-blur-sm"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>나가기</span>
      </button>

      <div className="max-w-4xl mx-auto pt-2 pb-8">
        <div className="items-center justify-between mb-3">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-3">AI 맞춤 운동 추천</h1>
            <p className="text-gray-400 text-lg mb-5">당신의 상태에 맞는 운동을 선택하세요</p>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
              refreshing 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600  hover:bg-blue-700 text-white'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? '생성 중...' : '다른 운동 추천받기'}</span>
          </button>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto grid grid-cols-2 gap-2">
        {exercises.map((exercise) => {

          console.log('추천된 운동 객체:', exercise);
          console.log('타겟 부위 (target_parts):', exercise.target_parts);

          // 2. isSaved 계산
          const isSaved = savedExerciseIds.has(exercise.exercise_id);
          
          // 3. ✅✅✅ 바로 이 부분입니다! ✅✅✅
          // exercise.target_parts가 정확히 전달되는지 확인
          const imageUrl = getRehabImage(exercise.target_parts);

          return (
            <div key={exercise.exercise_id} className="bg-gray-800 rounded-xl p-2 border-2 border-transparent hover:border-blue-500 transition-colors duration-200">
              

              <div className="mb-4">
                  {imageUrl && (
                    <img 
                      src={imageUrl} 
                      alt="재활 부위"
                      className="w-full h-28 object-cover rounded-lg flex-shrink-0 bg-gray-700 mb-2"
                    />
                  )}
                
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">{exercise.name}</h3>
                  <p className="text-gray-400 text-sm mb-3">{exercise.description}</p>
                </div>
              </div>
              
              <div className="grid grid-rows-3 gap-4 mb-4">
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
              
              <div className="mt-4 grid grid-rows-2 gap-2">
                <button
                  onClick={() => addMyExercise(exercise)}
                  disabled={isSaved}
                  className={`w-full flex items-center justify-center p-3 rounded-lg font-medium transition ${
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