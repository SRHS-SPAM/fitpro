    import { useNavigate } from 'react-router-dom';
    import './StartPage.css';

    function StartPage() {
    const navigate = useNavigate();

    return (
        <div className="start-page-wrapper">
        <div className="start-header">
            <h1 className="start-logo">Fitner</h1>
        </div>

        <div className="start-card">
            <div className="start-card-content">
            <p className="start-description">
                공간의 한계를 넘어,
                모두에게<br /> 동등한 재활 기회를 제공합니다
            </p>

            <button 
                className="start-signup-button"
                onClick={() => navigate('/register')}
            >
                회원가입
            </button>

            <button 
                className="start-login-link"
                onClick={() => navigate('/login')}
            >
                로그인
            </button>
            </div>
        </div>
        </div>
    );
    }

    export default StartPage;