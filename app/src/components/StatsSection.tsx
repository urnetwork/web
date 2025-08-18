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

  const StatCard = ({ title, value, icon: Icon, gradient }: { 
    title: string; 
    value: string | number; 
    icon: React.ElementType; 
    gradient: string;
  }) => (
    <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 transform hover:scale-105">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-semibold mt-1 text-white">{value}</p>
        </div>
        <div className={`${gradient} p-3 rounded-xl shadow-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {showWarningBanner && (
        <div className="bg-yellow-900/50 border-l-4 border-yellow-500 p-4 rounded-lg shadow-lg animate-fadeIn">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-yellow-300 mb-1">Development Notice</h3>
                <p className="text-yellow-200 text-sm">
                  This Statistics page is currently under development. The backend API is not yet complete, 
                  so the data shown here is temporary placeholder information and may not reflect actual network statistics.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowWarningBanner(false)}
              className="text-yellow-400 hover:text-yellow-300 focus:outline-none focus:text-yellow-300 transition-colors p-1 rounded-lg hover:bg-yellow-800/20 ml-4 flex-shrink-0"
              aria-label="Dismiss warning"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl">
              <BarChart3 className="text-white" size={28} />
            </div>
            Provider Statistics
          </h2>
          <p className="text-gray-400 mt-2">
            Real-time network performance metrics and analytics
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <Activity size={14} />
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        
        <button
          onClick={loadStats}
          disabled={isLoading}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-all duration-200 border border-green-500 hover:shadow-lg"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-red-300">Error loading statistics</h3>
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-green-500"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500/20 to-blue-500/20 animate-pulse"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <StatCard
              title="Active Providers"
              value={totals.activeProviders}
              icon={Activity}
              gradient="bg-gradient-to-r from-green-600 to-emerald-600"
            />
            <StatCard
              title="Average Uptime"
              value={`${(totals.uptime / (stats.length || 1)).toFixed(1)}%`}
              icon={Clock}
              gradient="bg-gradient-to-r from-blue-600 to-indigo-600"
            />
            <StatCard
              title="Total Data Transfer"
              value={`${(totals.transfer / 1024).toFixed(2)} GB`}
              icon={Database}
              gradient="bg-gradient-to-r from-purple-600 to-pink-600"
            />
            <StatCard
              title="Total Search Interest"
              value={totals.interest}
              icon={Search}
              gradient="bg-gradient-to-r from-yellow-600 to-orange-600"
            />
            <StatCard
              title="Total Payout"
              value={`$${totals.payout.toFixed(2)}`}
              icon={DollarSign}
              gradient="bg-gradient-to-r from-emerald-600 to-teal-600"
            />
            <StatCard
              title="Total Contracts"
              value={totals.contracts}
              icon={Users}
              gradient="bg-gradient-to-r from-indigo-600 to-purple-600"
            />
          </div>

          <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4 border-b border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-100">Provider Details</h3>
                  <p className="text-sm text-gray-400 mt-1">Detailed performance metrics for each provider</p>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-400" />
                  <span className="text-sm text-gray-300">{stats.length} providers</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Client ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Uptime</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Transfer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Payout</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Interest</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Contracts</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {stats.map((provider, index) => (
                    <tr key={provider.client_id} className={`hover:bg-gray-700/50 transition-colors ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          provider.connected
                            ? 'bg-green-900 text-green-300 border border-green-700'
                            : 'bg-red-900 text-red-300 border border-red-700'
                        }`}>
                          {provider.connected ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                        {provider.client_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            provider.uptime_last_24h >= 90 ? 'bg-green-400' :
                            provider.uptime_last_24h >= 70 ? 'bg-yellow-400' : 'bg-red-400'
                          }`}></div>
                          {provider.uptime_last_24h.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200 font-medium">
                        {(provider.transfer_data_last_24h / 1024).toFixed(2)} GB
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-medium">
                        ${provider.payout_last_24h.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400">
                        {provider.search_interest_last_24h}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-400">
                        {provider.contracts_last_24h}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {stats.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="text-gray-500" size={24} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-200 mb-2">No Statistics Available</h3>
                  <p className="text-gray-400 italic">No provider statistics found. Try refreshing the data.</p>
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
