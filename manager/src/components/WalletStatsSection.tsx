import React, { useState, useEffect, useCallback, useRef, ComponentProps } from 'react';
import { Wallet, RefreshCw, AlertCircle, Settings, Clock, TrendingUp, Database, DollarSign, User, Trash2, AlertTriangle, HardDrive, Activity, CreditCard, BarChart3 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchWalletStats, fetchNetworkUser, fetchNetworkReliability } from '../services/api';
import { saveWalletStats, getWalletStatsHistory, clearWalletStatsHistory, getStorageInfo, type WalletStatsRecord } from '../services/localStorage';
import type { NetworkUser } from '../services/api';
import type { ReliabilityWindow } from '../services/types';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import PayoutStatsSection from './PayoutStatsSection';
import type { WalletStatsSettings } from '../services/types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { urChart } from '../theme/chartColors';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

ChartJS.defaults.font.family = urChart.fontFamily;
ChartJS.defaults.color = urChart.legend;

// Default settings
const DEFAULT_SETTINGS: WalletStatsSettings = {
  refreshInterval: 5,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  isAutoRefreshEnabled: true,
  maxDataPoints: 50,
  showDataPoints: false,
};

// LocalStorage key for settings
const WALLET_SETTINGS_KEY = 'wallet_stats_settings';

