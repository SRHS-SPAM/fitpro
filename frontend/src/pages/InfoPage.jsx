import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';4
import api from '../services/api.js';
import { UserCircle, LogOut, ArrowLeft, AlertTriangle, X } from 'lucide-react';

export default function InfoPage({ user, onLogout }) {
    const navigate = useNavigate();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        } else {
            localStorage.removeItem('access_token');
            navigate('/');
        }
    };

    const handleDeleteAccount = async () => {
        if (!password) {
            setError('비밀번호를 입력해주세요.');
            return;
        }

        if (confirmText !== '삭제합니다') {
            setError('확인 문구를 정확히 입력해주세요.');
            return;
        }

        setIsDeleting(true);
        setError('');

        try {
            const token = localStorage.getItem('access_token');
            const response = await api.delete(
            '/users/me', 
            { 
                data: {
                    password: password,
                    confirm_text: confirmText 
                }
            }
        );

            const data = response.data;

            if (response.ok) {
                alert(data.message || '계정이 성공적으로 삭제되었습니다.');
                handleLogout();
            } else {
                setError(data.detail || '계정 삭제에 실패했습니다.');
            }
        } catch (err) {
            setError('서버 연결에 실패했습니다. 다시 시도해주세요.');
            console.error('Delete account error:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl p-8 space-y-8 text-center">
                    <p className="text-red-600">사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.</p>
                    <button onClick={() => navigate('/login')} className="flex items-center justify-center mx-auto mt-4 px-4 py-2 bg-[#4CAF50] text-white font-medium rounded-lg hover:bg-[#499c4c] transition duration-150">
                        <ArrowLeft className="w-4 h-4 mr-2" /> 로그인 페이지로
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center p-4 bg-gray-50">
            <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl p-6 md:p-8 space-y-6 bg-green-50">
                <header className="text-center border-b pb-4 flex items-center justify-center">
                    <UserCircle className="w-8 h-8 text-[#4CAF50] mr-3" />
                    <h1 className="text-3xl font-extrabold text-gray-900">내 정보</h1>
                </header>

                <section className="space-y-4 p-4 bg-green-50 rounded-lg shadow-inner">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-[#499c4c]">계정 정보</h2>
                        <button onClick={handleLogout} className="flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition duration-150">
                            <LogOut className="w-4 h-4 mr-2" />
                            로그아웃
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="text-sm">
                            <p className="font-semibold text-gray-600 uppercase">이름</p>
                            <p className="text-lg font-medium text-gray-900">{user.name}</p>
                        </div>
                        <div className="text-sm">
                            <p className="font-semibold text-gray-600 uppercase">이메일</p>
                            <p className="text-lg font-medium text-gray-900 break-words">{user.email}</p>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">신체 정보</h2>
                    {user.body_condition ? (
                        <div className="p-4 bg-gray-50 rounded-lg shadow-inner space-y-4">
                            {(user.body_condition.injured_parts?.length > 0 || user.body_condition.injured_parts_detail) && (
                                <div className="space-y-2">
                                    <p className="font-semibold text-gray-700">불편 부위</p>
                                    <div className="flex flex-wrap gap-2">
                                        {user.body_condition.injured_parts.map(part => (
                                            <span key={part} className="px-3 py-1 bg-green-100 text-[#499c4c] rounded-full text-sm font-medium">
                                                {part}
                                            </span>
                                        ))}
                                        {user.body_condition.injured_parts_detail && (
                                            <span className="px-3 py-1 bg-green-200 text-[#499c4c] rounded-full text-sm font-medium">
                                                {user.body_condition.injured_parts_detail}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <p className="font-semibold text-gray-700">통증 수준</p>
                                <div className="flex items-center space-x-3">
                                    <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-[#4CAF50] via-yellow-400 to-red-500 transition-all duration-300"
                                            style={{ width: `${(user.body_condition.pain_level / 10) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-2xl font-bold text-gray-900">
                                        {user.body_condition.pain_level}/10
                                    </span>
                                </div>
                            </div>

                            <button 
                                onClick={() => navigate('/onboarding')} 
                                className="w-full px-6 py-3 text-base font-semibold rounded-lg shadow-lg bg-[#4CAF50] hover:bg-[#499c4c] text-white transition duration-150"
                            >
                                상태 정보 수정하기
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 bg-gray-50 rounded-lg shadow-inner text-center">
                            <p className="text-gray-700 mb-4">
                                아직 신체 정보가 입력되지 않았습니다.
                            </p>
                            <button 
                                onClick={() => navigate('/onboarding')} 
                                className="w-full px-6 py-3 text-base font-semibold rounded-lg shadow-lg bg-[#4CAF50] hover:bg-[#499c4c] text-white transition duration-150"
                            >
                                상태 정보 입력하기
                            </button>
                        </div>
                    )}
                </section>

                <section className="space-y-4 pt-4 border-t">
                    <h2 className="text-xl font-bold text-red-700">위험 구역</h2>
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-start space-x-3 mb-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-red-800 mb-1">계정 삭제</h3>
                                <p className="text-sm text-red-700 mb-3">
                                    계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition duration-150"
                        >
                            계정 삭제하기
                        </button>
                    </div>
                </section>
                
                <button onClick={() => navigate('/')} className="w-full flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg shadow-sm text-gray-700 border border-gray-300 bg-gray-100 hover:bg-gray-200 transition duration-150">
                    <ArrowLeft className="h-5 w-5 mr-2" /> 홈으로 돌아가기
                </button>
            </div>

            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                                <h2 className="text-xl font-bold text-gray-900">계정 삭제 확인</h2>
                            </div>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setPassword('');
                                    setConfirmText('');
                                    setError('');
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-800 font-medium mb-2">
                                ⚠️ 다음 데이터가 영구적으로 삭제됩니다:
                            </p>
                            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                                <li>계정 정보 및 프로필</li>
                                <li>생성한 모든 운동</li>
                                <li>운동 기록</li>
                            </ul>
                        </div>

                        {error && (
                            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    비밀번호 확인
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="비밀번호를 입력하세요"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    확인 문구 입력
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="삭제합니다"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    "삭제합니다"를 정확히 입력해주세요
                                </p>
                            </div>
                        </div>

                        <div className="flex space-x-3 pt-2">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setPassword('');
                                    setConfirmText('');
                                    setError('');
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition duration-150"
                                disabled={isDeleting}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? '삭제 중...' : '영구 삭제'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}