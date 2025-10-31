import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { exerciseAPI } from '../services/api';
import CameraView from '../components/camera/CameraView';
import ExerciseDemo from '../components/exercise/ExerciseDemo';
import ExerciseFeedback from '../components/exercise/ExerciseFeedback';
import { Play, Pause, X, CheckCircle, AlertCircle } from 'lucide-react';

function ExercisePage() {
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
        setScores([...scores, response.data.score]);
      }

      // 자동 카운팅 로직 (실제로는 백엔드에서 판단)
      if (response.data.is_correct) {
        setCurrentRep(prev => {
          const newRep = prev + 1;
          if (newRep >= exercise.repetitions) {
            setCurrentSet(s => s + 1);
            return 0;
          }
          return newRep;
        });
      }
    } catch (err) {
      console.error('Pose analysis failed:', err);
    }
  };

  const handleComplete = async () => {
    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    try {
      await exerciseAPI.complete(exerciseId, {
        completed_sets: currentSet,
        completed_reps: currentRep,
        average_score: Math.round(averageScore),
        pain_level_after: 3,
        duration_minutes: exercise.duration_seconds / 60
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">운동 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            오류 발생
          </h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-primary-500 text-white rounded-lg font-medium"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 헤더 */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-lg font-bold truncate">{exercise.name}</h1>
          <p className="text-sm text-gray-400">
            세트 {currentSet}/{exercise.sets} · 
            반복 {currentRep}/{exercise.repetitions}
          </p>
        </div>
        <button
          onClick={handleExit}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="p-4 space-y-4">
        {!isStarted ? (
          /* 시작 전 화면 */
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">{exercise.name}</h2>
              <p className="text-gray-400">{exercise.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary-400">{exercise.sets}</div>
                <div className="text-sm text-gray-400">세트</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary-400">{exercise.repetitions}</div>
                <div className="text-sm text-gray-400">반복</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary-400">
                  {Math.floor(exercise.duration_seconds / 60)}
                </div>
                <div className="text-sm text-gray-400">분</div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold mb-3">운동 방법</h3>
              <ol className="space-y-2">
                {exercise.instructions.map((instruction, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-sm">
                      {idx + 1}
                    </span>
                    <span className="text-gray-300">{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>

            {exercise.safety_warnings?.length > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-yellow-400 mb-2">⚠️ 주의사항</h3>
                <ul className="space-y-1">
                  {exercise.safety_warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm text-yellow-200">• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

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
            {/* 데모 애니메이션 */}
            <div className="bg-gray-800 rounded-2xl overflow-hidden">
              <ExerciseDemo
                animation={exercise.silhouette_animation}
                isPaused={isPaused}
              />
            </div>

            {/* 카메라 뷰 */}
            {showCamera && (
              <div className="bg-gray-800 rounded-2xl overflow-hidden">
                <CameraView
                  onPoseDetected={handlePoseDetected}
                  isPaused={isPaused}
                />
              </div>
            )}

            {/* 피드백 */}
            {feedback && (
              <ExerciseFeedback feedback={feedback} />
            )}

            {/* 컨트롤 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={handlePauseToggle}
                className="flex-1 py-4 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                {isPaused ? (
                  <>
                    <Play className="w-5 h-5" />
                    재개
                  </>
                ) : (
                  <>
                    <Pause className="w-5 h-5" />
                    일시정지
                  </>
                )}
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 py-4 bg-green-600 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                완료
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ExercisePage;