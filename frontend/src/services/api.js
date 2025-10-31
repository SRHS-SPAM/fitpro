import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
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
};

// Records API
export const recordsAPI = {
  getRecords: (page = 1, limit = 10) => 
    api.get('/records', { params: { page, limit } }),
  getRecord: (recordId) => api.get(`/records/${recordId}`),
};

export default api;