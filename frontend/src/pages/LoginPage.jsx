import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Mail, Lock, AlertCircle } from 'lucide-react';
import { authAPI } from '../services/api'; 
import "./LoginPage.css"

function LoginPage({ setUser }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      const { access_token, user } = response.data;

      localStorage.setItem('access_token', access_token);
      // 백엔드가 반환한 user 객체를 상태에 저장
      setUser(user);
      
      // 온보딩 완료 여부에 따라 페이지를 이동
      // body_condition이 없거나, 있더라도 내용이 비어있으면 온보딩으로 이동
      if (!user.body_condition || user.body_condition.injured_parts.length === 0) {
        navigate('/onboarding');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.detail || '로그인에 실패했습니다. 이메일 또는 비밀번호를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-container">
        <div className="header-section">
          <div className="logo-icon-wrapper">
            <Activity className="logo-icon" />
          </div>
          <h1 className="app-title">Fitner</h1>
          <p className="app-subtitle">AI 기반 맞춤 재활 운동</p>
        </div>

        <div className="form-card">
          <h2 className="card-title">로그인</h2>

          {error && (
            <div className="error-message-box">
              <AlertCircle className="error-icon" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="form-layout">
            <div className="input-group">
              <label className="input-label">
                이메일
              </label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">
                비밀번호
              </label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`submit-button ${loading ? 'button-disabled' : ''}`}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="footer-link-section">
            <p className="footer-text">
              계정이 없으신가요?{' '}
              <Link to="/register" className="register-link">
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </div> 
    </div>
  );
}

export default LoginPage;