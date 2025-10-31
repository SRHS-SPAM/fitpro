// 1. BrowserRouter는 이제 main.jsx에 있으므로 여기서 import 할 필요가 없습니다.
import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import ExercisePage from './pages/ExercisePage';
import RecordsPage from './pages/RecordsPage';
import { authAPI } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const response = await authAPI.getCurrentUser();
        setUser(response.data);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('access_token');
      }
    }
    setLoading(false);
  };

  if (loading) {
    // ... (이 부분도 수정할 필요 없습니다)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 2. <BrowserRouter>를 제거하고 바로 <Routes>를 반환합니다.
  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/" /> : <LoginPage setUser={setUser} />
      } />
      <Route path="/register" element={
        user ? <Navigate to="/" /> : <RegisterPage setUser={setUser} />
      } />
      <Route path="/onboarding" element={
        user ? <OnboardingPage user={user} setUser={setUser} /> : <Navigate to="/login" />
      } />
      <Route path="/" element={
        user ? <HomePage user={user} /> : <Navigate to="/login" />
      } />
      <Route path="/exercise/:exerciseId" element={
        user ? <ExercisePage user={user} /> : <Navigate to="/login" />
      } />
      <Route path="/records" element={
        user ? <RecordsPage user={user} /> : <Navigate to="/login" />
      } />
    </Routes>
  );
}

export default App;