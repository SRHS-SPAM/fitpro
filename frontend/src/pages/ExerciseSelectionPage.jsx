import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
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
  '허벅지': '/pain/leg.png',
  '엉덩이': '/pain/leg.png',
  '고관절': '/pain/leg.png',
  '어깨': '/pain/arm.png',
  '가슴': '/pain/arm.png',
  '등': '/pain/waist.png',
};

// 로직 수정: 배열의 첫 번째 요소만 확인
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
      const response = await api.get(
        '/exercises/recommendations',
        {
          params: { limit: 4 }
        }
      );

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
    switch (intensity?.toLowerCase()) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      case 'stretching': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // --- 로딩 및 에러 화면 (기존 요청대로 유지) ---
  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mb-4 mx-auto"></div>
          {/* ⚠️ 텍스트 색상을 검은색 배경에 맞게 회색/파란색에서, 흰색 배경에 맞게 text-black으로 변경 */}
          <p className="text-black text-xl">AI가 맞춤 운동을 추천 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          {/* ⚠️ 텍스트 색상 변경 */}
          <h2 className="text-black text-2xl mb-2">운동 추천 실패</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          {/* ⚠️ 버튼 색상 초록색으로 변경 */}
          <button onClick={() => navigate('/')} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg">홈으로 돌아가기</button>
        </div>
      </div>
    );
  }
  // --- 로딩 및 에러 화면 끝 ---

  return (
    // 1. 전체 배경: bg-white, text-black
    <div className="min-h-screen bg-white text-black p-3 pb-24">
      {/* 2. '나가기' 버튼: 어두운 배경에서 밝은 배경으로 변경 */}
      <button
        onClick={() => navigate('/')}
        className="mb-3 flex items-center gap-2 bg-gray-200 text-black hover:bg-gray-300 px-4 py-2 rounded-lg transition"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>나가기</span>
      </button>

      <div className="max-w-4xl mx-auto pt-2 pb-8">
        <div className="flex items-center justify-between mb-3"> {/* justify-between을 위해 flex 추가 */}
          <div className="flex-1">
            {/* ⚠️ 텍스트 색상 변경: text-white -> text-black */}
            <h1 className="text-4xl font-bold mb-3 text-black">AI 맞춤 운동 추천</h1>
            <p className="text-gray-600 text-lg mb-5">당신의 상태에 맞는 운동을 선택하세요</p>
          </div>

          {/* 3. '다른 운동 추천받기' 버튼: 그대로 유지 (원래 초록색이었음) */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
              refreshing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' // 밝은 테마에 맞게 색상 변경
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? '생성 중...' : '다른 운동 추천받기'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4"> {/* col-2 -> col-1/2로 변경하여 반응형 적용 */}
        {exercises.map((exercise) => {

          console.log('추천된 운동 객체:', exercise);
          console.log('타겟 부위 (target_parts):', exercise.target_parts);

          // 2. isSaved 계산
          const isSaved = savedExerciseIds.has(exercise.exercise_id);

          // 3. ✅✅✅ 바로 이 부분입니다! ✅✅✅
          // exercise.target_parts가 정확히 전달되는지 확인
          const imageUrl = getRehabImage(exercise.target_parts);

          return (
            // 4. 카드 배경: bg-gray-800 -> bg-gray-100
            <div key={exercise.exercise_id} className="bg-gray-100 rounded-xl p-4 border border-gray-200 hover:border-green-500 transition-colors duration-200">

              <div className="mb-4">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="재활 부위"
                    // 이미지 배경: bg-gray-700 -> bg-white
                    className="w-full h-36 object-cover rounded-lg flex-shrink-0 bg-white mb-3"
                  />
                )}

                <div className="flex-1">
                  {/* ⚠️ 텍스트 색상 변경 */}
                  <h3 className="text-xl font-bold mb-2 text-black">{exercise.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{exercise.description}</p>
                </div>
              </div>

              {/* 5. 정보 카드 배경: bg-gray-900 -> bg-white + border */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {/* 시간 정보 */}
                <div className="bg-white rounded-lg p-3 border border-gray-300">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-500">시간</span>
                  </div>
                  {/* ⚠️ 텍스트 색상 변경 */}
                  <p className="text-lg font-semibold text-black">{exercise.duration_minutes}분</p>
                </div>
                {/* 강도 정보 */}
                <div className="bg-white rounded-lg p-3 border border-gray-300">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-500">강도</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getIntensityColor(exercise.intensity)}`}></span>
                    {/* ⚠️ 텍스트 색상 변경 */}
                    <p className="text-lg font-semibold capitalize text-black">{exercise.intensity}</p>
                  </div>
                </div>
              </div>

              {/* 6. 버튼 영역 스타일 변경 */}
              <div className="mt-4 grid grid-cols-2 gap-2"> {/* grid-rows-2 -> grid-cols-2로 변경하여 버튼 가로 배열 */}
                {/* '저장' 버튼: 배경색 및 텍스트 색상 변경 */}
                <button
                  onClick={() => addMyExercise(exercise)}
                  disabled={isSaved}
                  className={`w-full flex items-center justify-center p-3 rounded-lg font-medium transition ${
                    isSaved
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed' // 저장됨 상태 색상 변경
                      : 'bg-gray-300 text-black hover:bg-gray-400' // 일반 상태 색상 변경
                    }`}
                >
                  {isSaved ? <CheckCircle className="w-5 h-5 mr-2" /> : <PlusCircle className="w-5 h-5 mr-2" />}
                  {isSaved ? '저장됨' : '저장'}
                </button>
                {/* '바로 시작' 버튼: 파란색 -> 초록색으로 변경 */}
                <button
                  onClick={() => navigate(`/exercise/${exercise.exercise_id}`)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg font-semibold transition"
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
          <p className="text-gray-500 text-lg">추천할 운동이 없습니다.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
          >
            홈으로 돌아가기
          </button>
        </div>
      )}
    </div>
  );
};

export default ExerciseSelectionPage;