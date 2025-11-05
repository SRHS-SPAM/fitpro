import React, { useState, useEffect, useCallback } from 'react';
import { UserCircle, AlertCircle, Save, ArrowLeft } from 'lucide-react';

// API 호출을 위한 기본 URL (실제 환경에 맞게 조정 필요)
const BASE_URL = "/api/v1"; 

// ================ 유틸리티 컴포넌트 =================

/**
 * 상태 메시지를 표시하는 컴포넌트 (HomePage 스타일 적용)
 */
const StatusMessage = ({ message, type }) => {
    if (!message) return null;

    // Tailwind CSS 클래스로 HomePage의 에러 박스 스타일을 재현합니다.
    let classes = "p-3 rounded-lg font-medium shadow-md flex items-center";
    let iconClass = "w-5 h-5 mr-3";

    switch (type) {
        case 'success':
            classes += " bg-green-100 text-green-800 border border-green-300";
            break;
        case 'error':
            classes += " bg-red-100 text-red-800 border border-red-300";
            break;
        case 'info':
        default:
            classes += " bg-blue-100 text-blue-800 border border-blue-300";
            break;
    }

    return (
        <div role="alert" className={classes}>
            <AlertCircle className={iconClass} />
            {message}
        </div>
    );
};

// ================ 메인 애플리케이션 컴포넌트 =================

/**
 * 현재 로그인된 사용자의 프로필 정보 (주로 신체 조건)를 관리하는 페이지입니다.
 * @param {object} props.user - 상위 컴포넌트에서 전달받은 현재 사용자 정보
 * @param {function} props.navigate - react-router-dom의 navigate 함수
 */
