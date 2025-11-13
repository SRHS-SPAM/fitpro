import axios from 'axios';

// 🔒 런타임 환경에 따라 API URL 자동 설정
function getApiBaseUrl() {
  // 1. 환경 변수가 있으면 사용
  if (import.meta.env.VITE_API_BASE_URL) {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl}/api/v1`;
  }
  
  // 2. 환경 변수가 없으면 호스트명으로 판단
  const isLocal = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';
  
  if (isLocal) {
    return 'http://localhost:8000/api/v1';
  }
  
  // 3. 배포 환경에서는 HTTPS 강제 ⭐ 여기를 확인!
  return 'https://fitner-api-697550966480.asia-northeast3.run.app/api/v1';
  //     ^^^^^^ http가 아니라 https여야 합니다!
}

const BASE_URL = getApiBaseUrl();

console.log('🌍 현재 사용 중인 API URL:', BASE_URL);
console.log('📍 현재 호스트:', window.location.hostname);
console.log('🔐 프로토콜:', window.location.protocol);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 100000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor - 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('📤 API 요청:', config.method.toUpperCase(), config.baseURL + config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - 에러 처리
api.interceptors.response.use(
  (response) => {
    console.log('✅ API 응답:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API 에러:', error.config?.url, error.message);
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/users/me'),
  updateBodyCondition: (data) => api.put('/users/me/body-condition', data),
};

// Exercise API
export const exerciseAPI = {
  generate: (data) => api.post('/exercises/generate', data),
  getExercise: (exerciseId) => api.get(`/exercises/${exerciseId}`),
  analyzeRealtime: (exerciseId, data) => 
    api.post(`/exercises/${exerciseId}/analyze-realtime`, data),
  complete: (exerciseId, data) => 
    api.post(`/exercises/${exerciseId}/complete`, data),
  
  // 내 운동 목록 조회
  getMyExercises: () => api.get('/exercises/my-exercises'),
  
  // 운동 템플릿 삭제
  deleteExercise: (exerciseId) => api.delete(`/exercises/${exerciseId}`),
  
  // ✅ 새로 추가: 운동 저장
  saveExercise: (exerciseId) => api.post(`/exercises/${exerciseId}/save`),
};

// Records API
export const recordsAPI = {
  // 기록 목록 조회 (페이지네이션)
  getRecords: (page = 1, limit = 10, params = {}) => {
    const queryParams = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      )
    });
    return api.get(`/records?${queryParams.toString()}`);
  },
  
  // 특정 기록 상세 조회
  getRecord: (recordId) => api.get(`/records/${recordId}`),
  
  // 기록 삭제
  deleteRecord: (recordId) => api.delete(`/records/${recordId}`),
  
  // 통계 조회 (주간/월간/연간)
  getStatistics: (period = 'week') => {
    if (period === 'cumulative') {
      return api.get('/records/statistics/cumulative');
    }
    const queryParams = new URLSearchParams({ period });
    return api.get(`/records/statistics/summary?${queryParams.toString()}`);
  },
};

export default api;