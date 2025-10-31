import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

function ExerciseFeedback({ feedback }) {
  if (!feedback) return null;

  const getStatusColor = () => {
    if (feedback.critical_error) return 'bg-red-500';
    if (feedback.score >= 80) return 'bg-green-500';
    if (feedback.score >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getStatusIcon = () => {
    if (feedback.critical_error) {
      return <XCircle className="w-6 h-6 text-red-400" />;
    }
    if (feedback.is_correct) {
      return <CheckCircle className="w-6 h-6 text-green-400" />;
    }
    return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
  };

  const getStatusText = () => {
    if (feedback.critical_error) return '위험한 자세';
    if (feedback.is_correct) return '정확한 자세';
    return '자세 교정 필요';
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
      {/* 상태 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-bold text-white">{getStatusText()}</h3>
            <p className="text-sm text-gray-400">
              정확도: {feedback.score}%
            </p>
          </div>
        </div>
        
        {/* 점수 바 */}
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getStatusColor()}`}
              style={{ width: `${feedback.score}%` }}
            />
          </div>
        </div>
      </div>

      {/* 피드백 메시지 */}
      {feedback.feedback && (
        <div className={`p-3 rounded-lg ${
          feedback.critical_error
            ? 'bg-red-900/30 border border-red-600'
            : 'bg-blue-900/30 border border-blue-600'
        }`}>
          <p className={`text-sm ${
            feedback.critical_error ? 'text-red-200' : 'text-blue-200'
          }`}>
            {feedback.feedback}
          </p>
        </div>
      )}

      {/* 각도 오차 상세 */}
      {feedback.angle_errors && Object.keys(feedback.angle_errors).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-400">상세 분석</h4>
          {Object.entries(feedback.angle_errors).map(([joint, error]) => (
            <div key={joint} className="flex items-center justify-between bg-gray-700 rounded-lg p-2">
              <span className="text-sm text-gray-300 capitalize">
                {joint.replace('_', ' ')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  현재 {error.current}° / 목표 {error.target}°
                </span>
                <span className={`text-xs font-medium ${
                  Math.abs(error.diff) <= 10 ? 'text-green-400' : 'text-orange-400'
                }`}>
                  {error.diff > 0 ? '+' : ''}{error.diff}°
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ExerciseFeedback;