// Helper functions for localStorage
const saveSettingsToStorage = (settings: WalletStatsSettings): void => {
  try {
    localStorage.setItem(WALLET_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save wallet settings to localStorage:', error);
  }
};

const loadSettingsFromStorage = (): WalletStatsSettings => {
  try {
    const stored = localStorage.getItem(WALLET_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle missing properties in stored settings
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load wallet settings from localStorage:', error);
  }
  return DEFAULT_SETTINGS;
};
const WalletStatsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'data' | 'payouts'>('data');
  const { token } = useAuth();
  const [currentStats, setCurrentStats] = useState({ paid_mb: 0, unpaid_mb: 0 });
  const [statsHistory, setStatsHistory] = useState<WalletStatsRecord[]>([]);
  const [networkUser, setNetworkUser] = useState<NetworkUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ totalRecords: 0, storageSize: '0 KB' });
  const [reliabilityData, setReliabilityData] = useState<ReliabilityWindow | null>(null);
  const [reliabilityError, setReliabilityError] = useState<string | null>(null);
  const [showReliabilityWeight, setShowReliabilityWeight] = useState(true);
  const [showWeightedClients, setShowWeightedClients] = useState(true);
  const [showTotalClients, setShowTotalClients] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsInitialized = useRef(false);
  
  // Settings state - initialized from localStorage
  const [settings, setSettings] = useState<WalletStatsSettings>(() => {
    const loadedSettings = loadSettingsFromStorage();
    settingsInitialized.current = true;
    return loadedSettings;
  });

  // Helper function to update settings and save to localStorage
  const updateSettings = useCallback((newSettings: Partial<WalletStatsSettings>) => {
    setSettings(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings };
      saveSettingsToStorage(updatedSettings);
      return updatedSettings;
    });
  }, []);

  const bytesToMB = (bytes: number) => bytes / (1000000);

  // Format bytes to appropriate unit (MB, GB, TB)
  const formatBytes = (bytes: number): string => {
    const mb = bytes / (1000000);
    const gb = mb / 1000;
    const tb = gb / 1000;

    if (tb >= 1) {
      return `${tb.toFixed(2)} TB`;
    } else if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    } else {
      return `${mb.toFixed(2)} MB`;
    }
  };

  // Format MB value to appropriate unit
  const formatMBValue = (mb: number): string => {
    const gb = mb / 1000;
    const tb = gb / 1000;

    if (tb >= 1) {
      return `${tb.toFixed(2)} TB`;
    } else if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    } else {
      return `${mb.toFixed(2)} MB`;
    }
  };

  // Update storage info
  const updateStorageInfo = useCallback(() => {
    const info = getStorageInfo();
    setStorageInfo(info);
  }, []);

  // Load network user info
  const loadNetworkUser = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetchNetworkUser(token);
      
      if (response.error) {
        console.error('Failed to fetch network user:', response.error.message);
        toast.error('Failed to fetch user information');
      } else if (response.network_user) {
        setNetworkUser(response.network_user);
      }
    } catch (err) {
      console.error('Error fetching network user:', err);
    }
  }, [token]);

  // Load wallet stats history from localStorage
  const loadStatsHistory = useCallback(async () => {
    if (!networkUser?.user_id) return;

    try {
      const { data, error } = await getWalletStatsHistory(networkUser.user_id, 1000);

      if (error) {
        console.error('Error loading stats history:', error);
      } else if (data) {
        setStatsHistory(data);
        updateStorageInfo();

        // Set current stats from the latest entry
        if (data.length > 0) {
          const latest = data[0];
          setCurrentStats({
            paid_mb: bytesToMB(latest.paid_bytes_provided),
            unpaid_mb: bytesToMB(latest.unpaid_bytes_provided),
          });
        }
      }
    } catch (err) {
      console.error('Error loading stats history:', err);
    }
  }, [networkUser?.user_id, updateStorageInfo]);

  const loadReliabilityData = useCallback(async () => {
    if (!token) return;

    setReliabilityError(null);

    try {
      const response = await fetchNetworkReliability(token);

      if (response.error) {
        setReliabilityError(response.error.message);
      } else if (response.reliability_window) {
        setReliabilityData(response.reliability_window);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load reliability data';
      setReliabilityError(message);
    }
  }, [token]);

  // Fetch wallet stats from API and save to localStorage
  const loadWalletStats = useCallback(async (showToast = true) => {
    if (!token || !networkUser?.network_name || !networkUser?.user_id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetchWalletStats(token);
      
      if (response.error) {
        setError(response.error.message);
        if (showToast) {
          toast.error(response.error.message);
        }
      } else {
        const paidMB = bytesToMB(response.paid_bytes_provided);
        const unpaidMB = bytesToMB(response.unpaid_bytes_provided);
        
        setCurrentStats({ paid_mb: paidMB, unpaid_mb: unpaidMB });
        setLastUpdated(new Date().toISOString());
        
        // Save to localStorage using the user ID and network name from networkUser
        const { error: saveError } = await saveWalletStats(
          networkUser.user_id,
          networkUser.network_name,
          response.paid_bytes_provided,
          response.unpaid_bytes_provided
        );
        
        if (saveError) {
          console.error('Error saving wallet stats:', saveError);
          if (showToast) {
            toast.error('Failed to save stats to localStorage');
          }
        } else {
          // Reload history to include the new entry
          await loadStatsHistory();
          if (showToast) {
            toast.success('Data Stats updated successfully');
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load wallet stats';
      setError(message);
      if (showToast) {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, networkUser?.network_name, networkUser?.user_id, loadStatsHistory]);

  // Clear wallet stats history
  const handleClearHistory = async () => {
    if (!networkUser?.user_id) return;
    
    setIsClearing(true);
    try {
      const { success, error } = await clearWalletStatsHistory(networkUser.user_id);
      
      if (error || !success) {
        toast.error('Failed to clear history');
        console.error('Error clearing history:', error);
      } else {
        setStatsHistory([]);
        setCurrentStats({ paid_mb: 0, unpaid_mb: 0 });
        updateStorageInfo();
        toast.success('History cleared successfully');
      }
    } catch (err) {
      console.error('Error clearing history:', err);
      toast.error('Failed to clear history');
    } finally {
      setIsClearing(false);
      setShowClearModal(false);
    }
  };

  // Setup automatic refresh
  useEffect(() => {
    // Don't setup interval if settings haven't been initialized yet
    if (!settingsInitialized.current) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (settings.isAutoRefreshEnabled && networkUser?.network_name && networkUser?.user_id) {
      // Initial load
      loadWalletStats(false);

      // Setup interval
      intervalRef.current = setInterval(() => {
        loadWalletStats(false);
      }, settings.refreshInterval * 60 * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadWalletStats, settings.refreshInterval, settings.isAutoRefreshEnabled, networkUser?.network_name, networkUser?.user_id]);

  // Load network user on component mount
  useEffect(() => {
    loadNetworkUser();
  }, [loadNetworkUser]);

  // Load stats history when networkUser is available
  useEffect(() => {
    if (networkUser?.user_id) {
      loadStatsHistory();
    }
  }, [loadStatsHistory, networkUser?.user_id]);

  // Load reliability data when token is available
  useEffect(() => {
    if (token) {
      loadReliabilityData();
    }
  }, [loadReliabilityData, token]);

  // Update storage info on mount
  useEffect(() => {
    updateStorageInfo();
  }, [updateStorageInfo]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: settings.timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getTimezoneOptions = () => {
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Kolkata',
      'Australia/Sydney',
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ].filter((tz, index, arr) => arr.indexOf(tz) === index);
  };

  const StatCard = ({ title, value, icon: Icon, accent }: {
    title: string; 
    value: string; 
    icon: React.ElementType; 
    accent: string;
  }) => (
    <div className="bg-ur-panel rounded-ur shadow-ur-flat p-6 border border-ur-border hover:border-ur-border transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ur-gray">{title}</p>
          <p className="text-2xl font-semibold mt-1 text-ur-white">{value}</p>
        </div>
        <div className={`${accent} p-3 rounded-ur shadow-ur-flat`}>
          <Icon className="h-6 w-6 text-ur-black" />
        </div>
      </div>
    </div>
  );

  // Create chart data
  const createChartData = (dataKey: 'paid_bytes_provided' | 'unpaid_bytes_provided', color: string, label: string) => {
    if (statsHistory.length === 0) return null;

    // Reverse to show chronological order and limit data points
    const actualMaxPoints = settings.maxDataPoints === 1000 ? statsHistory.length : Math.min(settings.maxDataPoints, statsHistory.length);
    const sortedData = [...statsHistory].reverse().slice(-actualMaxPoints);

    return {
      labels: sortedData.map(record => {
        const date = new Date(record.created_at);
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }),
      datasets: [
        {
          label,
          data: sortedData.map(record => bytesToMB(record[dataKey])),
          borderColor: color,
          backgroundColor: color + '20',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: color,
          pointBorderColor: '#101010',
          pointBorderWidth: 2,
          pointRadius: settings.showDataPoints ? 4 : 0,
          pointHoverRadius: settings.showDataPoints ? 6 : 4,
        },
      ],
    };
  };

  const createReliabilityChartData = () => {
    if (!reliabilityData || reliabilityData.reliability_weights.length === 0) return null;

    const weights = reliabilityData.reliability_weights;
    const clientCounts = reliabilityData.client_counts;
    const totalClientCounts = reliabilityData.total_client_counts;
    const bucketDuration = reliabilityData.bucket_duration_seconds * 1000;
    const startTime = reliabilityData.min_time_unix_milli;

    const labels = weights.map((_, index) => {
      const timestamp = startTime + (index * bucketDuration);
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    const datasets = [];

    if (showReliabilityWeight) {
      datasets.push({
        label: 'Reliability Weight',
        data: weights,
        borderColor: '#d6e6f4',
        backgroundColor: '#d6e6f420',
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#d6e6f4',
        pointBorderColor: '#101010',
        pointBorderWidth: 2,
        pointRadius: settings.showDataPoints ? 4 : 0,
        pointHoverRadius: settings.showDataPoints ? 6 : 4,
        yAxisID: 'y',
      });
    }

    if (showWeightedClients) {
      datasets.push({
        label: 'Weighted Clients',
        data: clientCounts,
        borderColor: '#87fb67',
        backgroundColor: '#87fb6720',
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#87fb67',
        pointBorderColor: '#101010',
        pointBorderWidth: 2,
        pointRadius: settings.showDataPoints ? 4 : 0,
        pointHoverRadius: settings.showDataPoints ? 6 : 4,
        yAxisID: 'y1',
      });
    }

    if (showTotalClients) {
      datasets.push({
        label: 'Total Clients',
        data: totalClientCounts,
        borderColor: '#eff7bb',
        backgroundColor: '#eff7bb20',
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#eff7bb',
        pointBorderColor: '#101010',
        pointBorderWidth: 2,
        pointRadius: settings.showDataPoints ? 4 : 0,
        pointHoverRadius: settings.showDataPoints ? 6 : 4,
        yAxisID: 'y1',
      });
    }

    return { labels, datasets };
  };

  const reliabilityChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#b7b7b7',
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: '#212121',
        titleColor: '#f8f8f8',
        bodyColor: '#b7b7b7',
        borderColor: '#282828',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            return `${context.dataset.label}: ${value.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: '#282828',
        },
        ticks: {
          color: '#909090',
          font: {
            size: 11,
          },
          maxTicksLimit: 8,
        },
      },
      y: {
        type: 'linear' as const,
        display: showReliabilityWeight,
        position: 'left' as const,
        grid: {
          color: '#282828',
        },
        title: {
          display: true,
          text: 'Reliability Weight',
          color: '#d6e6f4',
        },
        ticks: {
          color: '#d6e6f4',
          font: {
            size: 11,
          },
        },
      },
      y1: {
        type: 'linear' as const,
        display: showWeightedClients || showTotalClients,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Client Count',
          color: '#909090',
        },
        ticks: {
          color: '#909090',
          font: {
            size: 11,
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const chartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#b7b7b7',
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: '#212121',
        titleColor: '#f8f8f8',
        bodyColor: '#b7b7b7',
        borderColor: '#282828',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            return `${context.dataset.label}: ${formatMBValue(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: '#282828',
        },
        ticks: {
          color: '#909090',
          font: {
            size: 11,
          },
          maxTicksLimit: 8,
        },
      },
      y: {
        grid: {
          color: '#282828',
        },
        ticks: {
          color: '#909090',
          font: {
            size: 11,
          },
          callback: function(value) {
            return formatMBValue(typeof value === 'string' ? parseInt(value) : value);
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const paidChartData = createChartData('paid_bytes_provided', '#87fb67', 'Paid Data Transfer');
  const unpaidChartData = createChartData('unpaid_bytes_provided', '#eff7bb', 'Unpaid Data Transfer');
  const reliabilityChartData = createReliabilityChartData();

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="bg-ur-panel rounded-ur border border-ur-border shadow-ur-flat animate-staggerFadeUp overflow-hidden" style={{ animationDelay: '0.05s' }}>
        <div className="flex space-x-1 p-3">
          <button
            onClick={() => setActiveTab('data')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
 activeTab === 'data'
 ? 'bg-ur-blue text-ur-white shadow-ur-flat transform scale-[1.02]'
 : 'text-ur-gray hover:text-ur-white hover:bg-ur-raised'
 }`}
          >
            <BarChart3 size={16} className="inline mr-2" />
            Data Stats
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
 activeTab === 'payouts'
 ? 'bg-ur-green text-ur-black shadow-ur-flat transform scale-[1.02]'
 : 'text-ur-gray hover:text-ur-white hover:bg-ur-raised'
 }`}
          >
            <CreditCard size={16} className="inline mr-2" />
            Payout Stats
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'data' ? (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-staggerFadeUp" style={{ animationDelay: '0.1s' }}>
          <div>
            <h2 className="text-3xl font-bold text-ur-white flex items-center gap-3">
              <div className="p-2 bg-ur-green rounded-ur">
                <Wallet className="text-ur-black" size={28} />
              </div>
              Data Statistics
            </h2>
            <p className="text-ur-gray mt-2">
              Real-time tracking of data transfer earnings (stored locally)
            </p>
            {networkUser && (
              <div className="flex items-center gap-2 mt-3">
                <User size={16} className="text-ur-blue-light" />
                <span className="text-sm text-ur-gray">
                  Network: <span className="text-ur-blue-light font-medium">{networkUser.network_name}</span> ({networkUser.user_auth})
                </span>
              </div>
            )}
            {lastUpdated && (
              <p className="text-sm text-ur-gray-dark mt-1 flex items-center gap-2">
                <Activity size={14} />
                Last updated: {formatDateTime(lastUpdated)}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <HardDrive size={14} className="text-ur-gray" />
              <span className="text-xs text-ur-gray-dark">
                {storageInfo.totalRecords} records • {storageInfo.storageSize} used
              </span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center justify-center gap-2 bg-ur-raised hover:bg-ur-hover text-ur-white px-4 py-2 rounded-lg transition-all duration-200 border border-ur-border"
            >
              <Settings size={16} />
              Settings
            </button>
            
            <button
              onClick={() => setShowClearModal(true)}
              disabled={statsHistory.length === 0}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
 statsHistory.length === 0
 ? 'bg-ur-raised text-ur-gray-dark cursor-not-allowed border border-ur-border'
 : 'bg-ur-coral text-ur-black hover:bg-ur-coral-hover border border-ur-coral '
 }`}
            >
              <Trash2 size={16} />
              Clear History
            </button>
            
            <button
              onClick={() => loadWalletStats(true)}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 bg-ur-green hover:bg-ur-green/90 text-ur-black px-4 py-2 rounded-lg transition-all duration-200 border border-ur-green "
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="bg-ur-panel rounded-ur shadow-ur-flat p-6 border border-ur-border">
            <h3 className="text-lg font-medium text-ur-white mb-6 flex items-center gap-2">
              <Settings size={20} />
              Configuration Settings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-ur-black p-4 rounded-lg border border-ur-border">
                <label className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    checked={settings.isAutoRefreshEnabled}
                    onChange={(e) => updateSettings({ isAutoRefreshEnabled: e.target.checked })}
                    className="rounded border-ur-border bg-ur-raised text-ur-green focus:ring-ur-green focus:ring-offset-ur-black"
                  />
                  <span className="text-sm font-medium text-ur-white">Enable Auto Refresh</span>
                </label>
              </div>
              
              <div className="bg-ur-black p-4 rounded-lg border border-ur-border">
                <label className="block text-sm font-medium text-ur-white mb-2">
                  Refresh Interval (minutes)
                </label>
                <select
                  value={settings.refreshInterval}
                  onChange={(e) => updateSettings({ refreshInterval: Number(e.target.value) })}
                  disabled={!settings.isAutoRefreshEnabled}
                  className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-green focus:border-ur-green disabled:bg-ur-panel text-ur-white"
                >
                  <option value={0.01}>LIVE (Spams API :3)</option>
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>
              
              <div className="bg-ur-black p-4 rounded-lg border border-ur-border">
                <label className="block text-sm font-medium text-ur-white mb-2">
                  Maximum Data Points
                </label>
                <select
                  value={settings.maxDataPoints}
                  onChange={(e) => updateSettings({ maxDataPoints: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-green focus:border-ur-green text-ur-white"
                >
                  <option value={10}>10 points</option>
                  <option value={25}>25 points</option>
                  <option value={50}>50 points</option>
                  <option value={100}>100 points</option>
                  <option value={200}>200 points</option>
                  <option value={500}>500 points</option>
                  <option value={1000}>All points (up to 1000)</option>
                </select>
              </div>
              
              <div className="bg-ur-black p-4 rounded-lg border border-ur-border">
                <label className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    checked={settings.showDataPoints}
                    onChange={(e) => updateSettings({ showDataPoints: e.target.checked })}
                    className="rounded border-ur-border bg-ur-raised text-ur-green focus:ring-ur-green focus:ring-offset-ur-black"
                  />
                  <span className="text-sm font-medium text-ur-white">Show Data Points</span>
                </label>
                <p className="text-xs text-ur-gray">
                  When disabled, charts show as smooth lines. Hover to see data values.
                </p>
              </div>
              
              <div className="bg-ur-black p-4 rounded-lg border border-ur-border">
                <label className="block text-sm font-medium text-ur-white mb-2">
                  Timezone
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => updateSettings({ timezone: e.target.value })}
                  className="w-full px-3 py-2 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-green focus:border-ur-green text-ur-white"
                >
                  {getTimezoneOptions().map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-ur-blue/15 rounded-lg border border-ur-blue/40">
              <h4 className="text-sm font-medium text-ur-blue-light mb-2">Storage Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-ur-blue-light">
                <div>
                  <span className="font-medium">Total Records:</span> {storageInfo.totalRecords}
                </div>
                <div>
                  <span className="font-medium">Storage Used:</span> {storageInfo.storageSize}
                </div>
                <div>
                  <span className="font-medium">Showing:</span> {settings.maxDataPoints === 1000 ? statsHistory.length : Math.min(settings.maxDataPoints, statsHistory.length)} of {statsHistory.length}
                </div>
              </div>
              <p className="text-xs text-ur-blue-light mt-2">
                Data is stored locally in your browser. Maximum 1000 records are kept automatically. Chart displays up to {settings.maxDataPoints === 1000 ? statsHistory.length : settings.maxDataPoints} most recent points.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-ur-coral/15 border border-ur-coral p-4 rounded-ur flex items-start gap-3">
            <AlertCircle size={20} className="text-ur-coral mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-ur-coral">Error loading wallet stats</h3>
              <p className="text-ur-coral">{error}</p>
            </div>
          </div>
        )}

        {!networkUser && !isLoading && (
          <div className="bg-ur-yellow-light/10 border border-ur-yellow-light/40 p-4 rounded-ur flex items-start gap-3">
            <AlertCircle size={20} className="text-ur-yellow-light mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-ur-yellow-light">User Information Required</h3>
              <p className="text-ur-yellow-light">Loading user information to enable wallet stats tracking...</p>
            </div>
          </div>
        )}

        {isLoading && statsHistory.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-ur-border border-t-ur-green"></div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-ur-green/20 to-ur-blue/20 animate-pulse"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-staggerFadeUp" style={{ animationDelay: '0.2s' }}>
              <StatCard
                title="Current Paid Data"
                value={formatMBValue(currentStats.paid_mb)}
                icon={DollarSign}
                accent="bg-ur-green"
              />
              <StatCard
                title="Current Unpaid Data"
                value={formatMBValue(currentStats.unpaid_mb)}
                icon={Clock}
                accent="bg-ur-yellow-light"
              />
              <StatCard
                title="Total Data"
                value={formatMBValue(currentStats.paid_mb + currentStats.unpaid_mb)}
                icon={Database}
                accent="bg-ur-blue-light"
              />
              <StatCard
                title="Data Points"
                value={`${settings.maxDataPoints === 1000 ? statsHistory.length : Math.min(settings.maxDataPoints, statsHistory.length)}/${statsHistory.length}`}
                icon={TrendingUp}
                accent="bg-ur-pink"
              />
            </div>

            {statsHistory.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-chartSlideUp" style={{ animationDelay: '0.25s' }}>
                {paidChartData && (
                  <div className="bg-ur-panel rounded-ur shadow-ur-flat p-6 border border-ur-border">
                    <h3 className="text-lg font-medium text-ur-white mb-6 flex items-center gap-2">
                      <DollarSign size={20} className="text-ur-green" />
                      Paid Data Transfer History
                    </h3>
                    <div className="h-64 md:h-80">
                      <Line data={paidChartData} options={chartOptions as ComponentProps<typeof Line>["options"]} />
                    </div>
                  </div>
                )}
                
                {unpaidChartData && (
                  <div className="bg-ur-panel rounded-ur shadow-ur-flat p-6 border border-ur-border">
                    <h3 className="text-lg font-medium text-ur-white mb-6 flex items-center gap-2">
                      <Clock size={20} className="text-ur-yellow-light" />
                      Unpaid Data Transfer History
                    </h3>
                    <div className="h-64 md:h-80">
                      <Line data={unpaidChartData} options={chartOptions as ComponentProps<typeof Line>["options"]} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {reliabilityData && (
              <div className="animate-chartSlideUp" style={{ animationDelay: '0.35s' }}>
                <div className="bg-ur-panel rounded-ur shadow-ur-flat p-6 border border-ur-border">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-medium text-ur-white flex items-center gap-2">
                        <Activity size={20} className="text-ur-blue-light" />
                        Network Reliability
                      </h3>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-ur-gray">Mean:</span>
                        <span className="text-ur-blue-light font-medium">
                          {reliabilityData.mean_reliability_weight.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showReliabilityWeight}
                          onChange={(e) => setShowReliabilityWeight(e.target.checked)}
                          className="rounded border-ur-border bg-ur-raised text-ur-blue-light focus:ring-ur-blue focus:ring-offset-ur-black"
                        />
                        <span className="text-sm text-ur-blue-light">Reliability Weight</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showWeightedClients}
                          onChange={(e) => setShowWeightedClients(e.target.checked)}
                          className="rounded border-ur-border bg-ur-raised text-ur-green focus:ring-ur-green focus:ring-offset-ur-black"
                        />
                        <span className="text-sm text-ur-green">Weighted Clients</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showTotalClients}
                          onChange={(e) => setShowTotalClients(e.target.checked)}
                          className="rounded border-ur-border bg-ur-raised text-ur-yellow-light focus:ring-ur-blue focus:ring-offset-ur-black"
                        />
                        <span className="text-sm text-ur-yellow-light">Total Clients</span>
                      </label>
                    </div>
                  </div>
                  {reliabilityChartData && reliabilityChartData.datasets.length > 0 ? (
                    <div className="h-64 md:h-80">
                      <Line data={reliabilityChartData} options={reliabilityChartOptions as ComponentProps<typeof Line>["options"]} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-ur-gray">
                      Select at least one data series to display
                    </div>
                  )}
                </div>
              </div>
            )}

            {reliabilityError && !reliabilityData && (
              <div className="bg-ur-panel rounded-ur shadow-ur-flat p-6 border border-ur-border">
                <div className="flex items-center gap-3 text-ur-coral">
                  <AlertCircle size={20} />
                  <span>Failed to load reliability data: {reliabilityError}</span>
                </div>
              </div>
            )}

            <div className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden border border-ur-border">
              <div className="px-6 py-4 bg-ur-raised border-b border-ur-border">
                <h3 className="font-medium text-ur-white">History Timeline</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-ur-border">
                  <thead className="bg-ur-black sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">
                        Paid Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">
                        Unpaid Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">
                        Total Data
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-ur-panel divide-y divide-ur-border">
                    {statsHistory.map((entry, index) => (
                      <tr key={entry.id} className={index === 0 ? 'bg-ur-green/10 border-l-4 border-ur-green' : 'hover:bg-ur-raised/50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ur-gray">
                          {formatDateTime(entry.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ur-green font-medium">
                          {formatBytes(entry.paid_bytes_provided)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ur-yellow-light font-medium">
                          {formatBytes(entry.unpaid_bytes_provided)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ur-white">
                          {formatBytes(entry.paid_bytes_provided + entry.unpaid_bytes_provided)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {statsHistory.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-ur-raised rounded-full flex items-center justify-center mx-auto mb-4">
                      <Database className="text-ur-gray-dark" size={24} />
                    </div>
                    <p className="text-ur-gray italic">No data collected yet. Data will appear after the first API call.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      ) : (
        <PayoutStatsSection />
      )}
      
      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleClearHistory}
        title="Clear Wallet History"
        isLoading={isClearing}
        icon={<AlertTriangle className="h-6 w-6 text-ur-coral" />}
      >
        <p className="text-ur-gray">Are you sure you want to clear all wallet statistics history?</p>
        <p className="text-sm text-ur-gray mt-2">
          This will permanently delete all {statsHistory.length} data points from localStorage. This action cannot be undone.
        </p>
        <div className="mt-4 p-3 bg-ur-coral/15 rounded-lg border border-ur-coral">
          <p className="text-sm text-ur-coral font-medium">
            ⚠️ This will delete all historical data stored locally in your browser
          </p>
        </div>
      </ConfirmModal>
    </div>
  );
};

export default WalletStatsSection;
