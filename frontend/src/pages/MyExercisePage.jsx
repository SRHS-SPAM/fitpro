import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Clock, Zap, History } from 'lucide-react';
// --- [수정] BottomNav 컴포넌트의 import 경로를 수정합니다. ---
import BottomNav from '../components/BottomNav';

const getIntensityColor = (intensity) => {
    switch (intensity?.toLowerCase()) {
        case 'low': return 'bg-green-500';
        case 'medium': return 'bg-yellow-500';
        case 'high': return 'bg-red-500';
        case 'stretching': return 'bg-blue-500';
        default: return 'bg-gray-500';
    }
};

const MyExercisePage = ({ myExercises }) => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col min-h-screen bg-gray-100 pb-20">
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto p-4 flex items-center justify-center relative">
                    <button onClick={() => navigate('/')} className="absolute left-4">
                        <ArrowLeft className="w-6 h-6 text-gray-700" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">내 운동 목록</h1>
                </div>
            </header>

            <main className="flex-grow p-4">
                <div className="max-w-4xl mx-auto">
                    {myExercises && myExercises.length > 0 ? (
                        <div className="space-y-4">
                            {myExercises.map((exercise) => (
                                <div
                                    key={exercise.exercise_id}
                                    className="bg-white rounded-xl p-6 shadow-md border border-gray-200"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-gray-900 mb-1">{exercise.name}</h3>
                                            <p className="text-gray-600 text-sm">{exercise.description}</p>
                                        </div>
                                        <Dumbbell className="w-8 h-8 text-indigo-500 flex-shrink-0 ml-4" />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                                            <Clock className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                                            <p className="text-lg font-semibold">{exercise.duration_minutes}분</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                                            <Zap className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                                            <div className="flex items-center justify-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${getIntensityColor(exercise.intensity)}`}></span>
                                                <p className="text-lg font-semibold capitalize">{exercise.intensity}</p>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                                            <span className="text-xs text-gray-500 block mb-1">세트×반복</span>
                                            <p className="text-lg font-semibold">{exercise.sets} × {exercise.repetitions}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => navigate(`/exercise/${exercise.exercise_id}`)}
                                        className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition"
                                    >
                                        이 운동 시작하기 →
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 px-4">
                            <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">저장된 운동이 없습니다</h3>
                            <p className="text-gray-600 mb-6">
                                AI 추천을 통해 나만의 운동 목록을 만들어보세요.
                            </p>
                            <button
                                onClick={() => navigate('/exercise-selection')}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold"
                            >
                                운동 추천 받으러 가기
                            </button>
                        </div>
                    )}
                </div>
            </main>

            <BottomNav active="my-exercise" />
        </div>
    );
};

export default MyExercisePage;