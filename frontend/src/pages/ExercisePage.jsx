import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera } from '@mediapipe/camera_utils';

// ⬇️ [핵심 수정] 와일드카드 임포트 사용 (Fallback 로직과 함께 사용)
import * as MP_Pose from '@mediapipe/pose'; 
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'; 


import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Webcam from 'react-webcam';
import { exerciseAPI } from '../services/api';


const ExercisePage = () => {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  // poseRef는 이제 Pose 인스턴스를 저장합니다.
  const poseRef = useRef(null); 
  const cameraRef = useRef(null);
  
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
  const [isCompleted, setIsCompleted] = useState(false);
  const [guidePoses, setGuidePoses] = useState([]);
  const [completionFeedback, setCompletionFeedback] = useState(null);

  // MediaPipe 초기화 완료 상태
  const [isMediaPipeReady, setIsMediaPipeReady] = useState(false);


  // 운동 정보 불러오기
  useEffect(() => {
    const fetchExercise = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await exerciseAPI.getExercise(exerciseId);
        console.log('Exercise data received:', response.data);
        
        setExercise(response.data);
        
        // silhouette_animation에서 keyframes 추출
        if (response.data.silhouette_animation?.keyframes) {
          const poses = response.data.silhouette_animation.keyframes.map(keyframe => {
            // pose_landmarks를 객체 형태로 변환
            const poseObj = {};
            if (keyframe.pose_landmarks) {
              keyframe.pose_landmarks.forEach((landmark, index) => {
                poseObj[index.toString()] = landmark;
              });
            }
            return poseObj;
          });
          console.log('Processed guide poses:', poses);
          setGuidePoses(poses);
        } else {
          console.log('No silhouette_animation found');
          setGuidePoses([]);
        }
        
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
    if (!isStarted || isPaused || !showGuide || isCompleted || guidePoses.length === 0) return;

    const interval = setInterval(() => {
      setGuideFrame(prev => {
        return (prev + 1) % guidePoses.length; 
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isStarted, isPaused, showGuide, isCompleted, guidePoses]);


  // 완료 데이터 저장
  const saveCompletion = useCallback(async () => {
    const avgScore = totalScore.length > 0 
      ? Math.round(totalScore.reduce((a, b) => a + b, 0) / totalScore.length)
      : 0;
    
    if (!exercise) return;

    try {
      const completionData = {
        completed_sets: currentSet,
        completed_reps: exercise.repetitions,
        average_score: avgScore,
        pain_level_after: 5,
        duration_minutes: Math.max(1, Math.ceil((exercise.duration_seconds - timeRemaining) / 60)),
        score_history: totalScore
      };
      
      console.log('완료 데이터:', completionData);
      
      const response = await exerciseAPI.complete(exerciseId, completionData);
      
      console.log('운동 완료 저장 성공:', response.data);
      
      // ✅ 백엔드에서 받은 피드백 저장
      if (response.data?.feedback) {
        setCompletionFeedback(response.data.feedback);
      }
    } catch (error) {
      console.error('완료 저장 실패:', error.response?.data);
    }
  }, [totalScore, exercise, currentSet, timeRemaining, exerciseId]);

const drawGuideSilhouette = useCallback((guidePose) => {
  const canvas = canvasRef.current;
  if (!canvas || !guidePose) return;

  const ctx = canvas.getContext('2d');
  
  // 디버깅 로그
  // console.log('Drawing guide pose:', guidePose);
  
  const shoulder_left = guidePose["11"];
  const shoulder_right = guidePose["12"];
  const hip_left = guidePose["23"];
  const hip_right = guidePose["24"];

  // 몸통 그리기
  if (shoulder_left && shoulder_right && hip_left && hip_right) {
    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(shoulder_left.x * canvas.width, shoulder_left.y * canvas.height);
    ctx.lineTo(shoulder_right.x * canvas.width, shoulder_right.y * canvas.height);
    ctx.lineTo(hip_right.x * canvas.width, hip_right.y * canvas.height);
    ctx.lineTo(hip_left.x * canvas.width, hip_left.y * canvas.height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 세밀한 팔다리 그리기
  const drawDetailedLimb = (joints) => {
    const hasAllJoints = joints.every(j => guidePose[j]);
    if (!hasAllJoints) {
      if (joints.length >= 3 && joints.slice(0, 3).every(j => guidePose[j])) {
        ctx.lineWidth = 15;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.beginPath();
        ctx.moveTo(guidePose[joints[0]].x * canvas.width, guidePose[joints[0]].y * canvas.height);
        ctx.lineTo(guidePose[joints[1]].x * canvas.width, guidePose[joints[1]].y * canvas.height);
        ctx.lineTo(guidePose[joints[2]].x * canvas.width, guidePose[joints[2]].y * canvas.height);
        ctx.stroke();
      }
      return;
    }

    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.beginPath();
    ctx.moveTo(guidePose[joints[0]].x * canvas.width, guidePose[joints[0]].y * canvas.height);
    
    for (let i = 1; i < joints.length; i++) {
      ctx.lineTo(guidePose[joints[i]].x * canvas.width, guidePose[joints[i]].y * canvas.height);
    }
    ctx.stroke();

    const endJoint = joints[joints.length - 1];
    if (guidePose[endJoint]) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.beginPath();
      ctx.arc(
        guidePose[endJoint].x * canvas.width, 
        guidePose[endJoint].y * canvas.height, 
        8, 
        0, 
        2 * Math.PI
      );
      ctx.fill();
    }
  };

  drawDetailedLimb(["11", "13", "15", "19"]);
  drawDetailedLimb(["12", "14", "16", "20"]);
  drawDetailedLimb(["23", "25", "27", "31"]);
  drawDetailedLimb(["24", "26", "28", "32"]);

  // 머리
  if (shoulder_left && shoulder_right) {
    const neckX = (shoulder_left.x + shoulder_right.x) / 2;
    const neckY = (shoulder_left.y + shoulder_right.y) / 2;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.beginPath();
    ctx.arc(neckX * canvas.width, (neckY - 0.08) * canvas.height, 20, 0, 2 * Math.PI);
    ctx.fill();
  }
}, []);

// ⬇️ Solutions API 결과 구조에 맞춰 results.poseLandmarks를 직접 사용합니다.
const drawSkeleton = useCallback((results) => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = webcamRef.current?.video.videoWidth || 640;
  canvas.height = webcamRef.current?.video.videoHeight || 480;

  // ✅ 전체 캔버스 초기화
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ✅ Transform 적용 (거울 모드)
  ctx.save();
  ctx.scale(-1, 1);
  ctx.translate(-canvas.width, 0);

  // ✅ 1. 가이드 실루엣 먼저 그리기 (transform 적용된 상태에서)
  if (showGuide && !isCompleted && guidePoses.length > 0) {
    if (guideFrame < guidePoses.length && guidePoses[guideFrame]) {
      // console.log('Drawing guide frame:', guideFrame, 'of', guidePoses.length);
      drawGuideSilhouette(guidePoses[guideFrame]);
    }
  }

  // ✅ 2. 사용자 스켈레톤 그리기 (MediaPipe Drawing Utility 사용 권장, 여기서는 수동 유지)
  if (results.poseLandmarks) {
    // MediaPipe drawing_utils를 직접 사용하는 것이 더 간결합니다.
    // drawConnectors(ctx, results.poseLandmarks, MP_Pose.POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
    // drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });
    
    const connections = [
        [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
        [11, 23], [12, 24], [23, 24],
        [23, 25], [25, 27], [24, 26], [26, 28]
    ];
    
    // 연결선 그리기
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
    
    // 관절 점 그리기
    results.poseLandmarks.forEach((landmark) => {
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 6, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  // ✅ Transform 복원
  ctx.restore();
}, [showGuide, isCompleted, guidePoses, guideFrame, drawGuideSilhouette]);

  // 자세 분석 결과
  // ⬇️ Solutions API의 onResults 콜백 스타일 유지
  const onPoseResults = useCallback(async (results) => {
    if (!results.poseLandmarks || isPaused || isCompleted) return;

    drawSkeleton(results);

    // 백엔드 API 호출은 2초 간격으로 유지
    if (Date.now() % 2000 < 100) {
      if (!exercise) return;
      try {
        const landmarks = results.poseLandmarks.map(lm => ({
          x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility
        }));
        
        const response = await exerciseAPI.analyzeRealtime(exerciseId, {
          pose_landmarks: landmarks,
          timestamp_ms: Date.now() % (exercise.duration_seconds * 1000)
        });
        
        setFeedback(response.data.feedback);
        setScore(response.data.score);
        setTotalScore(prev => [...prev, response.data.score]);
        
        if (response.data.is_correct) {
          setCurrentRep(prevRep => {
            const newRep = prevRep + 1;
            if (newRep >= exercise.repetitions) {
              setCurrentSet(prevSet => {
                if (prevSet >= exercise.sets) {
                  setIsCompleted(true);
                  setFeedback('모든 세트 완료! 수고하셨습니다!');
                  saveCompletion();
                  return prevSet;
                } else {
                  setFeedback(`${prevSet}세트 완료! 다음 세트를 시작하세요.`);
                  return prevSet + 1;
                }
              });
              return 0;
            }
            return newRep;
          });
        }
      } catch (error) {
        console.error('자세 분석 실패:', error);
      }
    }
  }, [
    isPaused, 
    isCompleted, 
    drawSkeleton, 
    exercise, 
    exerciseId, 
    saveCompletion 
]);


  // MediaPipe Pose 초기화
  useEffect(() => {
    // exercise 정보가 로드되고 시작 버튼이 눌렸을 때만 실행
    if (!exercise || !isStarted || isCompleted) return;
    
    // 이미 초기화 되었으면 건너뜁니다.
    if (isMediaPipeReady) return;

    const initializePose = async () => {
        try {
            // ⬇️ [핵심 로직] Pose 생성자 추출 시도
            let PoseConstructor = null;
            
            // 1. MP_Pose.Pose로 직접 접근 (이전 시도)
            if (MP_Pose.Pose) {
                PoseConstructor = MP_Pose.Pose;
            } 
            // 2. MP_Pose.default.Pose로 접근 (Vite/Rollup 환경에서 흔한 래핑)
            else if (MP_Pose.default && MP_Pose.default.Pose) {
                PoseConstructor = MP_Pose.default.Pose;
            } 
            // 3. MP_Pose 객체 자체가 Pose 생성자인 경우 (이전 실패한 'import Pose from ...' 형태와 유사)
            else if (typeof MP_Pose === 'function') {
                // 이 경우는 MP_Pose가 Pose 생성자 함수 자체인 경우입니다.
                PoseConstructor = MP_Pose; 
            } else {
                // 4. MP_Pose.default가 생성자 함수인 경우 (최종적인 Fallback)
                if (typeof MP_Pose.default === 'function') {
                    PoseConstructor = MP_Pose.default;
                } else {
                    throw new Error("Could not reliably find MediaPipe Pose constructor.");
                }
            }
            
            if (!PoseConstructor) {
                throw new Error("MediaPipe Pose constructor is missing after all attempts.");
            }
            
            // ⬇️ 추출된 생성자 사용
            const pose = new PoseConstructor({ // <--- PoseConstructor 사용
                locateFile: (file) => {
                    // 필요한 wasm/bin 파일 경로 설정 (CDN 사용)
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
                }
            });

            pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            pose.onResults(onPoseResults); // onResults 콜백 설정
            poseRef.current = pose;
            setIsMediaPipeReady(true); // 초기화 성공

            // 3. 카메라 시작 및 프레임 전송
            if (webcamRef.current && webcamRef.current.video) {
                const camera = new Camera(webcamRef.current.video, {
                    // Solutions API는 onFrame에서 pose.send를 사용합니다.
                    onFrame: async () => {
                        if (poseRef.current && !isPaused && !isCompleted) {
                            try {
                                await poseRef.current.send({ image: webcamRef.current.video });
                            } catch (err) {
                                console.error('Pose send error:', err);
                            }
                        }
                    },
                    width: 640,
                    height: 480
                });
                cameraRef.current = camera;
                camera.start();
            }

        } catch (error) {
            console.error('MediaPipe 초기화 실패:', error);
            // 오류가 발생하면 isStarted를 false로 설정하여 로딩 화면을 우회하고 오류 메시지를 표시
            setIsStarted(false);
            setError('자세 분석 모듈 로드 실패: ' + error.message);
        }
    };

    // isStarted가 true일 때만 초기화 시작
    if (isStarted && !isCompleted && !isMediaPipeReady) {
      initializePose();
    }


    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (poseRef.current) {
        poseRef.current.close(); 
        poseRef.current = null;
      }
    };
  }, [exercise, isStarted, isCompleted, isPaused, onPoseResults, isMediaPipeReady]);


  // 타이머
  useEffect(() => {
    if (!isStarted || isPaused || timeRemaining <= 0 || isCompleted) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsCompleted(true);
          saveCompletion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, isPaused, timeRemaining, isCompleted, saveCompletion]);

  // 수동 종료
  const handleComplete = () => {
    setIsCompleted(true);
    setIsStarted(false);
    saveCompletion();
  };

  // 재시작
  const handleRestart = () => {
    // 클린업 로직
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
      } catch (e) {
        console.error('Camera stop error:', e);
      }
      cameraRef.current = null;
    }
    if (poseRef.current) {
      try {
        poseRef.current.close(); 
      } catch (e) {
        console.error('Pose close error:', e);
      }
      poseRef.current = null;
    }
    
    window.location.reload();
  };

  // 로딩 화면
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
        <div className="text-white text-2xl">운동 정보 로딩 중...</div>
        {isStarted && (
          <div className="text-gray-400 mt-2">AI 모듈 초기화 중...</div>
        )}
      </div>
    );
  }

  // 에러 화면
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
        <div className="text-red-500 text-6xl mb-4"></div>
        <div className="text-white text-2xl mb-2">로딩 실패</div>
        <div className="text-gray-400 text-center max-w-md">{error}</div>
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-3 rounded-lg"
          >
            다시 시도
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-3 rounded-lg"
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
        <button
            onClick={() => navigate('/')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-3 rounded-lg ml-4"
          >
            홈으로
          </button>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 bg-gray-800 bg-opacity-80 hover:bg-opacity-100 px-4 py-2 rounded-lg transition backdrop-blur-sm mb-2"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>나가기</span>
      </button>

      <div className="max-w-6xl mx-auto mb-6 pt-2">
        <h1 className="text-3xl font-bold mb-2">{exercise.name}</h1>
        <p className="text-gray-400">{exercise.description}</p>
        {isStarted && (
          <div className="bg-blue-900 bg-opacity-30 border border-blue-500 text-blue-100 p-2 rounded-lg mt-2 text-center text-sm">
            현재 세트: {currentSet} / {exercise.sets} | 반복: {currentRep} / {exercise.repetitions}
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '70vh' }}>
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

            {isCompleted && (
              <div className="absolute inset-0 bg-black bg-opacity-95 flex flex-col items-center justify-center z-50 p-4 space-y-4 ">
                {/* 스크롤이 가능하도록 내부 div를 만듭니다. */}
                {/* <div className="text-center space-y-4 flex flex-col items-center max-w-lg w-full py-8"> */}
                  <h2 className="text-4xl font-bold text-white mb-1">운동 완료!</h2>
                  <p className="text-xl text-gray-300 mb-4">
                    {exercise.sets}세트 × {exercise.repetitions}회 달성
                  </p>
                  
                  {/* 평균 점수 카드 */}
                  <div className="bg-gray-800 rounded-lg p-5 w-full">
                    <div className="text-3xl font-bold text-blue-400 mb-2">
                      {totalScore.length > 0 
                        ? Math.round(totalScore.reduce((a, b) => a + b, 0) / totalScore.length)
                        : 0}점
                    </div>
                    <p className="text-gray-400">평균 점수</p>
                  </div>

                  {/* ===== ⬇️ 여기가 수정된 AI 피드백 섹션입니다 ⬇️ ===== */}
                  {completionFeedback && (
                    <div className="bg-gray-800 rounded-lg p-6 w-full text-left space-y-4">
                      <h3 className="text-xl font-semibold text-white mb-3 text-center">
                        AI 종합 피드백
                      </h3>
                      
                      {/* 1. 종합 평가 */}
                      {completionFeedback.summary && (
                        <div>
                          <h4 className="font-semibold text-blue-400 mb-1">종합 평가</h4>
                          <p className="text-gray-300 whitespace-pre-line">
                            {completionFeedback.summary}
                          </p>
                        </div>
                      )}

                      {/* 2. 잘한 점 */}
                      {completionFeedback.strengths && completionFeedback.strengths.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-green-400 mb-1">👍 잘한 점</h4>
                          <ul className="list-disc list-inside text-gray-300 space-y-1">
                            {completionFeedback.strengths.map((item, index) => (
                              <li key={index}>{item}</li>
                              ))}
                          </ul>
                        </div>
                      )}

                      {/* 3. 개선할 점 */}
                      {completionFeedback.improvements && completionFeedback.improvements.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-yellow-400 mb-1">✏️ 개선할 점</h4>
                          <ul className="list-disc list-inside text-gray-300 space-y-1">
                            {completionFeedback.improvements.map((item, index) => (
                              <li key={index}>{item}</li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {/* ===== ⬆️ 여기까지 ⬆️ ===== */}

                  {/* 버튼 */}
                  <div className="flex gap-4 w-full pt-3">
                    <button
                      onClick={handleRestart}
                      className="flex-1 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-semibold transition"
                    >
                      다시 하기
                    </button>
                    <button
                      onClick={() => navigate('/')}
                      className="flex-1 px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-lg font-semibold transition"
                    >
                      홈으로
                    </button>
                  </div>
                </div>
              // </div>
            )}

            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 px-6 py-3 rounded-lg">
              <p className="text-lg text-center">{feedback}</p>
              {showGuide && !isCompleted && (
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
            ) : isCompleted ? (
              <div className="flex-1 flex gap-4">
                <button
                  onClick={handleRestart}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-lg text-lg font-semibold transition"
                >
                  다시 하기
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-4 rounded-lg text-lg font-semibold transition"
                >
                  종료
                </button>
              </div>
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