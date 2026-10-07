import React, { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, AlertCircle, Activity, Clock, Database, Search, DollarSign, Users, TrendingUp, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchProviderStats } from '../services/api';
import type { Provider } from '../services/api';
import toast from 'react-hot-toast';

const StatsSection: React.FC = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [showWarningBanner, setShowWarningBanner] = useState(true);

  const loadStats = async () => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetchProviderStats(token);
      
      if (response.error) {
        setError(response.error.message);
        toast.error(response.error.message);
      } else {
        setStats(response.providers || []);
        setLastUpdated(response.created_time);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load statistics';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const calculateTotals = () => {
    return stats.reduce((acc, provider) => ({
      uptime: acc.uptime + provider.uptime_last_24h,
      transfer: acc.transfer + provider.transfer_data_last_24h,
      payout: acc.payout + provider.payout_last_24h,
      interest: acc.interest + provider.search_interest_last_24h,
      contracts: acc.contracts + provider.contracts_last_24h,
      clients: acc.clients + provider.clients_last_24h,
      activeProviders: acc.activeProviders + (provider.connected ? 1 : 0),
    }), {
      uptime: 0,
      transfer: 0,
      payout: 0,
      interest: 0,
      contracts: 0,
      clients: 0,
      activeProviders: 0,
    });
  };

  const totals = calculateTotals();

  const StatCard = ({ title, value, icon: Icon, accent }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    accent: string;
  }) => (
    <div className="bg-ur-panel rounded-ur shadow-ur-flat p-6 border border-ur-border hover:border-ur-active transition-all duration-300 transform hover:scale-105">
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

  return (
    <div className="space-y-8">
      {showWarningBanner && (
        <div className="bg-ur-yellow-light/10 border-l-4 border-ur-yellow-light p-4 rounded-lg shadow-ur-flat animate-staggerFadeUp" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-ur-yellow-light mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-ur-yellow-light mb-1">Development Notice</h3>
                <p className="text-ur-yellow-light text-sm">
                  This Statistics page is currently under development. The backend API is not yet complete, 
                  so the data shown here is temporary placeholder information and may not reflect actual network statistics.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowWarningBanner(false)}
              className="text-ur-yellow-light hover:text-ur-white focus:outline-none transition-colors p-1 rounded-lg hover:bg-ur-yellow-light/10 ml-4 flex-shrink-0"
              aria-label="Dismiss warning"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-staggerFadeUp" style={{ animationDelay: '0.1s' }}>
        <div>
          <h2 className="text-3xl font-bold text-ur-white flex items-center gap-3">
            <div className="p-2 bg-ur-green rounded-ur">
              <BarChart3 className="text-ur-black" size={28} />
            </div>
            Provider Statistics
          </h2>
          <p className="text-ur-gray mt-2">
            Real-time network performance metrics and analytics
          </p>
          {lastUpdated && (
            <p className="text-sm text-ur-gray-dark mt-1 flex items-center gap-2">
              <Activity size={14} />
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        
        <button
          onClick={loadStats}
          disabled={isLoading}
          className="flex items-center gap-2 bg-ur-green hover:bg-ur-green/90 text-ur-black px-6 py-3 rounded-ur transition-colors duration-100 disabled:opacity-60"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="bg-ur-coral/15 border border-ur-coral p-4 rounded-ur flex items-start gap-3">
          <AlertCircle size={20} className="text-ur-coral mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-ur-coral">Error loading statistics</h3>
            <p className="text-ur-coral">{error}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-ur-border border-t-ur-green"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-ur-green/20 to-ur-blue/20 animate-pulse"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 animate-staggerFadeUp" style={{ animationDelay: '0.15s' }}>
            <StatCard
              title="Active Providers"
              value={totals.activeProviders}
              icon={Activity}
              accent="bg-ur-green"
            />
            <StatCard
              title="Average Uptime"
              value={`${(totals.uptime / (stats.length || 1)).toFixed(1)}%`}
              icon={Clock}
              accent="bg-ur-blue-light"
            />
            <StatCard
              title="Total Data Transfer"
              value={`${(totals.transfer / 1024).toFixed(2)} GB`}
              icon={Database}
              accent="bg-ur-pink"
            />
            <StatCard
              title="Total Search Interest"
              value={totals.interest}
              icon={Search}
              accent="bg-ur-yellow-light"
            />
            <StatCard
              title="Total Payout"
              value={`$${totals.payout.toFixed(2)}`}
              icon={DollarSign}
              accent="bg-ur-green"
            />
            <StatCard
              title="Total Contracts"
              value={totals.contracts}
              icon={Users}
              accent="bg-ur-blue-light"
            />
          </div>

          <div className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden border border-ur-border animate-staggerFadeUp" style={{ animationDelay: '0.2s' }}>
            <div className="bg-ur-raised px-6 py-4 border-b border-ur-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-ur-white">Provider Details</h3>
                  <p className="text-sm text-ur-gray mt-1">Detailed performance metrics for each provider</p>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-ur-green" />
                  <span className="text-sm text-ur-gray">{stats.length} providers</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ur-border">
                <thead className="bg-ur-black">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">Client ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">Uptime</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">Transfer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">Payout</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">Interest</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">Contracts</th>
                  </tr>
                </thead>
                <tbody className="bg-ur-panel divide-y divide-ur-border">
                  {stats.map((provider, index) => (
                    <tr key={provider.client_id} className={`hover:bg-ur-raised/50 transition-colors ${index % 2 === 0 ? 'bg-ur-panel' : 'bg-ur-tint'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
 provider.connected
 ? 'bg-ur-green/10 text-ur-green border border-ur-green'
 : 'bg-ur-coral/10 text-ur-coral border border-ur-coral'
 }`}>
                          {provider.connected ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ur-gray font-mono">
                        {provider.client_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ur-white">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
 provider.uptime_last_24h >= 90 ? 'bg-ur-green' :
 provider.uptime_last_24h >= 70 ? 'bg-ur-yellow-light' : 'bg-ur-coral'
 }`}></div>
                          {provider.uptime_last_24h.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ur-white font-medium">
                        {(provider.transfer_data_last_24h / 1024).toFixed(2)} GB
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ur-green font-medium">
                        ${provider.payout_last_24h.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ur-blue-light">
                        {provider.search_interest_last_24h}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ur-pink">
                        {provider.contracts_last_24h}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {stats.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-ur-raised rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="text-ur-gray-dark" size={24} />
                  </div>
                  <h3 className="text-lg font-medium text-ur-white mb-2">No Statistics Available</h3>
                  <p className="text-ur-gray italic">No provider statistics found. Try refreshing the data.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsSection;