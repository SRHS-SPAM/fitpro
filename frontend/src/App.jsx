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
import { authAPI } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [myExercises, setMyExercises] = useState(() => {
    try {
      const saved = localStorage.getItem('myExercises');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Failed to parse myExercises from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('myExercises', JSON.stringify(myExercises));
  }, [myExercises]);

  const addMyExercise = (exerciseToAdd) => {
    if (!myExercises.some(ex => ex.exercise_id === exerciseToAdd.exercise_id)) {
      setMyExercises(prev => [...prev, exerciseToAdd]);
    }
  };

  useEffect(() => { checkAuth(); }, []);

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

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('myExercises');
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
      
      <Route path="/my-exercises" element={
        user ? <MyExercisePage myExercises={myExercises} /> : <Navigate to="/login" />
      } />
    </Routes>
  );
}

export default App;