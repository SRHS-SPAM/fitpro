import { useEffect, useRef, useState } from 'react';
import { POSE_CONNECTIONS } from '@mediapipe/pose';

function ExerciseDemo({ animation, isPaused }) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const currentFrameRef = useRef(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!animation || !animation.keyframes || animation.keyframes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 500;

    const animate = (timestamp) => {
      if (isPaused) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = timestamp - lastTimeRef.current;
      if (elapsed < 33) { // ~30 FPS
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      lastTimeRef.current = timestamp;

      // 현재 프레임 계산
      const totalFrames = animation.keyframes.length;
      currentFrameRef.current = (currentFrameRef.current + 1) % totalFrames;
      const currentKeyframe = animation.keyframes[currentFrameRef.current];

      // 캔버스 클리어
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 배경
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (currentKeyframe && currentKeyframe.pose_landmarks) {
        drawSkeleton(ctx, currentKeyframe.pose_landmarks, canvas.width, canvas.height);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animation, isPaused]);

  const drawSkeleton = (ctx, landmarks, width, height) => {
    // 좌표를 캔버스 크기에 맞게 변환
    const points = landmarks.map(lm => ({
      x: lm.x * width,
      y: lm.y * height,
      z: lm.z,
      visibility: lm.visibility || 1
    }));

    // 연결선 그리기
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;

    POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const start = points[startIdx];
      const end = points[endIdx];

      if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    });

    // 관절 포인트 그리기
    ctx.fillStyle = '#60a5fa';
    points.forEach(point => {
      if (point.visibility > 0.5) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // 프레임 정보 표시
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.fillText(
      `프레임 ${currentFrameRef.current + 1}/${animation.keyframes.length}`,
      10,
      height - 10
    );
  };

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden">
      <div className="p-2 bg-gray-700">
        <p className="text-sm text-gray-300 text-center font-medium">
          따라하기 가이드
        </p>
      </div>
      <div className="flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto rounded-lg"
        />
      </div>
      {isPaused && (
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-gray-800 px-4 py-2 rounded-full">
            <p className="text-white text-sm">일시정지</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExerciseDemo;