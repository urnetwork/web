import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  Shield,
  Loader2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { createAuthCode } from '../services/api';
import {
  validateExtensionParams,
  logExtensionAuthEvent,
  type ExtensionParams,
} from '../services/extensionAuth';

const EXTENSION_RETURN_KEY = 'extension_return_to';
const FRAMED_WARNING_ID = 'ssoi-framed-warning';

const LoginExtension: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFramed, setIsFramed] = useState(false);

  useEffect(() => {
    try {
      setIsFramed(window.self !== window.top);
    } catch {
      // Cross-origin iframe access throws; treat as framed for safety.
      setIsFramed(true);
    }
  }, []);

  const validation = useMemo(
    () => validateExtensionParams(searchParams),
    [searchParams]
  );

  useEffect(() => {
    if (!isAuthenticated && validation.success) {
      const returnUrl = `/login-extension?${searchParams.toString()}`;
      sessionStorage.setItem(EXTENSION_RETURN_KEY, returnUrl);
      window.location.replace('/');
    }
  }, [isAuthenticated, validation.success, searchParams]);

  const openInNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

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

  const { extension_name, extension_version, state, redirect_uri } =
    validation.data as ExtensionParams;
  const { isVerified } = validation;

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

      logExtensionAuthEvent('approve', extension_name, extension_version, isVerified);

      // Send the auth code directly to the browser-managed extension redirect.
      // It never touches beta.app.ur.network after this point.
      window.location.replace(
        `${redirect_uri}#code=${encodeURIComponent(response.auth_code)}&state=${encodeURIComponent(state)}`
      );
    } catch {
      toast.error('Something went wrong. Please re-initiate the flow from the extension.');
      setIsLoading(false);
    }
  };

  const handleDeny = () => {
    logExtensionAuthEvent('deny', extension_name, extension_version, isVerified);
    window.location.replace('/');
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-8">
        <div id={FRAMED_WARNING_ID} className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Shield size={24} className="text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-white">
            Extension Access Request
          </h2>
        </div>

        {isFramed && (
          <div className="mb-6 bg-yellow-600/20 border border-yellow-500/40 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-yellow-200 font-semibold text-sm">This page is embedded</h3>
                <p className="text-yellow-100/80 text-sm mt-1">
                  For your security, extension approval cannot be completed inside another page.
                </p>
                <button
                  onClick={openInNewTab}
                  className="mt-3 inline-flex items-center space-x-2 text-sm font-medium text-yellow-300 hover:text-yellow-200"
                >
                  <span>Open in a new tab</span>
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

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

          {!isVerified ? (
            <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle size={18} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-200 text-sm font-medium">Unverified extension</p>
                  <p className="text-yellow-100/80 text-sm mt-1 leading-relaxed">
                    This extension is not verified by URnetwork. This can happen with beta,
                    developer, or self-built extensions. Only approve if you installed it from
                    a source you trust.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-200 text-sm font-medium">Verified extension</p>
                  <p className="text-green-100/80 text-sm mt-1 leading-relaxed">
                    This extension has been verified by URnetwork.
                  </p>
                </div>
              </div>
            </div>
          )}

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
            disabled={isLoading || isFramed}
            className="flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Deny
          </button>
          <button
            onClick={handleApprove}
            disabled={isLoading || isFramed}
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
