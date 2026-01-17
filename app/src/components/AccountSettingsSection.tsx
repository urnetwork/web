import React, { useState, useEffect } from 'react';
import { Settings, Key, Copy, Clock, Users, AlertCircle, CheckCircle, Shield, Lock, CreditCard, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { createAuthCode, fetchNetworkUser } from '../services/api';
import type { CreateAuthCodeResponse } from '../services/api';
import toast from 'react-hot-toast';
import PasswordResetModal from './PasswordResetModal';

const AccountSettingsSection: React.FC = () => {
  const { token } = useAuth();
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [uses, setUses] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [authCodeResponse, setAuthCodeResponse] = useState<CreateAuthCodeResponse | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoadingUserEmail, setIsLoadingUserEmail] = useState(true);


  useEffect(() => {
    const loadUserEmail = async () => {
      if (!token) {
        setIsLoadingUserEmail(false);
        return;
      }

      try {
        const response = await fetchNetworkUser(token);
        if (response.network_user?.user_auth) {
          setUserEmail(response.network_user.user_auth);
        }
      } catch (error) {
        console.error('Failed to fetch user email:', error);
      } finally {
        setIsLoadingUserEmail(false);
      }
    };

    loadUserEmail();
  }, [token]);

  const handleGenerateAuthCode = async () => {
    if (!token) return;
    
    setIsGenerating(true);
    setAuthCodeResponse(null);
    setCopiedToClipboard(false);
    
    try {
      const response = await createAuthCode(token, durationMinutes, uses);
      setAuthCodeResponse(response);
      
      if (response.error) {
        toast.error(response.error.message);
      } else {
        toast.success('Authentication code generated successfully!');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate authentication code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAuthCode = async () => {
    if (!authCodeResponse?.auth_code) return;
    
    try {
      await navigator.clipboard.writeText(authCodeResponse.auth_code);
      setCopiedToClipboard(true);
      toast.success('Authentication code copied to clipboard!');
      
      // Reset the copied state after 3 seconds
      setTimeout(() => {
        setCopiedToClipboard(false);
      }, 3000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
      } else {
        return `${hours}h ${remainingMinutes}m`;
      }
    } else {
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      if (remainingHours === 0) {
        return `${days} day${days !== 1 ? 's' : ''}`;
      } else {
        return `${days}d ${remainingHours}h`;
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-staggerFadeUp" style={{ animationDelay: '0.05s' }}>
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-gray-600 to-slate-600 rounded-xl">
              <Settings className="text-white" size={28} />
            </div>
            Account Settings
          </h2>
          <p className="text-gray-400 mt-2">
            Manage your account preferences and generate authentication tokens
          </p>
        </div>
      </div>

      {/* Authentication Token Generator */}
      <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700 animate-staggerFadeUp" style={{ animationDelay: '0.1s' }}>
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 border-b border-gray-600">
          <div className="flex items-center gap-3">
            <Key size={20} className="text-white" />
            <div>
              <h3 className="font-medium text-white">Generate Authentication Token</h3>
              <p className="text-blue-100 text-sm mt-1">Create temporary authentication codes for secure access to development applications</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Security Information</span>
            </div>
            <p className="text-xs text-blue-200 mb-2">
              Authentication codes are temporary tokens that can be used to log into your account.
            </p>
            <div className="text-xs text-blue-300">
              <strong>Important:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Codes expire after the specified duration</li>
                <li>Each code has a limited number of uses</li>
                <li>Keep codes secure and don't share them publicly</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                <Clock size={16} className="inline mr-2" />
                Duration (minutes)
              </label>
              <div className="space-y-3">
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="10080"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-white"
                  disabled={isGenerating}
                />
                <div className="text-sm text-gray-400">
                  Duration: <span className="text-blue-400 font-medium">{formatDuration(durationMinutes)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[1, 5, 15, 60, 240, 1440].map((minutes) => (
                    <button
                      key={minutes}
                      onClick={() => setDurationMinutes(minutes)}
                      className={`px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
                        durationMinutes === minutes
                          ? 'bg-blue-600 text-white border border-blue-500'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                      }`}
                      disabled={isGenerating}
                    >
                      {formatDuration(minutes)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                <Users size={16} className="inline mr-2" />
                Number of Uses
              </label>
              <div className="space-y-3">
                <input
                  type="number"
                  value={uses}
                  onChange={(e) => setUses(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-white"
                  disabled={isGenerating}
                />
                <div className="text-sm text-gray-400">
                  Uses: <span className="text-blue-400 font-medium">{uses} time{uses !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[1, 3, 5, 10, 25].map((useCount) => (
                    <button
                      key={useCount}
                      onClick={() => setUses(useCount)}
                      className={`px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
                        uses === useCount
                          ? 'bg-blue-600 text-white border border-blue-500'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                      }`}
                      disabled={isGenerating}
                    >
                      {useCount} use{useCount !== 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerateAuthCode}
            disabled={isGenerating}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-medium transition-all duration-200 ${
              isGenerating
                ? 'bg-gray-600 cursor-not-allowed border border-gray-600 text-gray-400'
                : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 hover:shadow-lg transform hover:scale-[1.02]'
            }`}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Authentication Code...
              </>
            ) : (
              <>
                <Key size={20} />
                Generate Authentication Code
              </>
            )}
          </button>

          {authCodeResponse && (
            <div className="mt-6 space-y-4">
              {authCodeResponse.error ? (
                <div className="bg-red-900/50 border border-red-700 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-300">Error generating authentication code</h4>
                    <p className="text-red-200 text-sm mt-1">{authCodeResponse.error.message}</p>
                    {authCodeResponse.error.auth_code_limit_exceeded && (
                      <p className="text-red-200 text-sm mt-2">
                        <strong>Rate Limit:</strong> You have exceeded the authentication code creation limit. Please wait before creating more codes.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-green-900/50 border border-green-700 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={20} className="text-green-400" />
                    <h4 className="font-medium text-green-300">Authentication Code Generated Successfully</h4>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-green-800/30 p-3 rounded border border-green-600">
                        <div className="text-green-300">Duration</div>
                        <div className="text-green-100 font-medium">
                          {formatDuration(authCodeResponse.duration_minutes || durationMinutes)}
                        </div>
                      </div>
                      <div className="bg-green-800/30 p-3 rounded border border-green-600">
                        <div className="text-green-300">Uses Remaining</div>
                        <div className="text-green-100 font-medium">
                          {authCodeResponse.uses || uses} time{(authCodeResponse.uses || uses) !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-green-300">Authentication Code</label>
                        <button
                          onClick={handleCopyAuthCode}
                          className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
                            copiedToClipboard
                              ? 'bg-green-600 text-white border border-green-500'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                          }`}
                        >
                          {copiedToClipboard ? (
                            <>
                              <CheckCircle size={14} />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <div className="bg-gray-900 p-4 rounded-lg border border-gray-600 font-mono text-sm break-all">
                        <code className="text-green-400 select-all">
                          {authCodeResponse.auth_code}
                        </code>
                      </div>
                      <p className="text-xs text-green-300 mt-2">
                        This code can be used to authenticate and access your account. Keep it secure and don't share it publicly.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Password Reset */}
      <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700 animate-staggerFadeUp" style={{ animationDelay: '0.15s' }}>
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 border-b border-gray-600">
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-white" />
            <div>
              <h3 className="font-medium text-white">Password Reset</h3>
              <p className="text-blue-100 text-sm mt-1">Request a password reset link to change your account password</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-300 mb-4">
            If you need to change your password, we can send a reset link to your registered email address.
            Click the button below to request a password reset email.
          </p>

          <button
            onClick={() => setIsPasswordResetModalOpen(true)}
            disabled={isLoadingUserEmail || !userEmail}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              isLoadingUserEmail || !userEmail
                ? 'bg-gray-600 cursor-not-allowed border border-gray-600 text-gray-400'
                : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 hover:shadow-lg transform hover:scale-[1.02]'
            }`}
          >
            {isLoadingUserEmail ? (
              <>
                <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              <>
                <Lock size={18} />
                Reset Password
              </>
            )}
          </button>
        </div>
      </div>

      {/* Subscription Management */}
      <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700 animate-staggerFadeUp" style={{ animationDelay: '0.2s' }}>
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 border-b border-gray-600">
          <div className="flex items-center gap-3">
            <CreditCard size={20} className="text-white" />
            <div>
              <h3 className="font-medium text-white">Subscription Management</h3>
              <p className="text-green-100 text-sm mt-1">Access your Stripe subscription portal to manage billing and payment details</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-300 mb-4">
            Access your subscription portal to manage your billing details, update payment methods, view invoices, and modify your subscription plan.
          </p>

          <a
            href="https://pay.ur.io/p/login/00g16I4Mag2O240aEE"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 bg-green-600 hover:bg-green-700 text-white border border-green-500 hover:shadow-lg transform hover:scale-[1.02]"
          >
            <CreditCard size={18} />
            Open Subscription Portal
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      <PasswordResetModal
        isOpen={isPasswordResetModalOpen}
        onClose={() => setIsPasswordResetModalOpen(false)}
        userEmail={userEmail}
      />
    </div>
  );
};

export default AccountSettingsSection;
