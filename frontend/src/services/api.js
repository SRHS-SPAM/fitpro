import axios from 'axios';

// 🔒 환경 변수에서 베이스 URL 가져오기
const API_DOMAIN = import.meta.env.VITE_API_BASE_URL || 
  (window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : 'https://fitner-api-697550966480.asia-northeast3.run.app');

let BASE_URL = API_DOMAIN.endsWith('/api/v1') ? API_DOMAIN : `${API_DOMAIN}/api/v1`;

console.log('🌍 현재 사용 중인 API URL:', BASE_URL);

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
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
  getRecords: (page = 1, limit = 10, params = {}) => 
    api.get('/records', { 
      params: { 
        page, 
        limit,
        ...params
      } 
    }),
  
  // 특정 기록 상세 조회
  getRecord: (recordId) => api.get(`/records/${recordId}`),
  
  // 기록 삭제
  deleteRecord: (recordId) => api.delete(`/records/${recordId}`),
  
  // 통계 조회 (주간/월간/연간)
  getStatistics: (period = 'week') => {
    if (period === 'cumulative') {
      return api.get('/records/statistics/cumulative');
    }
    return api.get('/records/statistics/summary', { 
      params: { period }
    });
  },
};

export default api;