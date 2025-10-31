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
      // ⭐ API 호출 시뮬레이션: 실제 환경에서는 authAPI를 사용해야 합니다.
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockResponse = {
        data: { 
          access_token: 'mock_token', 
          user: { 
            email: formData.email, 
            user_id: 'mock_id', 
            name: '테스트 사용자',
            body_condition: { injured_parts: [] } // 신체 정보가 있다고 가정
          } 
        }
      };

      // const response = await authAPI.login(formData); // 실제 API 호출
      const response = mockResponse; // 시뮬레이션 결과 사용

      localStorage.setItem('access_token', response.data.access_token);
      setUser(response.data.user);
      
      // 신체 정보가 없으면 온보딩으로, 있으면 대시보드로 이동
      if (!response.data.user.body_condition) {
        navigate('/onboarding');
      } else {
        navigate('/');
      }
    } catch (err) {
      // 에러 시뮬레이션
      setError('로그인 실패: 이메일 또는 비밀번호를 확인해 주세요. (현재 시뮬레이션)');
      // setError(err.response?.data?.detail || '로그인에 실패했습니다.'); // 실제 에러 처리
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-container">
        {/* 로고 */}
        <div className="header-section">
          <div className="logo-icon-wrapper">
            <Activity className="logo-icon" />
          </div>
          <h1 className="app-title">Fitner</h1>
          <p className="app-subtitle">AI 기반 맞춤 재활 운동</p>
        </div>

        {/* 로그인 폼 */}
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
