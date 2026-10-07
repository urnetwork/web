import React, { useState, useEffect } from 'react';
import { Settings, Key, Copy, Clock, Users, AlertCircle, CheckCircle, Shield, Lock, CreditCard, ExternalLink, Server, ChevronDown, ChevronUp, MapPin, Wifi, Eye, EyeOff, Network, Download, Smartphone, Trash2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createAuthCode, fetchNetworkUser, createAuthClient } from '../services/api';
import type { CreateAuthCodeResponse, AuthClientResponse } from '../services/api';
import type { Location } from '../services/types';
import toast from 'react-hot-toast';
import PasswordResetModal from './PasswordResetModal';
import DeleteAccountModal from './DeleteAccountModal';
import LocationSelectorModal from './LocationSelectorModal';
import WireGuardQRModal from './WireGuardQRModal';
import SignInMethodsSection from './SignInMethodsSection';
import NetworkNameSection from './NetworkNameSection';

const AccountSettingsSection: React.FC = () => {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [uses, setUses] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [authCodeResponse, setAuthCodeResponse] = useState<CreateAuthCodeResponse | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoadingUserEmail, setIsLoadingUserEmail] = useState(true);

  const [description, setDescription] = useState('');
  const [deviceSpec, setDeviceSpec] = useState('');
  const [countryCode, setCountryCode] = useState('us');
  const [isGeneratingAuthClient, setIsGeneratingAuthClient] = useState(false);
  const [authClientResponse, setAuthClientResponse] = useState<AuthClientResponse | null>(null);
  const [copiedFields, setCopiedFields] = useState<Record<string, boolean>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showWgQR, setShowWgQR] = useState(false);

  const [clientId, setClientId] = useState('');
  const [sourceClientId, setSourceClientId] = useState('');
  const [derivedClientId, setDerivedClientId] = useState('');

  const [lockCallerIp, setLockCallerIp] = useState(false);
  const [lockIpList, setLockIpList] = useState('');
  const [httpsRequireAuth, setHttpsRequireAuth] = useState(false);

  const [locationClientId, setLocationClientId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [locationGroupId, setLocationGroupId] = useState('');
  const [bestAvailable, setBestAvailable] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [locationType, setLocationType] = useState('');

  const [windowType, setWindowType] = useState('quality');
  const [windowSizeMin, setWindowSizeMin] = useState('');
  const [windowSizeMinP2pOnly, setWindowSizeMinP2pOnly] = useState('');
  const [windowSizeMax, setWindowSizeMax] = useState('');
  const [windowSizeHardMax, setWindowSizeHardMax] = useState('');
  const [windowSizeReconnectScale, setWindowSizeReconnectScale] = useState('');
  const [keepHealthiestCount, setKeepHealthiestCount] = useState('');
  const [ulimit, setUlimit] = useState('');

  const [enableWg, setEnableWg] = useState(false);
  const [showWgPrivateKey, setShowWgPrivateKey] = useState(false);

  const hasAdvancedLocation = !!(locationClientId || locationId || locationGroupId || bestAvailable || locationName || locationType);

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

  const handleGenerateAuthClient = async () => {
    if (!token) return;

    setIsGeneratingAuthClient(true);
    setAuthClientResponse(null);
    setCopiedFields({});

    try {
      const request: {
        client_id?: string;
        source_client_id?: string;
        description?: string;
        device_spec?: string;
        derived_client_id?: string;
        proxy_config?: {
          lock_caller_ip?: boolean;
          lock_ip_list?: string[];
          https_require_auth?: boolean;
          initial_device_state?: {
            country_code?: string;
            location?: {
              connect_location_id?: {
                client_id?: string;
                location_id?: string;
                location_group_id?: string;
                best_available?: boolean;
              };
              name?: string;
              location_type?: string;
            };
            performance_profile?: {
              window_type?: string;
              window_size_settings?: {
                window_size_min?: number;
                window_size_min_p2p_only?: number;
                window_size_max?: number;
                window_size_hard_max?: number;
                window_size_reconnect_scale?: number;
                keep_healthiest_count?: number;
                ulimit?: number;
              };
            };
          };
        };
      } = {};

      if (clientId) request.client_id = clientId;
      if (sourceClientId) request.source_client_id = sourceClientId;
      if (description) request.description = description;
      if (deviceSpec) request.device_spec = deviceSpec;
      if (derivedClientId) request.derived_client_id = derivedClientId;

      const hasProxyConfig = showAdvanced || countryCode || enableWg;
      if (hasProxyConfig) {
        request.proxy_config = {};

        if (enableWg) request.proxy_config.enable_wg = true;

        if (showAdvanced) {
          if (lockCallerIp) request.proxy_config.lock_caller_ip = lockCallerIp;
          if (lockIpList) {
            request.proxy_config.lock_ip_list = lockIpList
              .split(',')
              .map(ip => ip.trim())
              .filter(ip => ip.length > 0);
          }
          if (httpsRequireAuth) request.proxy_config.https_require_auth = httpsRequireAuth;
        }

        const hasInitialDeviceState = (!hasAdvancedLocation && countryCode) || hasAdvancedLocation || windowType || windowSizeMin || windowSizeMinP2pOnly || windowSizeMax || windowSizeHardMax || windowSizeReconnectScale || keepHealthiestCount || ulimit;
        if (hasInitialDeviceState) {
          request.proxy_config.initial_device_state = {};

          if (!hasAdvancedLocation && countryCode) {
            request.proxy_config.initial_device_state.country_code = countryCode;
          }

          if (hasAdvancedLocation) {
            request.proxy_config.initial_device_state.location = {};

            const hasConnectLocationId = locationClientId || locationId || locationGroupId || bestAvailable;
            if (hasConnectLocationId) {
              request.proxy_config.initial_device_state.location.connect_location_id = {};
              if (locationClientId) request.proxy_config.initial_device_state.location.connect_location_id.client_id = locationClientId;
              if (locationId) request.proxy_config.initial_device_state.location.connect_location_id.location_id = locationId;
              if (locationGroupId) request.proxy_config.initial_device_state.location.connect_location_id.location_group_id = locationGroupId;
              if (bestAvailable) request.proxy_config.initial_device_state.location.connect_location_id.best_available = bestAvailable;
            }

            if (locationName) request.proxy_config.initial_device_state.location.name = locationName;
            if (locationType) request.proxy_config.initial_device_state.location.location_type = locationType;
          }

          const hasPerformanceProfile = windowType || windowSizeMin || windowSizeMinP2pOnly || windowSizeMax || windowSizeHardMax || windowSizeReconnectScale || keepHealthiestCount || ulimit;
          if (hasPerformanceProfile) {
            request.proxy_config.initial_device_state.performance_profile = {};

            if (windowType) request.proxy_config.initial_device_state.performance_profile.window_type = windowType;

            const hasWindowSizeSettings = windowSizeMin || windowSizeMinP2pOnly || windowSizeMax || windowSizeHardMax || windowSizeReconnectScale || keepHealthiestCount || ulimit;
            if (hasWindowSizeSettings) {
              request.proxy_config.initial_device_state.performance_profile.window_size_settings = {};
              if (windowSizeMin) request.proxy_config.initial_device_state.performance_profile.window_size_settings.window_size_min = parseInt(windowSizeMin);
              if (windowSizeMinP2pOnly) request.proxy_config.initial_device_state.performance_profile.window_size_settings.window_size_min_p2p_only = parseInt(windowSizeMinP2pOnly);
              if (windowSizeMax) request.proxy_config.initial_device_state.performance_profile.window_size_settings.window_size_max = parseInt(windowSizeMax);
              if (windowSizeHardMax) request.proxy_config.initial_device_state.performance_profile.window_size_settings.window_size_hard_max = parseInt(windowSizeHardMax);
              if (windowSizeReconnectScale) request.proxy_config.initial_device_state.performance_profile.window_size_settings.window_size_reconnect_scale = parseInt(windowSizeReconnectScale);
              if (keepHealthiestCount) request.proxy_config.initial_device_state.performance_profile.window_size_settings.keep_healthiest_count = parseInt(keepHealthiestCount);
              if (ulimit) request.proxy_config.initial_device_state.performance_profile.window_size_settings.ulimit = parseInt(ulimit);
            }
          }
        }
      }

      const response = await createAuthClient(token, request);
      setAuthClientResponse(response);

      if (response.error) {
        toast.error(response.error.message);
      } else {
        toast.success('Auth client generated successfully!');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate auth client');
    } finally {
      setIsGeneratingAuthClient(false);
    }
  };

  const handleCopyField = async (fieldName: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedFields({ ...copiedFields, [fieldName]: true });
      toast.success(`${fieldName} copied to clipboard!`);

      setTimeout(() => {
        setCopiedFields(prev => ({ ...prev, [fieldName]: false }));
      }, 3000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleLocationSelect = (location: Location) => {
    if (location.location_type === 'country') {
      setCountryCode(location.country_code?.toLowerCase() || '');
      setLocationClientId('');
      setLocationId('');
      setLocationGroupId('');
      setLocationName('');
      setLocationType('');
      setBestAvailable(false);
    } else {
      setLocationId(location.location_id);
      setLocationType(location.location_type);
      setLocationName(location.name);
      setLocationClientId('');
      setLocationGroupId('');
      setBestAvailable(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-staggerFadeUp" style={{ animationDelay: '0.05s' }}>
        <div>
          <h2 className="text-3xl font-bold text-ur-white flex items-center gap-3">
            <div className="p-2 bg-ur-gray rounded-ur">
              <Settings className="text-ur-black" size={28} />
            </div>
            Account Settings
          </h2>
          <p className="text-ur-gray mt-2">
            Manage your account preferences and generate authentication tokens
          </p>
        </div>
      </div>

      {/* Authentication Token Generator */}
      <div className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden border border-ur-border animate-staggerFadeUp" style={{ animationDelay: '0.1s' }}>
        <div className="bg-ur-raised px-6 py-4 border-b border-ur-border">
          <div className="flex items-center gap-3">
            <Key size={20} className="text-ur-blue-light" />
            <div>
              <h3 className="font-medium text-ur-white">Generate Authentication Token</h3>
              <p className="text-ur-gray text-sm mt-1">Create temporary authentication codes for secure access to development applications</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-ur-blue/15 p-4 rounded-lg border border-ur-blue/40">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-ur-blue-light" />
              <span className="text-sm font-medium text-ur-blue-light">Security Information</span>
            </div>
            <p className="text-xs text-ur-blue-light mb-2">
              Authentication codes are temporary tokens that can be used to log into your account.
            </p>
            <div className="text-xs text-ur-blue-light">
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
              <label className="block text-sm font-medium text-ur-gray mb-3">
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
                  className="w-full px-4 py-3 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white"
                  disabled={isGenerating}
                />
                <div className="text-sm text-ur-gray">
                  Duration: <span className="text-ur-blue-light font-medium">{formatDuration(durationMinutes)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[1, 5, 15, 60, 240, 1440].map((minutes) => (
                    <button
                      key={minutes}
                      onClick={() => setDurationMinutes(minutes)}
                      className={`px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
 durationMinutes === minutes
 ? 'bg-ur-blue text-ur-white border border-ur-blue'
 : 'bg-ur-raised text-ur-gray hover:bg-ur-hover border border-ur-border'
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
              <label className="block text-sm font-medium text-ur-gray mb-3">
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
                  className="w-full px-4 py-3 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white"
                  disabled={isGenerating}
                />
                <div className="text-sm text-ur-gray">
                  Uses: <span className="text-ur-blue-light font-medium">{uses} time{uses !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[1, 3, 5, 10, 25].map((useCount) => (
                    <button
                      key={useCount}
                      onClick={() => setUses(useCount)}
                      className={`px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
 uses === useCount
 ? 'bg-ur-blue text-ur-white border border-ur-blue'
 : 'bg-ur-raised text-ur-gray hover:bg-ur-hover border border-ur-border'
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
 ? 'bg-ur-hover cursor-not-allowed border border-ur-border text-ur-gray'
 : 'bg-ur-blue hover:bg-ur-blue-hover text-ur-white border border-ur-blue transform hover:scale-[1.02]'
 }`}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-ur-gray" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                <div className="bg-ur-coral/15 border border-ur-coral p-4 rounded-ur flex items-start gap-3">
                  <AlertCircle size={20} className="text-ur-coral mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-ur-coral">Error generating authentication code</h4>
                    <p className="text-ur-coral text-sm mt-1">{authCodeResponse.error.message}</p>
                    {authCodeResponse.error.auth_code_limit_exceeded && (
                      <p className="text-ur-coral text-sm mt-2">
                        <strong>Rate Limit:</strong> You have exceeded the authentication code creation limit. Please wait before creating more codes.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-ur-blue/10 border border-ur-blue/40 p-4 rounded-ur">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={20} className="text-ur-green" />
                    <h4 className="font-medium text-ur-green">Authentication Code Generated Successfully</h4>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-ur-blue/10 p-3 rounded border border-ur-blue/40">
                        <div className="text-ur-green">Duration</div>
                        <div className="text-ur-white font-medium">
                          {formatDuration(authCodeResponse.duration_minutes || durationMinutes)}
                        </div>
                      </div>
                      <div className="bg-ur-blue/10 p-3 rounded border border-ur-blue/40">
                        <div className="text-ur-green">Uses Remaining</div>
                        <div className="text-ur-white font-medium">
                          {authCodeResponse.uses || uses} time{(authCodeResponse.uses || uses) !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-ur-green">Authentication Code</label>
                        <button
                          onClick={handleCopyAuthCode}
                          className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
 copiedToClipboard
 ? 'bg-ur-green text-ur-black border border-ur-green'
 : 'bg-ur-raised text-ur-gray hover:bg-ur-hover border border-ur-border'
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
                      <div className="bg-ur-black p-4 rounded-lg border border-ur-border font-mono text-sm break-all">
                        <code className="text-ur-green select-all">
                          {authCodeResponse.auth_code}
                        </code>
                      </div>
                      <p className="text-xs text-ur-gray mt-2">
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

      {/* Generate Auth Client */}
      <div className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden border border-ur-border animate-staggerFadeUp" style={{ animationDelay: '0.125s' }}>
        <div className="bg-ur-raised px-6 py-4 border-b border-ur-border">
          <div className="flex items-center gap-3">
            <Server size={20} className="text-ur-blue-light" />
            <div>
              <h3 className="font-medium text-ur-white">Generate Auth Client</h3>
              <p className="text-ur-gray text-sm mt-1">Create authenticated proxy client URLs for network access</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-ur-blue/10 p-4 rounded-lg border border-ur-blue/40">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-ur-blue-light" />
              <span className="text-sm font-medium text-ur-blue-light">What is an Auth Client?</span>
            </div>
            <p className="text-xs text-ur-gray mb-2">
              Auth clients provide secure proxy access to URnetwork. Generate credentials to connect applications, scripts, or devices through HTTPS, SOCKS5 or WireGuard.
            </p>
            <div className="text-xs text-ur-gray">
              <strong>Use Cases:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Route application traffic through specific geographic locations</li>
                <li>Access secure proxy credentials for development and testing</li>
                <li>Configure network clients with custom device specifications</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-ur-gray mb-2">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Development proxy"
                className="w-full px-4 py-3 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark"
                disabled={isGeneratingAuthClient}
              />
              <p className="text-xs text-ur-gray mt-1">Sets the device name for new devices</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-ur-gray mb-2">
                Device Spec (optional)
              </label>
              <input
                type="text"
                value={deviceSpec}
                onChange={(e) => setDeviceSpec(e.target.value)}
                placeholder="e.g., Linux x64"
                className="w-full px-4 py-3 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark"
                disabled={isGeneratingAuthClient}
              />
              <p className="text-xs text-ur-gray mt-1">Sets the device specification for new devices</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ur-gray mb-3">
              Country Code
            </label>
            <input
              type="text"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toLowerCase())}
              placeholder="us"
              maxLength={2}
              className={`w-full px-4 py-3 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark mb-3 ${hasAdvancedLocation ? 'opacity-40 cursor-not-allowed' : ''}`}
              disabled={isGeneratingAuthClient || hasAdvancedLocation}
            />
            <button
              onClick={() => setIsLocationSelectorOpen(true)}
              disabled={isGeneratingAuthClient}
              className="flex items-center gap-2 px-4 py-2 bg-ur-raised hover:bg-ur-hover text-ur-white rounded-lg transition-all duration-200 border border-ur-border hover:border-ur-green text-sm w-full justify-center mb-2"
            >
              <MapPin size={16} />
              Browse All Locations
            </button>
            {hasAdvancedLocation ? (
              <p className="text-xs text-ur-yellow-light">Country code disabled -- advanced location settings are active. Selecting a country above will clear them.</p>
            ) : (
              <p className="text-xs text-ur-gray">2-letter ISO country code for proxy location. Selecting a city or region will use advanced location settings instead.</p>
            )}
          </div>

          <div className="bg-ur-raised/40 rounded-lg border border-ur-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-ur-blue/15 rounded-lg border border-ur-blue/40">
                  <Wifi size={16} className="text-ur-blue-light" />
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer" htmlFor="enableWgToggle">
                    <span className="text-sm font-medium text-ur-white">Enable WireGuard</span>
                  </label>
                  <p className="text-xs text-ur-gray mt-0.5">Generate a WireGuard VPN configuration alongside proxy credentials</p>
                </div>
              </div>
              <button
                id="enableWgToggle"
                role="switch"
                aria-checked={enableWg}
                onClick={() => setEnableWg(!enableWg)}
                disabled={isGeneratingAuthClient}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ur-blue focus:ring-offset-2 focus:ring-offset-ur-black ${
 enableWg ? 'bg-ur-blue' : 'bg-ur-hover'
 } ${isGeneratingAuthClient ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
 enableWg ? 'translate-x-6' : 'translate-x-1'
 }`}
                />
              </button>
            </div>
          </div>

          <div className="border-t border-ur-border pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full px-4 py-3 bg-ur-raised/50 hover:bg-ur-raised rounded-lg transition-all duration-200 text-left border border-ur-border"
              disabled={isGeneratingAuthClient}
            >
              <span className="text-ur-gray font-medium">Advanced Options</span>
              {showAdvanced ? <ChevronUp size={20} className="text-ur-gray" /> : <ChevronDown size={20} className="text-ur-gray" />}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-6 bg-ur-raised p-6 rounded-lg border border-ur-border">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-ur-green mb-3">Client Configuration</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ur-gray mb-2">
                        Client ID
                      </label>
                      <input
                        type="text"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="Client ID"
                        className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark text-sm"
                        disabled={isGeneratingAuthClient}
                      />
                      <p className="text-xs text-ur-gray mt-1">Optional. Must currently exist in the network. Omit to assign a new client id.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ur-gray mb-2">
                        Source Client ID
                      </label>
                      <input
                        type="text"
                        value={sourceClientId}
                        onChange={(e) => setSourceClientId(e.target.value)}
                        placeholder="Source Client ID"
                        className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark text-sm"
                        disabled={isGeneratingAuthClient}
                      />
                      <p className="text-xs text-ur-gray mt-1">Optional. The source client id when creating an ancillary client id.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ur-gray mb-2">
                        Derived Client ID
                      </label>
                      <input
                        type="text"
                        value={derivedClientId}
                        onChange={(e) => setDerivedClientId(e.target.value)}
                        placeholder="Derived Client ID"
                        className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark text-sm"
                        disabled={isGeneratingAuthClient}
                      />
                      <p className="text-xs text-ur-gray mt-1">Optional. The client that the new client is derived from. If called with a client JWT, the derived client id is inferred from the JWT.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-ur-border">
                  <h4 className="text-sm font-semibold text-ur-green mb-3">Proxy Configuration</h4>

                  <div className="space-y-3">
                    <div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lockCallerIp}
                          onChange={(e) => setLockCallerIp(e.target.checked)}
                          className="w-4 h-4 bg-ur-raised border-ur-border rounded focus:ring-2 focus:ring-ur-blue"
                          disabled={isGeneratingAuthClient}
                        />
                        <span className="text-sm text-ur-gray">Lock Caller IP</span>
                      </label>
                      <p className="text-xs text-ur-gray mt-1 ml-7">Allow only the caller's IP subnet to access the proxy</p>
                    </div>

                    <div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={httpsRequireAuth}
                          onChange={(e) => setHttpsRequireAuth(e.target.checked)}
                          className="w-4 h-4 bg-ur-raised border-ur-border rounded focus:ring-2 focus:ring-ur-blue"
                          disabled={isGeneratingAuthClient}
                        />
                        <span className="text-sm text-ur-gray">HTTPS Require Auth</span>
                      </label>
                      <p className="text-xs text-ur-gray mt-1 ml-7">Not needed if the client supports ECH</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ur-gray mb-2">
                        Lock IP List (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={lockIpList}
                        onChange={(e) => setLockIpList(e.target.value)}
                        placeholder="e.g., 192.168.1.1, 10.0.0.1"
                        className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark text-sm"
                        disabled={isGeneratingAuthClient}
                      />
                      <p className="text-xs text-ur-gray mt-1">Allow only IPs/subnets in the list. Converted to internal IP subnet width.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-ur-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Network size={16} className="text-ur-blue-light" />
                    <h4 className="text-sm font-semibold text-ur-blue-light">WireGuard Settings</h4>
                  </div>

                  <div className="bg-ur-blue/10 border border-ur-blue/40 rounded-lg p-3">
                    <p className="text-xs text-ur-blue-light">
                      When WireGuard is enabled above, the server will return a complete WireGuard configuration including client keys, assigned IPv4 address, and a ready-to-use config file that can be imported directly into any WireGuard client.
                    </p>
                  </div>

                  <div className="flex items-center justify-between bg-ur-raised/50 rounded-lg p-3 border border-ur-border">
                    <div>
                      <p className="text-sm text-ur-gray font-medium">WireGuard Status</p>
                      <p className="text-xs text-ur-gray mt-0.5">Controlled by the toggle above</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
 enableWg
 ? 'bg-ur-blue/15 text-ur-blue-light border-ur-blue/40'
 : 'bg-ur-raised text-ur-gray border-ur-border'
 }`}>
                      {enableWg ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <div className="bg-ur-raised/30 rounded-lg p-3 border border-ur-border/50 space-y-1.5">
                    <p className="text-xs font-medium text-ur-gray mb-2">When enabled, the response will include:</p>
                    <div className="flex items-center gap-2 text-xs text-ur-gray">
                      <span className="w-1.5 h-1.5 rounded-full bg-ur-blue flex-shrink-0" />
                      WireGuard proxy port number
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ur-gray">
                      <span className="w-1.5 h-1.5 rounded-full bg-ur-blue flex-shrink-0" />
                      Client key pair (private + public)
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ur-gray">
                      <span className="w-1.5 h-1.5 rounded-full bg-ur-blue flex-shrink-0" />
                      Assigned IPv4 address for the tunnel
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ur-gray">
                      <span className="w-1.5 h-1.5 rounded-full bg-ur-blue flex-shrink-0" />
                      Server public key for peer configuration
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ur-gray">
                      <span className="w-1.5 h-1.5 rounded-full bg-ur-blue flex-shrink-0" />
                      Ready-to-import .conf file contents
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-ur-border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-ur-green">Location Settings</h4>
                    {hasAdvancedLocation && (
                      <span className="text-xs bg-ur-yellow-light/10 text-ur-yellow-light border border-ur-yellow-light/30 px-2 py-0.5 rounded-full">Overrides country code</span>
                    )}
                  </div>
                  {hasAdvancedLocation && (
                    <p className="text-xs text-ur-yellow-light -mt-2">These settings override the country code field above. Only the location object will be sent.</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ur-gray mb-2">
                        Location Client ID
                      </label>
                      <input
                        type="text"
                        value={locationClientId}
                        onChange={(e) => setLocationClientId(e.target.value)}
                        placeholder="Location Client ID"
                        className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark text-sm"
                        disabled={isGeneratingAuthClient}
                      />
                      <p className="text-xs text-ur-gray mt-1">Optional. Specific client ID for location targeting</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ur-gray mb-2">
                        Location ID
                      </label>
                      <input
                        type="text"
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                        placeholder="Location ID"
                        className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark text-sm"
                        disabled={isGeneratingAuthClient}
                      />
                      <p className="text-xs text-ur-gray mt-1">Optional. Specific location identifier</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ur-gray mb-2">
                        Location Group ID
                      </label>
                      <input
                        type="text"
                        value={locationGroupId}
                        onChange={(e) => setLocationGroupId(e.target.value)}
                        placeholder="Location Group ID"
                        className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark text-sm"
                        disabled={isGeneratingAuthClient}
                      />
                      <p className="text-xs text-ur-gray mt-1">Optional. Group of locations to target</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ur-gray mb-2">
                        Location Name
                      </label>
                      <input
                        type="text"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder="Location Name"
                        className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark text-sm"
                        disabled={isGeneratingAuthClient}
                      />
                      <p className="text-xs text-ur-gray mt-1">Optional. Human-readable location name</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ur-gray mb-2">
                        Location Type
                      </label>
                      <select
                        value={locationType}
                        onChange={(e) => setLocationType(e.target.value)}
                        className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white text-sm"
                        disabled={isGeneratingAuthClient}
                      >
                        <option value="">-- Select --</option>
                        <option value="country">Country</option>
                        <option value="region">Region</option>
                        <option value="city">City</option>
                      </select>
                      <p className="text-xs text-ur-gray mt-1">Granularity level for location targeting</p>
                    </div>

                    <div className="flex items-center">
                      <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bestAvailable}
                            onChange={(e) => setBestAvailable(e.target.checked)}
                            className="w-4 h-4 bg-ur-raised border-ur-border rounded focus:ring-2 focus:ring-ur-blue"
                            disabled={isGeneratingAuthClient}
                          />
                          <span className="text-sm text-ur-gray">Best Available</span>
                        </label>
                        <p className="text-xs text-ur-gray mt-1 ml-7">Automatically select the best available location</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-ur-border">
                  <h4 className="text-sm font-semibold text-ur-green mb-3">Performance Profile</h4>

                  <div>
                    <label className="block text-sm font-medium text-ur-gray mb-2">
                      Window Type
                    </label>
                    <select
                      value={windowType}
                      onChange={(e) => setWindowType(e.target.value)}
                      className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white text-sm"
                      disabled={isGeneratingAuthClient}
                    >
                      <option value="quality">Quality</option>
                      <option value="speed">Speed</option>
                    </select>
                    <p className="text-xs text-ur-gray mt-1">Default is 'quality'. Choose between quality and speed optimization.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ur-gray mb-2">
                        Window Size Min
                      </label>
                      <input
                        type="number"
                        value={windowSizeMin}
                        onChange={(e) => setWindowSizeMin(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark text-sm"
                        disabled={isGeneratingAuthClient}
                      />
                      <p className="text-xs text-ur-gray mt-1">Minimum connection window size</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ur-gray mb-2">
                        Window Size Min P2P Only
                      </label>
                      <input
                        type="number"
                        value={windowSizeMinP2pOnly}
                        onChange={(e) => setWindowSizeMinP2pOnly(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark text-sm"
                        disabled={isGeneratingAuthClient}
                      />
                      <p className="text-xs text-ur-gray mt-1">Min items connected via P2P only. Leave 0 for default.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ur-gray mb-2">
                        Window Size Max
                      </label>
                      <input
                        type="number"
                        value={windowSizeMax}
                        onChange={(e) => setWindowSizeMax(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark text-sm"
                        disabled={isGeneratingAuthClient}
                      />
                      <p className="text-xs text-ur-gray mt-1">Inclusive soft limit. When max equals min, fixed size mode is enabled.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ur-gray mb-2">
                        Window Size Hard Max
                      </label>
                      <input
                        type="number"
                        value={windowSizeHardMax}
                        onChange={(e) => setWindowSizeHardMax(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark text-sm"
                        disabled={isGeneratingAuthClient}
                      />
                      <p className="text-xs text-ur-gray mt-1">Leave 0 to disable (no hard limit)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ur-gray mb-2">
                        Window Size Reconnect Scale
                      </label>
                      <input
                        type="number"
                        value={windowSizeReconnectScale}
                        onChange={(e) => setWindowSizeReconnectScale(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark text-sm"
                        disabled={isGeneratingAuthClient}
                      />
                      <p className="text-xs text-ur-gray mt-1">Clients per source per stream</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ur-gray mb-2">
                        Keep Healthiest Count
                      </label>
                      <input
                        type="number"
                        value={keepHealthiestCount}
                        onChange={(e) => setKeepHealthiestCount(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark text-sm"
                        disabled={isGeneratingAuthClient}
                      />
                      <p className="text-xs text-ur-gray mt-1">Leave 0 to disable</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ur-gray mb-2">
                        ULimit
                      </label>
                      <input
                        type="number"
                        value={ulimit}
                        onChange={(e) => setUlimit(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark text-sm"
                        disabled={isGeneratingAuthClient}
                      />
                      <p className="text-xs text-ur-gray mt-1">Leave 0 to disable (no limit)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerateAuthClient}
            disabled={isGeneratingAuthClient}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-medium transition-all duration-200 ${
 isGeneratingAuthClient
 ? 'bg-ur-hover cursor-not-allowed border border-ur-border text-ur-gray'
 : 'bg-ur-blue hover:bg-ur-blue-hover text-ur-white border border-ur-blue transform hover:scale-[1.02]'
 }`}
          >
            {isGeneratingAuthClient ? (
              <>
                <svg className="animate-spin h-5 w-5 text-ur-gray" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Auth Client...
              </>
            ) : (
              <>
                <Server size={20} />
                Generate Auth Client
              </>
            )}
          </button>

          {authClientResponse && (
            <div className="mt-6 space-y-4">
              {authClientResponse.error ? (
                <div className="bg-ur-coral/15 border border-ur-coral p-4 rounded-ur flex items-start gap-3">
                  <AlertCircle size={20} className="text-ur-coral mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-ur-coral">Error generating auth client</h4>
                    <p className="text-ur-coral text-sm mt-1">{authClientResponse.error.message}</p>
                    {authClientResponse.error.client_limit_exceeded && (
                      <p className="text-ur-coral text-sm mt-2">
                        <strong>Rate Limit:</strong> You have exceeded the client creation limit. Please remove unused clients before creating new ones.
                      </p>
                    )}
                  </div>
                </div>
              ) : authClientResponse.proxy_config_result && (
                <div className="bg-ur-blue/10 border border-ur-blue/40 p-4 rounded-ur">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={20} className="text-ur-green" />
                    <h4 className="font-medium text-ur-green">Auth Client Generated Successfully</h4>
                  </div>

                  <div className="space-y-3">
                    {authClientResponse.by_client_jwt && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-ur-green">Client JWT Token</label>
                          <button
                            onClick={() => handleCopyField('Client JWT', authClientResponse.by_client_jwt!)}
                            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
 copiedFields['Client JWT']
 ? 'bg-ur-green text-ur-black border border-ur-green'
 : 'bg-ur-raised text-ur-gray hover:bg-ur-hover border border-ur-border'
 }`}
                          >
                            {copiedFields['Client JWT'] ? (
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
                        <div className="bg-ur-black p-3 rounded-lg border border-ur-border font-mono text-xs break-all">
                          <code className="text-ur-green select-all">
                            {authClientResponse.by_client_jwt}
                          </code>
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-ur-green">HTTPS Proxy URL</label>
                        <button
                          onClick={() => handleCopyField('HTTPS Proxy URL', authClientResponse.proxy_config_result!.https_proxy_url)}
                          className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
 copiedFields['HTTPS Proxy URL']
 ? 'bg-ur-green text-ur-black border border-ur-green'
 : 'bg-ur-raised text-ur-gray hover:bg-ur-hover border border-ur-border'
 }`}
                        >
                          {copiedFields['HTTPS Proxy URL'] ? (
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
                      <div className="bg-ur-black p-3 rounded-lg border border-ur-border font-mono text-xs break-all">
                        <code className="text-ur-green select-all">
                          {authClientResponse.proxy_config_result.https_proxy_url}
                        </code>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-ur-green">SOCKS Proxy URL</label>
                        <button
                          onClick={() => handleCopyField('SOCKS Proxy URL', authClientResponse.proxy_config_result!.socks_proxy_url)}
                          className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
 copiedFields['SOCKS Proxy URL']
 ? 'bg-ur-green text-ur-black border border-ur-green'
 : 'bg-ur-raised text-ur-gray hover:bg-ur-hover border border-ur-border'
 }`}
                        >
                          {copiedFields['SOCKS Proxy URL'] ? (
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
                      <div className="bg-ur-black p-3 rounded-lg border border-ur-border font-mono text-xs break-all">
                        <code className="text-ur-green select-all">
                          {authClientResponse.proxy_config_result.socks_proxy_url}
                        </code>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-ur-green">Auth Token</label>
                        <button
                          onClick={() => handleCopyField('Auth Token', authClientResponse.proxy_config_result!.auth_token)}
                          className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
 copiedFields['Auth Token']
 ? 'bg-ur-green text-ur-black border border-ur-green'
 : 'bg-ur-raised text-ur-gray hover:bg-ur-hover border border-ur-border'
 }`}
                        >
                          {copiedFields['Auth Token'] ? (
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
                      <div className="bg-ur-black p-3 rounded-lg border border-ur-border font-mono text-xs break-all">
                        <code className="text-ur-green select-all">
                          {authClientResponse.proxy_config_result.auth_token}
                        </code>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-ur-blue/10 p-3 rounded border border-ur-blue/40">
                        <div className="text-ur-green text-sm">Instance ID</div>
                        <div className="text-ur-white font-medium text-sm font-mono break-all">
                          {authClientResponse.proxy_config_result.instance_id}
                        </div>
                      </div>
                      <div className="bg-ur-blue/10 p-3 rounded border border-ur-blue/40">
                        <div className="text-ur-green text-sm">Keepalive (seconds)</div>
                        <div className="text-ur-white font-medium">
                          {authClientResponse.proxy_config_result.keepalive_seconds}
                        </div>
                      </div>
                    </div>

                    {authClientResponse.proxy_config_result.wg_config && (
                      <div className="border border-ur-blue/40 rounded-ur overflow-hidden">
                        <div className="bg-ur-blue/15 px-4 py-3 flex items-center gap-2">
                          <Wifi size={16} className="text-ur-blue-light" />
                          <span className="text-sm font-semibold text-ur-blue-light">WireGuard Configuration</span>
                        </div>
                        <div className="bg-ur-panel/60 p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-ur-blue/10 p-3 rounded-lg border border-ur-blue/40">
                              <div className="text-xs text-ur-blue-light mb-1">Proxy Port</div>
                              <div className="text-sm font-mono text-ur-blue-light font-medium">
                                {authClientResponse.proxy_config_result.wg_config.wg_proxy_port}
                              </div>
                            </div>
                            <div className="bg-ur-blue/10 p-3 rounded-lg border border-ur-blue/40">
                              <div className="text-xs text-ur-blue-light mb-1">Client IPv4</div>
                              <div className="text-sm font-mono text-ur-blue-light font-medium">
                                {authClientResponse.proxy_config_result.wg_config.client_ipv4}
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-ur-blue-light">Client Public Key</span>
                              <button
                                onClick={() => handleCopyField('WG Client Public Key', authClientResponse.proxy_config_result!.wg_config!.client_public_key)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all duration-200 ${
 copiedFields['WG Client Public Key']
 ? 'bg-ur-blue text-ur-white border border-ur-blue'
 : 'bg-ur-raised text-ur-gray hover:bg-ur-hover border border-ur-border'
 }`}
                              >
                                {copiedFields['WG Client Public Key'] ? <CheckCircle size={12} /> : <Copy size={12} />}
                                {copiedFields['WG Client Public Key'] ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                            <div className="bg-ur-black px-3 py-2 rounded border border-ur-border font-mono text-xs break-all text-ur-blue-light select-all">
                              {authClientResponse.proxy_config_result.wg_config.client_public_key}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-ur-blue-light">Client Private Key</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setShowWgPrivateKey(!showWgPrivateKey)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-ur-raised text-ur-gray hover:bg-ur-hover border border-ur-border transition-all duration-200"
                                >
                                  {showWgPrivateKey ? <EyeOff size={12} /> : <Eye size={12} />}
                                  {showWgPrivateKey ? 'Hide' : 'Show'}
                                </button>
                                <button
                                  onClick={() => handleCopyField('WG Client Private Key', authClientResponse.proxy_config_result!.wg_config!.client_private_key)}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all duration-200 ${
 copiedFields['WG Client Private Key']
 ? 'bg-ur-blue text-ur-white border border-ur-blue'
 : 'bg-ur-raised text-ur-gray hover:bg-ur-hover border border-ur-border'
 }`}
                                >
                                  {copiedFields['WG Client Private Key'] ? <CheckCircle size={12} /> : <Copy size={12} />}
                                  {copiedFields['WG Client Private Key'] ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                            </div>
                            <div className="bg-ur-black px-3 py-2 rounded border border-ur-border font-mono text-xs break-all text-ur-blue-light select-all">
                              {showWgPrivateKey
                                ? authClientResponse.proxy_config_result.wg_config.client_private_key
                                : '•'.repeat(44)}
                            </div>
                            <p className="text-xs text-ur-yellow-light mt-1">Keep this key secret. Do not share it.</p>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-ur-blue-light">Server Public Key (Peer)</span>
                              <button
                                onClick={() => handleCopyField('WG Proxy Public Key', authClientResponse.proxy_config_result!.wg_config!.proxy_public_key)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all duration-200 ${
 copiedFields['WG Proxy Public Key']
 ? 'bg-ur-blue text-ur-white border border-ur-blue'
 : 'bg-ur-raised text-ur-gray hover:bg-ur-hover border border-ur-border'
 }`}
                              >
                                {copiedFields['WG Proxy Public Key'] ? <CheckCircle size={12} /> : <Copy size={12} />}
                                {copiedFields['WG Proxy Public Key'] ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                            <div className="bg-ur-black px-3 py-2 rounded border border-ur-border font-mono text-xs break-all text-ur-blue-light select-all">
                              {authClientResponse.proxy_config_result.wg_config.proxy_public_key}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-ur-blue-light mb-2">WireGuard Config File</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const blob = new Blob([authClientResponse.proxy_config_result!.wg_config!.config], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = 'urnetwork.conf';
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="flex items-center gap-2 flex-1 justify-center px-4 py-2.5 bg-ur-blue/20 hover:bg-ur-blue/30 text-ur-blue-light rounded-lg border border-ur-blue/40 transition-all duration-200 text-sm font-medium"
                              >
                                <Download size={15} />
                                Download .conf
                              </button>
                              <button
                                onClick={() => setShowWgQR(true)}
                                className="flex items-center gap-2 flex-1 justify-center px-4 py-2.5 bg-ur-raised/60 hover:bg-ur-hover/60 text-ur-white rounded-lg border border-ur-border/60 transition-all duration-200 text-sm font-medium"
                              >
                                <Smartphone size={15} />
                                QR Code
                              </button>
                            </div>
                            <p className="text-xs text-ur-gray mt-1.5">Contains private key — import directly into any WireGuard client.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-ur-green/10 p-3 rounded-lg border border-ur-green/40">
                      <p className="text-xs text-ur-gray">
                        <strong>Usage Note:</strong> Use these credentials to configure your applications to route traffic through URnetwork. Keep these credentials secure and don't share them publicly.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* API Key Management */}
      <div className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden border border-ur-border animate-staggerFadeUp" style={{ animationDelay: '0.135s' }}>
        <div className="bg-ur-raised px-6 py-4 border-b border-ur-border">
          <div className="flex items-center gap-3">
            <Key size={20} className="text-ur-yellow-light" />
            <div>
              <h3 className="font-medium text-ur-white">API Key Management</h3>
              <p className="text-ur-gray text-sm mt-1">Create and manage API keys for programmatic access</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-ur-gray mb-4">
            Generate API keys to authenticate programmatic requests to the URnetwork API. Manage existing keys, create new ones, or revoke access as needed.
          </p>

          <button
            onClick={() => navigate('/account/api-keys')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 bg-ur-yellow-light hover:bg-ur-yellow-light/90 text-ur-black border border-ur-yellow-light transform hover:scale-[1.02]"
          >
            <Key size={18} />
            Manage API Keys
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Subscription Management */}
      <div className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden border border-ur-border animate-staggerFadeUp" style={{ animationDelay: '0.15s' }}>
        <div className="bg-ur-raised px-6 py-4 border-b border-ur-border">
          <div className="flex items-center gap-3">
            <CreditCard size={20} className="text-ur-green" />
            <div>
              <h3 className="font-medium text-ur-white">Subscription Management</h3>
              <p className="text-ur-gray text-sm mt-1">Access your Stripe subscription portal to manage billing and payment details</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-ur-gray mb-4">
            Access your subscription portal to manage your billing details, update payment methods, view invoices, and modify your subscription plan.
          </p>

          <a
            href="https://pay.ur.io/p/login/00g16I4Mag2O240aEE"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 bg-ur-green hover:bg-ur-green/90 text-ur-black border border-ur-green transform hover:scale-[1.02]"
          >
            <CreditCard size={18} />
            Open Subscription Portal
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* Sign-In Methods (server PR #406) */}
      <SignInMethodsSection />

      {/* Network Name (server PR #406) */}
      <NetworkNameSection />

      {/* Password Reset */}
      <div className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden border border-ur-border animate-staggerFadeUp" style={{ animationDelay: '0.2s' }}>
        <div className="bg-ur-raised px-6 py-4 border-b border-ur-border">
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-ur-coral" />
            <div>
              <h3 className="font-medium text-ur-white">Password Reset</h3>
              <p className="text-ur-gray text-sm mt-1">Request a password reset link to change your account password</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-ur-gray mb-4">
            If you need to change your password, we can send a reset link to your registered email address.
            Click the button below to request a password reset email.
          </p>

          <button
            onClick={() => setIsPasswordResetModalOpen(true)}
            disabled={isLoadingUserEmail || !userEmail}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
 isLoadingUserEmail || !userEmail
 ? 'bg-ur-hover cursor-not-allowed border border-ur-border text-ur-gray'
 : 'bg-ur-coral hover:bg-ur-coral-hover text-ur-black border border-ur-coral transform hover:scale-[1.02]'
 }`}
          >
            {isLoadingUserEmail ? (
              <>
                <svg className="animate-spin h-5 w-5 text-ur-gray" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

      {/* Delete Account */}
      <div className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden border border-ur-border animate-staggerFadeUp" style={{ animationDelay: '0.3s' }}>
        <div className="bg-ur-raised px-6 py-4 border-b border-ur-border">
          <div className="flex items-center gap-3">
            <Trash2 size={20} className="text-ur-coral" />
            <div>
              <h3 className="font-medium text-ur-white">Delete Account</h3>
              <p className="text-ur-gray text-sm mt-1">Permanently delete your account and all associated data</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-ur-gray mb-4">
            Once your account is deleted, all of your data will be permanently removed. This action cannot be undone.
            Please make sure you want to proceed before continuing.
          </p>

          <button
            onClick={() => setIsDeleteAccountModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 bg-ur-coral hover:bg-ur-coral-hover text-ur-black border border-ur-coral transform hover:scale-[1.02]"
          >
            <Trash2 size={18} />
            Delete Account
          </button>
        </div>
      </div>

      <PasswordResetModal
        isOpen={isPasswordResetModalOpen}
        onClose={() => setIsPasswordResetModalOpen(false)}
        userEmail={userEmail}
      />

      <DeleteAccountModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        token={token}
        onDeleteSuccess={logout}
      />

      <LocationSelectorModal
        isOpen={isLocationSelectorOpen}
        onClose={() => setIsLocationSelectorOpen(false)}
        onSelectLocation={handleLocationSelect}
        currentCountryCode={countryCode}
        currentLocationId={locationId}
      />

      {showWgQR && authClientResponse?.proxy_config_result?.wg_config?.config && (
        <WireGuardQRModal
          config={authClientResponse.proxy_config_result.wg_config.config}
          onClose={() => setShowWgQR(false)}
        />
      )}
    </div>
  );
};

export default AccountSettingsSection;
