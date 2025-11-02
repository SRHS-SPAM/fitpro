import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Activity, Mail, Lock, User, AlertCircle } from 'lucide-react';
import "./RegisterPage.css";

function RegisterPage({ setUser }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.register(formData);
      const { access_token, user_id } = response.data;

      localStorage.setItem('access_token', access_token);

      // ⭐ [수정됨] 백엔드 응답에 이름이 없으므로,
      // 사용자가 입력한 formData를 기반으로 user 객체를 직접 만듭니다.
      const newUser = {
        user_id: user_id,
        email: formData.email,
        name: formData.name,
        // 온보딩 전이므로 body_condition은 기본값으로 설정
        body_condition: { injured_parts: [], pain_level: 0, limitations: [] } 
      };
      setUser(newUser);
      
      navigate('/onboarding');
    } catch (err) {
      setError(err.response?.data?.detail || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // --- JSX 부분은 수정할 필요 없습니다 ---
  return (
    <>
      <div className="register-page-wrapper">
        <div className="register-container">
          <div className="header-section">
            <div className="logo-icon-wrapper">
              <Activity className="logo-icon" />
            </div>
            <h1 className="app-title">Fitner</h1>
            <p className="app-subtitle">AI 기반 맞춤 재활 운동</p>
          </div>

          <div className="form-card">
            <h2 className="card-title">회원가입</h2>

            {error && (
              <div className="error-message-box">
                <AlertCircle className="error-icon" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="form-layout">
              <div className="input-group">
                <label className="input-label">
                  이름
                </label>
                <div className="input-wrapper">
                  <User className="input-icon" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="홍길동"
                  />
                </div>
              </div>

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
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field"
                    placeholder="최소 6자 이상"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`submit-button ${loading ? 'button-disabled' : ''}`}
              >
                {loading ? '가입 중...' : '회원가입'}
              </button>
            </form>

            <div className="footer-link-section">
              <p className="footer-text">
                이미 계정이 있으신가요?{' '}
                <Link to="/login" className="login-link">
                  로그인
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default RegisterPage;