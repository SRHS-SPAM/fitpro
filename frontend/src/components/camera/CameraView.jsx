import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Pose } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera, CameraOff } from 'lucide-react';

function CameraView({ onPoseDetected, isPaused }) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState('');
  const lastSendTime = useRef(0);

  useEffect(() => {
    initializePose();
    return () => {
      if (poseRef.current) {
        poseRef.current.close();
      }
    };
  }, []);

  const initializePose = async () => {
    try {
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

      pose.onResults(onResults);
      poseRef.current = pose;
    } catch (err) {
      setError('Pose 모델 초기화 실패');
      console.error(err);
    }
  };

  const onResults = (results) => {
    if (!canvasRef.current || !results.poseLandmarks) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = results.image.width;
    canvas.height = results.image.height;

    // 카메라 이미지 그리기
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    // 랜드마크 그리기
    if (results.poseLandmarks) {
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 4
      });
      drawLandmarks(ctx, results.poseLandmarks, {
        color: '#FF0000',
        lineWidth: 2,
        radius: 6
      });
    }

    ctx.restore();

    // 2초마다 백엔드로 전송
    const now = Date.now();
    if (now - lastSendTime.current > 2000 && !isPaused) {
      lastSendTime.current = now;
      
      const landmarks = results.poseLandmarks.map(lm => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility
      }));

      onPoseDetected(landmarks);
    }
  };

  const detectPose = async () => {
    if (
      !isPaused &&
      webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4 &&
      poseRef.current
    ) {
      const video = webcamRef.current.video;
      await poseRef.current.send({ image: video });
    }
    requestAnimationFrame(detectPose);
  };

  useEffect(() => {
    if (cameraReady && poseRef.current) {
      detectPose();
    }
  }, [cameraReady]);

  if (error) {
    return (
      <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <CameraOff className="w-12 h-12 text-red-400 mx-auto mb-2" />
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored={true}
        onUserMedia={() => setCameraReady(true)}
        onUserMediaError={() => setError('카메라 접근 권한이 필요합니다')}
        videoConstraints={{
          width: 640,
          height: 480,
          facingMode: 'user'
        }}
        className="absolute inset-0 w-full h-full object-cover hidden"
      />
      
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {!cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2 animate-pulse" />
            <p className="text-gray-400">카메라 준비 중...</p>
          </div>
        </div>
      )}

      {isPaused && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 px-6 py-3 rounded-full">
            <p className="text-white font-medium">일시정지</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CameraView;