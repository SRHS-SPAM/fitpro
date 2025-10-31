import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

export class PoseDetectionService {
  constructor() {
    this.pose = null;
    this.camera = null;
    this.onResults = null;
  }

  async initialize(videoElement, onResultsCallback) {
    this.onResults = onResultsCallback;

    // MediaPipe Pose 초기화
    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.pose.onResults((results) => {
      if (this.onResults) {
        this.onResults(results);
      }
    });

    // 카메라 초기화
    if (videoElement) {
      this.camera = new Camera(videoElement, {
        onFrame: async () => {
          await this.pose.send({ image: videoElement });
        },
        width: 640,
        height: 480
      });
    }

    return this;
  }

  start() {
    if (this.camera) {
      this.camera.start();
    }
  }

  stop() {
    if (this.camera) {
      this.camera.stop();
    }
  }

  close() {
    this.stop();
    if (this.pose) {
      this.pose.close();
    }
  }

  // 랜드마크를 백엔드 전송 형식으로 변환
  formatLandmarks(landmarks) {
    if (!landmarks || landmarks.length === 0) return null;

    return landmarks.map(landmark => ({
      x: landmark.x,
      y: landmark.y,
      z: landmark.z,
      visibility: landmark.visibility
    }));
  }
}

export default PoseDetectionService;