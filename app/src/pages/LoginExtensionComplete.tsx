import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';

const REDIRECT_DELAY_MS = 3000;

const LoginExtensionComplete: React.FC = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timeout = setTimeout(() => {
      navigate('/', { replace: true });
    }, REDIRECT_DELAY_MS);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [navigate]);

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-green-600/20 rounded-full">
            <CheckCircle size={32} className="text-green-400" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-2">
          Authentication Approved
        </h2>

        <p className="text-gray-300 text-sm leading-relaxed mb-6">
          You may return to the extension.
        </p>

        <div className="flex items-center justify-center space-x-2 text-gray-400 text-sm">
          <Loader2 size={14} className="animate-spin" />
          <span>Redirecting in {countdown}s...</span>
        </div>
      </div>
    </div>
  );
};

export default LoginExtensionComplete;
