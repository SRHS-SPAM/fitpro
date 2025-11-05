import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Dumbbell, History, UserCircle } from 'lucide-react';
import '../pages/HomePage.css'; // HomePage의 CSS를 그대로 사용

const BottomNav = ({ active }) => {
    const navigate = useNavigate();

    return (
        <div className="home-bottom-nav">
            <button onClick={() => navigate('/')} className={`home-nav-button ${active === 'home' ? 'active' : ''}`}>
                <Home className="home-nav-icon" />
                <span className="home-nav-label">홈</span>
            </button>
            <button onClick={() => navigate('/my-exercises')} className={`home-nav-button ${active === 'my-exercise' ? 'active' : ''}`}>
                <Dumbbell className="home-nav-icon" />
                <span className="home-nav-label">내 운동</span>
            </button>
            <button onClick={() => navigate('/records')} className={`home-nav-button ${active === 'records' ? 'active' : ''}`}>
                <History className="home-nav-icon" />
                <span className="home-nav-label">기록</span>
            </button>
            <button onClick={() => navigate('/info')} className={`home-nav-button ${active === 'profile' ? 'active' : ''}`}>
                <UserCircle className="home-nav-icon" />
                <span className="home-nav-label">내 정보</span>
            </button>
        </div>
    );
};

export default BottomNav;