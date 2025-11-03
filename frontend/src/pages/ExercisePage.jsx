import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { exerciseAPI } from '../services/api';
import CameraView from '../components/camera/CameraView';
import ExerciseDemo from '../components/exercise/ExerciseDemo';
import ExerciseFeedback from '../components/exercise/ExerciseFeedback';
import { Play, Pause, X, CheckCircle, AlertCircle, Activity } from 'lucide-react'; // Activity 아이콘 추가

function ExercisePage({ user }) { // user prop을 받도록 수정
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [scores, setScores] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState('');

  // ⭐ 1. 운동 시작 전 통증 수준을 저장할 상태 추가
  // 사용자의 현재 통증 수준을 기본값으로 가져옵니다.
  const [painLevelBefore, setPainLevelBefore] = useState(user?.body_condition?.pain_level || 5);
  
  // ⭐ 운동 완료 시 '운동 후' 통증을 물어보기 위한 상태 (선택 사항)
  // 지금은 간단하게 3으로 고정하겠습니다.
  const [painLevelAfter, setPainLevelAfter] = useState(3);

  useEffect(() => {
    loadExercise();
  }, [exerciseId]);

  const loadExercise = async () => {
    try {
      const response = await exerciseAPI.getExercise(exerciseId);
      setExercise(response.data);
    } catch (err) {
      setError('운동 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    setIsStarted(true);
    setShowCamera(true);
  };

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
  };

  const handlePoseDetected = async (landmarks) => {
    if (isPaused || !isStarted) return;
    try {
      const response = await exerciseAPI.analyzeRealtime(exerciseId, {
        pose_landmarks: landmarks,
        timestamp_ms: Date.now()
      });
      setFeedback(response.data);
      if (response.data.score) {
        setScores(prevScores => [...prevScores, response.data.score]);
      }
      // ... (자동 카운팅 로직) ...
    } catch (err) {
      console.error('Pose analysis failed:', err);
    }
  };

  const handleComplete = async () => {
    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    try {
      // ⭐ 3. pain_level_before와 pain_level_after 값을 API로 전송
      await exerciseAPI.complete(exerciseId, {
        completed_sets: currentSet,
        completed_reps: currentRep,
        average_score: Math.round(averageScore),
        pain_level_before: painLevelBefore, // 저장해뒀던 '운동 전' 통증 값
        pain_level_after: painLevelAfter,     // '운동 후' 통증 값 (지금은 3으로 고정)
        duration_minutes: Math.round(exercise.duration_seconds / 60)
      });
      navigate('/records');
    } catch (err) {
      setError('운동 완료 처리에 실패했습니다.');
    }
  };

  const handleExit = () => {
    if (confirm('운동을 종료하시겠습니까?')) {
      navigate('/');
    }
  };

  // ... (loading, error 화면은 동일) ...

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* ... (헤더 부분은 동일) ... */}

      <div className="p-4 space-y-4">
        {!isStarted ? (
          /* 시작 전 화면 */
          <div className="bg-gray-800 rounded-2xl p-6">
            {/* ... (운동 정보, 방법, 주의사항 등 기존 UI는 동일) ... */}

            {/* ⭐ 2. 운동 시작 전 통증 수준을 묻는 UI 추가 */}
            <div className="mb-8">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-400" />
                운동 시작 전 통증 수준
              </h3>
              <div className="onboarding-slider-container"> {/* OnboardingPage 스타일 재사용 */}
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={painLevelBefore}
                  onChange={(e) => setPainLevelBefore(parseInt(e.target.value))}
                  className="onboarding-slider"
                />
                <div className="onboarding-slider-labels text-white">
                  <span>0</span>
                  <span className="onboarding-slider-value">{painLevelBefore}</span>
                  <span>10</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full py-4 bg-primary-500 rounded-xl font-bold text-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-6 h-6" />
              운동 시작하기
            </button>
          </div>
        ) : (
          /* 운동 중 화면 */
          <>
            {/* ... (운동 중 UI는 동일) ... */}
          </>
        )}
      </div>
    </div>
  );
}

export default ExercisePage;