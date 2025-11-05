import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, LogOut, ArrowLeft } from 'lucide-react';

// App.jsx로부터 user와 onLogout 함수만 받습니다. (setUser는 이제 불필요)
export default function InfoPage({ user, onLogout }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        } else {
            // 비상시 로직
            localStorage.removeItem('access_token');
            navigate('/');
        }
    };

    // 사용자가 없는 경우를 대비한 가드
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl p-8 space-y-8 text-center">
                    <p className="text-red-600">사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.</p>
                    <button onClick={() => navigate('/login')} className="flex items-center justify-center mx-auto mt-4 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition duration-150">
                        <ArrowLeft className="w-4 h-4 mr-2" /> 로그인 페이지로
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center p-4 bg-gray-50">
            <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl p-6 md:p-8 space-y-6">
                <header className="text-center border-b pb-4 flex items-center justify-center">
                    <UserCircle className="w-8 h-8 text-indigo-600 mr-3" />
                    <h1 className="text-3xl font-extrabold text-gray-900">내 정보</h1>
                </header>

                {/* 기본 정보 표시 섹션 */}
                <section className="space-y-4 p-4 bg-indigo-50 rounded-lg shadow-inner">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-indigo-800">계정 정보</h2>
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

                {/* 신체 정보 확인 및 수정 안내 섹션 */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">신체 정보</h2>
                    <div className="p-4 bg-gray-50 rounded-lg shadow-inner text-center">
                        <p className="text-gray-700 mb-4">
                            입력된 신체 정보는 홈 화면 또는 정보 수정 페이지에서 확인 및 변경할 수 있습니다.
                        </p>
                        <button 
                            onClick={() => navigate('/onboarding')} 
                            className="w-full flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 transition duration-150"
                        >
                            상태 정보 수정하기
                        </button>
                    </div>
                </section>
                
                <button onClick={() => navigate('/')} className="w-full flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg shadow-sm text-gray-700 border border-gray-300 bg-gray-100 hover:bg-gray-200 transition duration-150">
                    <ArrowLeft className="h-5 w-5 mr-2" /> 홈으로 돌아가기
                </button>
            </div>
        </div>
    );
}