export default function ProfileManager({ user, navigate }) {
    // 로딩, 업데이트 상태 및 메시지 관리
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [status, setStatus] = useState({ message: '', type: '' });
    
    // 폼 상태: user prop의 body_condition으로 초기화됩니다.
    const [formState, setFormState] = useState({
        gender: '',
        height: '',
        weight: '',
        activity_level: ''
    });

    // 폼 상태를 사용자 데이터로 초기화하는 효과 (user prop이 변경될 때마다)
    useEffect(() => {
        if (user) {
            // 키와 몸무게는 number일 수 있으므로, formState에서는 string으로 저장합니다.
            setFormState({
                gender: user.body_condition?.gender || '',
                height: String(user.body_condition?.height || ''),
                weight: String(user.body_condition?.weight || ''),
                activity_level: user.body_condition?.activity_level || '',
            });
            setLoading(false);
        } else {
            setLoading(false); 
            setStatus({ message: "사용자 정보를 불러올 수 없습니다. 로그인이 필요합니다.", type: 'error' });
        }
    }, [user]);

    // 상태 메시지를 일정 시간 후 초기화합니다.
    useEffect(() => {
        if (status.message) {
            const timer = setTimeout(() => setStatus({ message: '', type: '' }), 5000);
            return () => clearTimeout(timer);
        }
    }, [status]);


    /**
     * PUT /users/me/body-condition API 호출을 처리합니다.
     */
    const updateBodyCondition = async (e) => {
        e.preventDefault();

        if (!user) {
            setStatus({ message: "로그인 정보가 유효하지 않아 업데이트할 수 없습니다.", type: 'error' });
            return;
        }
        
        const authToken = localStorage.getItem('access_token'); 
        if (!authToken) {
            setStatus({ message: "인증 토큰이 누락되었습니다. 다시 로그인해주세요.", type: 'error' });
            return;
        }

        setIsUpdating(true);
        setStatus({ message: '', type: '' }); // 상태 초기화

        // 1. 값 파싱 및 유효성 검사
        const parsedHeight = parseFloat(formState.height);
        const parsedWeight = parseFloat(formState.weight);
        
        // 2. ⭐ [핵심 수정] Client-side Validation (NaN, 빈값 체크)
        if (!formState.gender || !formState.activity_level) {
             setStatus({ message: "성별과 활동 수준을 선택해주세요.", type: 'error' });
             setIsUpdating(false);
             return;
        }
        if (isNaN(parsedHeight) || parsedHeight <= 0) {
            setStatus({ message: "유효한 키(cm) 값을 입력해주세요.", type: 'error' });
            setIsUpdating(false);
            return;
        }
        if (isNaN(parsedWeight) || parsedWeight <= 0) {
            setStatus({ message: "유효한 체중(kg) 값을 입력해주세요.", type: 'error' });
            setIsUpdating(false);
            return;
        }

        // API 스키마에 맞춰 데이터 준비 (숫자로 변환된 값 사용)
        const updateData = {
            gender: formState.gender,
            height: parsedHeight,
            weight: parsedWeight,
            activity_level: formState.activity_level,
        };

        try {
            const response = await fetch(`${BASE_URL}/users/me/body-condition`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                // HTTP 상태 코드가 200대가 아닐 때
                let errorDetail = `HTTP Error: ${response.status} ${response.statusText}`;
                try {
                    // ⭐ [핵심 수정] 에러 응답 JSON을 파싱하여 상세 오류 메시지를 추출
                    const errorJson = await response.json();
                    
                    if (response.status === 422 && errorJson.detail) {
                        // FastAPI 422 에러는 'detail' 키에 상세 정보를 배열로 담고 있습니다.
                        errorDetail = `입력 오류: ${errorJson.detail[0]?.msg || '제출된 데이터 형식이 올바르지 않습니다.'}`;
                    } else {
                        errorDetail = errorJson.detail || JSON.stringify(errorJson);
                    }
                } catch (e) {
                    // 응답이 JSON 형식이 아닐 경우 (네트워크 오류, 서버 구성 오류 등)
                    console.error("Failed to parse error response:", e);
                    // 원래 HTTP 오류 메시지를 유지
                }
                
                throw new Error(errorDetail);
            }

            const result = await response.json();
            
            // 성공 시 메시지 표시
            setStatus({ message: result.message || "신체 정보가 성공적으로 업데이트되었습니다.", type: 'success' });
            
            // 💡 부모 컴포넌트에 알림 로직은 주석 처리 유지
            // if (onProfileUpdate) onProfileUpdate(result.body_condition);

        } catch (error) {
            console.error("업데이트 오류:", error);
            // ⭐ [핵심 수정] Error: [object Object] 대신 실제 에러 메시지 출력
            setStatus({ message: `업데이트 오류: ${error.message || '알 수 없는 오류'}`, type: 'error' });
        } finally {
            setIsUpdating(false);
        }
    };

    // 폼 입력 변경 핸들러
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };
    
    // 로딩 중 표시
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-indigo-600 font-semibold">사용자 정보 확인 중...</p>
                </div>
            </div>
        );
    }
    
    // user prop이 없거나 정보 로드 실패 시
    if (!user) {
         return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl p-8 space-y-8 text-center">
                    <StatusMessage message={status.message || "로그인된 사용자를 찾을 수 없습니다."} type="error" />
                    <button 
                        onClick={() => navigate('/')} 
                        className="flex items-center justify-center mx-auto mt-4 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition duration-150"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> 홈으로 돌아가기
                    </button>
                </div>
            </div>
         );
    }

    // 사용자 정보가 있을 때 메인 UI 렌더링
    return (
        <div className="min-h-screen flex flex-col items-center p-4 bg-gray-50">
            <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl p-6 md:p-8 space-y-6">
                <header className="text-center border-b pb-4 flex items-center justify-center">
                    <UserCircle className="w-8 h-8 text-indigo-600 mr-3" />
                    <h1 className="text-3xl font-extrabold text-gray-900">내 정보 관리</h1>
                </header>

                {/* 상태 메시지 영역 */}
                <div className="min-h-[40px]"><StatusMessage message={status.message} type={status.type} /></div>

                {/* 사용자 기본 정보 표시 */}
                <section className="space-y-4 p-4 bg-indigo-50 rounded-lg shadow-inner">
                    <h2 className="text-xl font-bold text-indigo-800">기본 정보</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {/* 신체 정보 업데이트 폼 */}
                <section id="bodyConditionSection" className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">신체 정보 수정</h2>
                    <form id="bodyConditionForm" className="space-y-6" onSubmit={updateBodyCondition}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 성별 */}
                            <div>
                                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">성별</label>
                                <select id="gender" name="gender" required
                                        value={formState.gender} onChange={handleFormChange}
                                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 appearance-none">
                                    <option value="">선택하세요</option>
                                    <option value="male">남성</option>
                                    <option value="female">여성</option>
                                    <option value="other">기타</option>
                                </select>
                            </div>

                            {/* 활동 수준 */}
                            <div>
                                <label htmlFor="activity_level" className="block text-sm font-medium text-gray-700 mb-1">활동 수준</label>
                                <select id="activity_level" name="activity_level" required
                                        value={formState.activity_level} onChange={handleFormChange}
                                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 appearance-none">
                                    <option value="">선택하세요</option>
                                    <option value="sedentary">비활동적</option>
                                    <option value="light">가벼운 활동</option>
                                    <option value="moderate">중간 활동</option>
                                    <option value="high">높은 활동</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 키 */}
                            <div>
                                <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">키 (cm)</label>
                                <input type="number" id="height" name="height" placeholder="예: 175.5" required min="50" max="250" step="0.1"
                                       value={formState.height} onChange={handleFormChange}
                                       className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>

                            {/* 체중 */}
                            <div>
                                <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">체중 (kg)</label>
                                <input type="number" id="weight" name="weight" placeholder="예: 70.2" required min="10" max="500" step="0.1"
                                       value={formState.weight} onChange={handleFormChange}
                                       className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                        </div>

                        {/* 업데이트 버튼 */}
                        <button type="submit" id="updateBtn" disabled={isUpdating}
                                className="w-full flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed">
                            {isUpdating ? '정보 저장 중...' : '신체 정보 업데이트'}
                            <Save className={`${isUpdating ? 'hidden' : 'block'} ml-3 h-5 w-5`} />
                            <svg className={`${isUpdating ? 'block' : 'hidden'} animate-spin ml-3 h-5 w-5 text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </button>
                    </form>
                </section>
                
                {/* 돌아가기 버튼 (HomePage 스타일 참고) */}
                 <button 
                    onClick={() => navigate('/')} 
                    className="w-full flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg shadow-sm text-gray-700 border border-gray-300 bg-gray-100 hover:bg-gray-200 transition duration-150"
                >
                    <ArrowLeft className="h-5 w-5 mr-2" /> 홈으로 돌아가기
                </button>

            </div>
        </div>
    );
}
