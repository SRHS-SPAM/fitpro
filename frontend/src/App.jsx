import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import ExercisePage from './pages/ExercisePage';
import RecordsPage from './pages/RecordsPage';
import RecordDetailPage from './pages/RecordDetailPage';
import InfoPage from './pages/InfoPage';
import ExerciseSelectionPage from './pages/ExerciseSelectionPage';
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

  // --- 추가된 로그아웃 핸들러 ---
  const handleLogout = () => {
    localStorage.removeItem('access_token'); // 로컬 스토리지에서 토큰 제거
    setUser(null); // 앱의 user 상태를 null로 업데이트하여 로그아웃 처리
  };
  // --- 여기까지 추가 ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

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
      <Route path="/records/:recordId" element={
        user ? <RecordDetailPage /> : <Navigate to="/login" />} />
      <Route path="/" element={
        // HomePage에도 로그아웃 기능을 추가할 수 있으므로 onLogout 전달
        user ? <HomePage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
      } />
      <Route path="/exercise/:exerciseId" element={
        user ? <ExercisePage user={user} /> : <Navigate to="/login" />
      } />
      <Route path="/records" element={
        user ? <RecordsPage user={user} /> : <Navigate to="/login" />
      } />
      
      {/* --- 수정된 InfoPage 라우트 --- */}
      <Route path="/info" element={
        // InfoPage에 user 정보와 onLogout 함수를 props로 전달합니다.
        user ? <InfoPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
      } />
      {/* --- 여기까지 수정 --- */}

      <Route path="/exercise-selection" element={
        user ? <ExerciseSelectionPage /> : <Navigate to="/login" />
      } />
      
    </Routes>
  );
}

export default App;