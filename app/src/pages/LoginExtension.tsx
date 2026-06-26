import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Shield, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { createAuthCode } from '../services/api';
import {
  validateExtensionParams,
  logExtensionAuthEvent,
  type ExtensionParams,
} from '../services/extensionAuth';

const EXTENSION_RETURN_KEY = 'extension_return_to';

const LoginExtension: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const validation = useMemo(
    () => validateExtensionParams(searchParams),
    [searchParams]
  );

  useEffect(() => {
    if (!isAuthenticated && validation.success) {
      const returnUrl = `/login-extension?${searchParams.toString()}`;
      sessionStorage.setItem(EXTENSION_RETURN_KEY, returnUrl);
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, validation.success, searchParams, navigate]);

  if (!validation.success) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-red-600/20 rounded-lg">
              <Shield size={24} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Invalid Request</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Invalid or missing extension parameters. Please re-initiate the flow
            from the extension.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const { extension_name, extension_version, state } =
    validation.data as ExtensionParams;

  const handleApprove = async () => {
    if (!token) return;

    const currentState = searchParams.get('state');
    if (currentState !== state) {
      toast.error('Something went wrong. Please re-initiate the flow from the extension.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await createAuthCode(token, 1, 1);

      if (response.error) {
        if (response.error.auth_code_limit_exceeded) {
          toast.error('Too many attempts. Please wait a few minutes and try again from the extension.');
        } else {
          toast.error('Something went wrong. Please re-initiate the flow from the extension.');
        }
        setIsLoading(false);
        return;
      }

      if (!response.auth_code) {
        toast.error('Something went wrong. Please re-initiate the flow from the extension.');
        setIsLoading(false);
        return;
      }

      logExtensionAuthEvent('approve', extension_name, extension_version);
      navigate(
        `/login-extension/complete?code=${encodeURIComponent(response.auth_code)}&state=${encodeURIComponent(state)}`,
        { replace: true }
      );
    } catch {
      toast.error('Something went wrong. Please re-initiate the flow from the extension.');
      setIsLoading(false);
    }
  };

  const handleDeny = () => {
    logExtensionAuthEvent('deny', extension_name, extension_version);
    navigate('/', { replace: true });
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Shield size={24} className="text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-white">
            Extension Access Request
          </h2>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Extension
                </dt>
                <dd className="text-white font-medium mt-1">
                  {extension_name}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Version
                </dt>
                <dd className="text-white font-medium mt-1">
                  {extension_version}
                </dd>
              </div>
            </dl>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed">
            This will allow{' '}
            <span className="font-semibold text-white">
              {extension_name} v{extension_version}
            </span>{' '}
            to authenticate as you for a single session.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleDeny}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Deny
          </button>
          <button
            onClick={handleApprove}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 bg-blue-600 hover:bg-blue-500 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Approving...</span>
              </>
            ) : (
              <span>Approve</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginExtension;
