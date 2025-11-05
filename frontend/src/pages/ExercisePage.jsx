import React, { useState, useEffect, useRef } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { Pose } from '@mediapipe/pose';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Webcam from 'react-webcam';
import axios from 'axios';

const ExercisePage = () => {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(0);
  const [feedback, setFeedback] = useState('준비하세요');
  const [score, setScore] = useState(100);
  const [totalScore, setTotalScore] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showGuide, setShowGuide] = useState(true);
  const [guideFrame, setGuideFrame] = useState(0);

  // 운동별 가이드 포즈 데이터 (예시 - 실제로는 백엔드에서 받아와야 함)
  const guidePoses = {
    squat: [
      // 스쿼트 시작 자세
      {
        11: { x: 0.4, y: 0.3 }, 12: { x: 0.6, y: 0.3 },
        13: { x: 0.35, y: 0.5 }, 14: { x: 0.65, y: 0.5 },
        15: { x: 0.3, y: 0.7 }, 16: { x: 0.7, y: 0.7 },
        23: { x: 0.42, y: 0.6 }, 24: { x: 0.58, y: 0.6 },
        25: { x: 0.4, y: 0.8 }, 26: { x: 0.6, y: 0.8 },
        27: { x: 0.38, y: 0.95 }, 28: { x: 0.62, y: 0.95 }
      },
      // 스쿼트 내려간 자세
      {
        11: { x: 0.4, y: 0.4 }, 12: { x: 0.6, y: 0.4 },
        13: { x: 0.32, y: 0.55 }, 14: { x: 0.68, y: 0.55 },
        15: { x: 0.25, y: 0.7 }, 16: { x: 0.75, y: 0.7 },
        23: { x: 0.42, y: 0.75 }, 24: { x: 0.58, y: 0.75 },
        25: { x: 0.35, y: 0.85 }, 26: { x: 0.65, y: 0.85 },
        27: { x: 0.33, y: 0.95 }, 28: { x: 0.67, y: 0.95 }
      }
    ],
    plank: [
      {
        11: { x: 0.35, y: 0.4 }, 12: { x: 0.65, y: 0.4 },
        13: { x: 0.25, y: 0.45 }, 14: { x: 0.75, y: 0.45 },
        15: { x: 0.2, y: 0.5 }, 16: { x: 0.8, y: 0.5 },
        23: { x: 0.38, y: 0.55 }, 24: { x: 0.62, y: 0.55 },
        25: { x: 0.35, y: 0.75 }, 26: { x: 0.65, y: 0.75 },
        27: { x: 0.33, y: 0.9 }, 28: { x: 0.67, y: 0.9 }
      }
    ]
  };

  // 운동 정보 불러오기
  useEffect(() => {
    const fetchExercise = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('access_token');
        console.log('운동 정보 요청 중... ID:', exerciseId);
        
        const response = await axios.get(
          `http://localhost:8000/api/v1/exercises/${exerciseId}`,
          { 
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          }
        );
        
        console.log('운동 정보 응답:', response.data);
        setExercise(response.data);
        setTimeRemaining(response.data.duration_seconds);
        setLoading(false);
      } catch (error) {
        console.error('운동 정보 로드 실패:', error);
        setError(error.response?.data?.message || error.message || '운동 정보를 불러올 수 없습니다');
        setLoading(false);
      }
    };

    if (exerciseId) {
      fetchExercise();
    }
  }, [exerciseId]);

  // 가이드 프레임 애니메이션
  useEffect(() => {
    if (!isStarted || isPaused || !showGuide) return;

    const interval = setInterval(() => {
      setGuideFrame(prev => {
        const exerciseType = exercise?.name?.toLowerCase() || 'squat';
        const poses = guidePoses[exerciseType] || guidePoses.squat;
        return (prev + 1) % poses.length;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isStarted, isPaused, showGuide, exercise]);

  // MediaPipe Pose 초기화
  useEffect(() => {
    if (!exercise || !isStarted) return;

    const pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults(onPoseResults);
    poseRef.current = pose;

    if (webcamRef.current && webcamRef.current.video) {
      const camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (poseRef.current && !isPaused) {
            await poseRef.current.send({ image: webcamRef.current.video });
          }
        },
        width: 640,
        height: 480
      });
      camera.start();
    }

    return () => {
      if (poseRef.current) {
        poseRef.current.close();
      }
    };
  }, [exercise, isStarted, isPaused]);

  // 자세 분석 결과 처리
  const onPoseResults = async (results) => {
    if (!results.poseLandmarks || isPaused) return;

    drawSkeleton(results);

    if (Date.now() % 2000 < 100) {
      try {
        const token = localStorage.getItem('access_token');
        const landmarks = results.poseLandmarks.map(lm => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: lm.visibility
        }));

        const response = await axios.post(
          `http://localhost:8000/api/v1/exercises/${exerciseId}/analyze-realtime`,
          {
            pose_landmarks: landmarks,
            timestamp_ms: Date.now() % (exercise.duration_seconds * 1000)
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setFeedback(response.data.feedback);
        setScore(response.data.score);
        setTotalScore(prev => [...prev, response.data.score]);

        if (response.data.is_correct && currentRep < exercise.repetitions) {
          setCurrentRep(prev => prev + 1);
        }
      } catch (error) {
        console.error('자세 분석 실패:', error);
      }
    }
  };

  // 스켈레톤 그리기 (사용자 + 가이드)
  const drawSkeleton = (results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 640;
    canvas.height = 480;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const connections = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
      [11, 23], [12, 24], [23, 24],
      [23, 25], [25, 27], [24, 26], [26, 28]
    ];

    // 가이드 실루엣 그리기
    if (showGuide) {
      const exerciseType = exercise?.name?.toLowerCase() || 'squat';
      const poses = guidePoses[exerciseType] || guidePoses.squat;
      const guidePose = poses[guideFrame];

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.lineWidth = 4;

      connections.forEach(([start, end]) => {
        const startPoint = guidePose[start];
        const endPoint = guidePose[end];

        if (startPoint && endPoint) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
          ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
          ctx.stroke();
        }
      });

      Object.values(guidePose).forEach((landmark) => {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.7)';
        ctx.beginPath();
        ctx.arc(
          landmark.x * canvas.width,
          landmark.y * canvas.height,
          7,
          0,
          2 * Math.PI
        );
        ctx.fill();
      });
    }

    // 사용자 실루엣 그리기
    if (results.poseLandmarks) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;

      connections.forEach(([start, end]) => {
        const startPoint = results.poseLandmarks[start];
        const endPoint = results.poseLandmarks[end];

        if (startPoint && endPoint) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
          ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
          ctx.stroke();
        }
      });

      results.poseLandmarks.forEach((landmark) => {
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(
          landmark.x * canvas.width,
          landmark.y * canvas.height,
          6,
          0,
          2 * Math.PI
        );
        ctx.fill();
      });
    }

    ctx.restore();
  };

  // 타이머
  useEffect(() => {
    if (!isStarted || isPaused || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, isPaused, timeRemaining]);

  // 운동 완료
  const handleComplete = async () => {
    setIsStarted(false);
    
    const avgScore = totalScore.reduce((a, b) => a + b, 0) / totalScore.length || 0;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `http://localhost:8000/api/v1/exercises/${exerciseId}/complete`,
        {
          completed_sets: currentSet,
          completed_reps: currentRep,
          average_score: Math.round(avgScore),
          pain_level_after: 0,
          duration_minutes: Math.ceil((exercise.duration_seconds - timeRemaining) / 60)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`운동 완료!\n점수: ${response.data.overall_score}\n${response.data.feedback.summary}`);
      navigate('/');
    } catch (error) {
      console.error('운동 완료 저장 실패:', error);
    }
  };

  // 로딩 화면
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
        <div className="text-white text-2xl">운동 정보 로딩 중...</div>
        <div className="text-gray-400 text-sm mt-2">ID: {exerciseId}</div>
      </div>
    );
  }

  // 에러 화면
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <div className="text-white text-2xl mb-2">로딩 실패</div>
        <div className="text-gray-400 text-center max-w-md">{error}</div>
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
          >
            다시 시도
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-2xl">운동 정보를 찾을 수 없습니다</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 bg-gray-800 bg-opacity-80 hover:bg-opacity-100 px-4 py-2 rounded-lg transition backdrop-blur-sm"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>나가기</span>
      </button>
      <div className="max-w-6xl mx-auto mb-6 pt-2">
        <h1 className="text-3xl font-bold mb-2">{exercise.name}</h1>
        <p className="text-gray-400">{exercise.description}</p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
            <Webcam
              ref={webcamRef}
              className="absolute top-0 left-0 w-full h-full object-cover"
              mirrored={true}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
            />
            
            <div className="absolute top-4 left-4 bg-black bg-opacity-70 px-4 py-2 rounded-lg">
              <div className="text-4xl font-bold">{score}</div>
              <div className="text-sm text-gray-400">점수</div>
            </div>

            <div className="absolute top-4 right-4 bg-black bg-opacity-70 px-4 py-2 rounded-lg">
              <div className="text-2xl font-mono">
                {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
              </div>
            </div>

            <button
              onClick={() => setShowGuide(!showGuide)}
              className="absolute top-20 right-4 bg-black bg-opacity-70 p-3 rounded-lg hover:bg-opacity-90 transition"
            >
              {showGuide ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
            </button>

            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 px-6 py-3 rounded-lg">
              <p className="text-lg text-center">{feedback}</p>
              {showGuide && (
                <p className="text-sm text-blue-400 text-center mt-1">
                  파란색 가이드를 따라하세요
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            {!isStarted ? (
              <button
                onClick={() => setIsStarted(true)}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-4 rounded-lg text-lg font-semibold transition"
              >
                운동 시작
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-4 rounded-lg text-lg font-semibold transition"
                >
                  {isPaused ? '재개' : '일시정지'}
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4 rounded-lg text-lg font-semibold transition"
                >
                  종료
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">진행 상황</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>세트</span>
                  <span>{currentSet} / {exercise.sets}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${(currentSet / exercise.sets) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>반복</span>
                  <span>{currentRep} / {exercise.repetitions}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${(currentRep / exercise.repetitions) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">운동 지침</h3>
            <ol className="space-y-2 text-sm text-gray-300">
              {exercise.instructions.map((instruction, index) => (
                <li key={index} className="flex">
                  <span className="font-semibold mr-2">{index + 1}.</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-red-400">⚠️ 주의사항</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              {exercise.safety_warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExercisePage;