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
import MyExercisePage from './pages/MyExercisePage';
import { authAPI, exerciseAPI } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ 수정: localStorage 제거, DB에서 가져온 데이터만 사용
  const [myExercises, setMyExercises] = useState([]);

  useEffect(() => { 
    checkAuth(); 
  }, []);

  

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const response = await authAPI.getCurrentUser();
        setUser(response.data);
        
        // ✅ 추가: 로그인 시 '내 운동' 목록을 DB에서 불러오기
        await loadMyExercises();
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('access_token');
      }
    }
    setLoading(false);
  };

  // ✅ 새로 추가: DB에서 '내 운동' 목록 불러오기
  const loadMyExercises = async () => {
    try {
      // 👇 [수정] 인자(1, 100) 제거
      const response = await exerciseAPI.getMyExercises(); 
      
      // 백엔드 응답이 { "exercises": [...] } 형태이므로 이 부분은 올바릅니다.
      setMyExercises(response.data.exercises || []);
    } catch (error) {
      console.error('Failed to load my exercises:', error);
    }
  };

  // ✅ 수정: API 호출 후 state 업데이트
  const addMyExercise = async (exerciseToAdd) => {
    try {
      await exerciseAPI.saveExercise(exerciseToAdd.exercise_id);
      
      // API 호출 성공 시 프론트엔드 state에도 추가
      if (!myExercises.some(ex => ex.exercise_id === exerciseToAdd.exercise_id)) {
        setMyExercises(prev => [...prev, exerciseToAdd]);
      }
    } catch (error) {
      console.error('Failed to save exercise:', error);
      alert('운동 저장에 실패했습니다.');
    }
  };

  // ✅ 새로 추가: 운동 삭제 함수
  const removeMyExercise = async (exerciseId) => {
    try {
      await exerciseAPI.deleteExercise(exerciseId);
      
      // API 호출 성공 시 프론트엔드 state에서도 제거
      setMyExercises(prev => prev.filter(ex => ex.exercise_id !== exerciseId));
    } catch (error) {
      console.error('Failed to delete exercise:', error);
      throw error; // 에러를 다시 던져서 MyExercisePage에서 처리하도록
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    // ✅ 수정: localStorage의 myExercises 제거 불필요 (이미 사용 안 함)
    setUser(null);
    setMyExercises([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage setUser={setUser} />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <RegisterPage setUser={setUser} />} />
      <Route path="/onboarding" element={user ? <OnboardingPage user={user} setUser={setUser} /> : <Navigate to="/login" />} />
      <Route path="/records/:recordId" element={user ? <RecordDetailPage /> : <Navigate to="/login" />} />
      <Route path="/" element={user ? <HomePage user={user} setUser={setUser} /> : <Navigate to="/login" />} />
      <Route path="/exercise/:exerciseId" element={user ? <ExercisePage user={user} /> : <Navigate to="/login" />} />
      <Route path="/records" element={user ? <RecordsPage user={user} /> : <Navigate to="/login" />} />
      <Route path="/info" element={user ? <InfoPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
      
      <Route path="/exercise-selection" element={
        user ? <ExerciseSelectionPage myExercises={myExercises} addMyExercise={addMyExercise} /> : <Navigate to="/login" />
      } />
      
      {/* ✅ 수정: removeMyExercise props 추가 */}
      <Route path="/my-exercises" element={
        user ? <MyExercisePage myExercises={myExercises} removeMyExercise={removeMyExercise} /> : <Navigate to="/login" />
      } />
    </Routes>
  );
}

export default App;