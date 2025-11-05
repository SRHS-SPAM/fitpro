import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, AlertCircle, Save, ArrowLeft, Plus, X } from 'lucide-react';

const BASE_URL = "/api/v1"; 

const StatusMessage = ({ message, type }) => {
    if (!message) return null;

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
            <span>{message}</span>
        </div>
    );
};

export default function ProfileManager({ user }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [status, setStatus] = useState({ message: '', type: '' });
    
    const [formState, setFormState] = useState({
        pain_level: 0, 
        injured_parts: [],
        limitations: []
    });

    const [newInjuredPart, setNewInjuredPart] = useState('');
    const [newLimitation, setNewLimitation] = useState('');

    useEffect(() => {
        if (user) {
            setFormState({
                pain_level: user.body_condition?.pain_level || 0,
                injured_parts: user.body_condition?.injured_parts || [],
                limitations: user.body_condition?.limitations || [],
            });
            setLoading(false);
        } else {
            setLoading(false); 
            setStatus({ message: "사용자 정보를 불러올 수 없습니다. 로그인이 필요합니다.", type: 'error' });
        }
    }, [user]);

    useEffect(() => {
        if (status.message) {
            const timer = setTimeout(() => setStatus({ message: '', type: '' }), 5000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    const addInjuredPart = () => {
        if (newInjuredPart.trim() && !formState.injured_parts.includes(newInjuredPart.trim())) {
            setFormState(prev => ({
                ...prev,
                injured_parts: [...prev.injured_parts, newInjuredPart.trim()]
            }));
            setNewInjuredPart('');
        }
    };

    const removeInjuredPart = (part) => {
        setFormState(prev => ({
            ...prev,
            injured_parts: prev.injured_parts.filter(p => p !== part)
        }));
    };

    const addLimitation = () => {
        if (newLimitation.trim() && !formState.limitations.includes(newLimitation.trim())) {
            setFormState(prev => ({
                ...prev,
                limitations: [...prev.limitations, newLimitation.trim()]
            }));
            setNewLimitation('');
        }
    };

    const removeLimitation = (limitation) => {
        setFormState(prev => ({
            ...prev,
            limitations: prev.limitations.filter(l => l !== limitation)
        }));
    };

    const updateBodyCondition = async () => {
        if (!user) {
            setStatus({ message: "로그인 정보가 유효하지 않아 업데이트할 수 없습니다.", type: 'error' });
            return;
        }
        
        const authToken = localStorage.getItem('access_token'); 
        if (!authToken) {
            setStatus({ message: "인증 토큰이 누락되었습니다. 다시 로그인해주세요.", type: 'error' });
            return;
        }

        const updateData = {
            injured_parts: formState.injured_parts,
            pain_level: formState.pain_level,
            limitations: formState.limitations,
        };

        setIsUpdating(true);
        setStatus({ message: '', type: '' });
        
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
                let errorDetail = `HTTP Error: ${response.status} ${response.statusText}`;
                try {
                    const errorJson = await response.json();
                    
                    if (response.status === 422 && errorJson.detail) {
                        errorDetail = `입력 오류: ${errorJson.detail[0]?.msg || '제출된 데이터 형식이 올바르지 않습니다.'}`;
                    } else {
                        errorDetail = errorJson.detail || JSON.stringify(errorJson);
                    }
                } catch (e) {
                    console.error("Failed to parse error response:", e);
                }
                
                throw new Error(errorDetail);
            }

            const result = await response.json();
            setStatus({ message: result.message || "신체 정보가 성공적으로 업데이트되었습니다.", type: 'success' });
            
        } catch (error) {
            console.error("업데이트 오류:", error);
            setStatus({ message: `업데이트 오류: ${error.message || '알 수 없는 오류'}`, type: 'error' });
        } finally {
            setIsUpdating(false);
        }
    };

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

    return (
        <div className="min-h-screen flex flex-col items-center p-4 bg-gray-50">
            <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl p-6 md:p-8 space-y-6">
                <header className="text-center border-b pb-4 flex items-center justify-center">
                    <UserCircle className="w-8 h-8 text-indigo-600 mr-3" />
                    <h1 className="text-3xl font-extrabold text-gray-900">내 정보 관리</h1>
                </header>

                <div className="min-h-[40px]"><StatusMessage message={status.message} type={status.type} /></div>

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

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">신체 정보 수정</h2>

                    <div className="space-y-6">
                        <div>
                            <label htmlFor="pain_level" className="block text-sm font-medium text-gray-700 mb-2">
                                통증 레벨 (0-10)
                            </label>
                            <input 
                                type="range" 
                                id="pain_level" 
                                name="pain_level" 
                                min="0" 
                                max="10" 
                                value={formState.pain_level}
                                onChange={(e) => setFormState(prev => ({ ...prev, pain_level: parseInt(e.target.value) }))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-gray-600 mt-1">
                                <span>통증 없음</span>
                                <span className="text-xl font-bold text-indigo-600">{formState.pain_level}</span>
                                <span>극심한 통증</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                부상 부위
                            </label>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    value={newInjuredPart}
                                    onChange={(e) => setNewInjuredPart(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInjuredPart())}
                                    placeholder="예: 왼쪽 무릎, 오른쪽 어깨"
                                    className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <button 
                                    type="button"
                                    onClick={addInjuredPart}
                                    className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formState.injured_parts.map(part => (
                                    <span 
                                        key={part} 
                                        className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                                    >
                                        {part}
                                        <button 
                                            type="button"
                                            onClick={() => removeInjuredPart(part)}
                                            className="ml-2 hover:text-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                움직임 제약사항
                            </label>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    value={newLimitation}
                                    onChange={(e) => setNewLimitation(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLimitation())}
                                    placeholder="예: 쪼그려 앉기 어려움, 팔을 머리 위로 올리기 힘듦"
                                    className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <button 
                                    type="button"
                                    onClick={addLimitation}
                                    className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formState.limitations.map(limitation => (
                                    <span 
                                        key={limitation} 
                                        className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                                    >
                                        {limitation}
                                        <button 
                                            type="button"
                                            onClick={() => removeLimitation(limitation)}
                                            className="ml-2 hover:text-yellow-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={updateBodyCondition}
                            disabled={isUpdating}
                            className="w-full flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUpdating ? '저장 중...' : '신체 정보 업데이트'}
                            {!isUpdating && <Save className="ml-3 h-5 w-5" />}
                            {isUpdating && (
                                <svg className="animate-spin ml-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                        </button>
                    </div>
                </section>
                
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