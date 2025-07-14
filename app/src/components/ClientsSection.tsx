import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, AlertCircle, Network, ChevronLeft, ChevronRight, Filter, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchClients } from '../services/api';
import ClientsList from './ClientsList';
import RemoveClientForm from './RemoveClientForm';
import BulkDeleteForm from './BulkDeleteForm';
import type { Client } from '../services/api';
import toast from 'react-hot-toast';

const ClientsSection: React.FC = () => {
  type FilterStatus = 'all' | 'online' | 'offline';
  type SortMode = 'status' | 'auth_time' | 'create_time';

  const { token } = useAuth();
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [clientsPerPage] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>('status');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Sort clients function
  const sortClients = (clientsToSort: Client[], sortType: string) => {
    return [...clientsToSort].sort((a, b) => {
      const aConnected = a.connections && a.connections.length > 0;
      const bConnected = b.connections && b.connections.length > 0;
      
      if (sortType === 'status') {
        // Online clients first, then sort by auth_time (most recent first)
        if (aConnected && !bConnected) return -1;
        if (!aConnected && bConnected) return 1;
        
        // If both have same connection status, sort by auth_time (most recent first)
        return new Date(b.auth_time).getTime() - new Date(a.auth_time).getTime();
      } else if (sortType === 'auth_time') {
        return new Date(b.auth_time).getTime() - new Date(a.auth_time).getTime();
      } else if (sortType === 'create_time') {
        return new Date(b.create_time).getTime() - new Date(a.create_time).getTime();
      }
      
      return 0;
    });
  };

  // Filter clients function
  const filterClients = (clientsToFilter: Client[], filter: string) => {
    if (filter === 'all') return clientsToFilter;
    
    return clientsToFilter.filter(client => {
      const isConnected = client.connections && client.connections.length > 0;
      return filter === 'online' ? isConnected : !isConnected;
    });
  };

  // Get paginated clients
  const getPaginatedClients = () => {
    const sorted = sortClients(allClients, sortBy);
    const filtered = filterClients(sorted, filterStatus);
    
    const startIndex = (currentPage - 1) * clientsPerPage;
    const endIndex = startIndex + clientsPerPage;
    
    return {
      clients: filtered.slice(startIndex, endIndex),
      totalClients: filtered.length,
      totalPages: Math.ceil(filtered.length / clientsPerPage)
    };
  };

  const { clients: paginatedClients, totalClients, totalPages } = getPaginatedClients();

  const loadClients = async () => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetchClients(token);
      
      if (response.error) {
        setError(response.error.message);
        toast.error(response.error.message);
      } else {
        const clientsData = response.clients || [];
        setAllClients(clientsData);
        setCurrentPage(1); // Reset to first page when loading new data
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load clients';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load clients on initial render
  useEffect(() => {
    loadClients();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to first page when sort or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, filterStatus]);

  // Handle client removal from the list
  const handleClientRemoved = (clientId: string) => {
    setAllClients((prevClients) => prevClients.filter(client => client.client_id !== clientId));
  };

  // Handle bulk client removal from the list
  const handleClientsRemoved = (clientIds: string[]) => {
    setAllClients((prevClients) => prevClients.filter(client => !clientIds.includes(client.client_id)));
  };
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusCounts = () => {
    const online = allClients.filter(client => client.connections && client.connections.length > 0).length;
    const offline = allClients.length - online;
    return { online, offline, total: allClients.length };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
              <Users className="text-white" size={28} />
            </div>
            Client Management
          </h2>
          <p className="text-gray-400 mt-2">View and manage connected network clients</p>
          <div className="flex items-center gap-2 mt-2">
            <Network size={16} className="text-blue-400" />
            <span className="text-sm text-gray-500">
              {totalClients} of {allClients.length} clients 
              ({statusCounts.online} online, {statusCounts.offline} offline)
            </span>
          </div>
        </div>
        
        <button
          onClick={loadClients}
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-200 border border-blue-500 hover:shadow-lg"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh Clients
        </button>
      </div>

      {/* Filters and Sorting */}
      <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Filter:</span>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Clients ({allClients.length})</option>
              <option value="online">Online Only ({statusCounts.online})</option>
              <option value="offline">Offline Only ({statusCounts.offline})</option>
            </select>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="text-sm font-medium text-gray-300">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortMode)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="status">Status (Online First)</option>
              <option value="auth_time">Last Authentication</option>
              <option value="create_time">Creation Date</option>
            </select>
          </div>
        </div>
      </div>
      {error && (
        <div className="bg-red-900/50 border border-red-700 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-red-300">Error loading clients</h3>
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-blue-500"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-pulse"></div>
          </div>
        </div>
      ) : (
        <>
          <ClientsList clients={paginatedClients} onClientRemoved={handleClientRemoved} />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="text-sm text-gray-400">
                  Showing {((currentPage - 1) * clientsPerPage) + 1} to {Math.min(currentPage * clientsPerPage, totalClients)} of {totalClients} clients
                </div>
                
                <div className="flex items-center justify-center gap-2 overflow-x-auto">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 flex-shrink-0 ${
                      currentPage === 1
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-500'
                    }`}
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 flex-shrink-0 ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white border border-blue-500'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 flex-shrink-0 ${
                      currentPage === totalPages
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-500'
                    }`}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
            <div className="bg-gradient-to-r from-red-600 to-pink-600 px-6 py-4 border-b border-gray-600">
              <div className="flex items-center gap-3">
                <Trash2 size={20} className="text-white" />
                <div>
                  <h3 className="font-medium text-white">Bulk Delete Offline Clients</h3>
                  <p className="text-red-100 text-sm mt-1">Remove multiple offline clients based on their last authentication time</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <BulkDeleteForm clients={allClients} onClientsRemoved={handleClientsRemoved} />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 border-b border-gray-600">
              <h3 className="font-medium text-white">Remove Client Manually</h3>
              <p className="text-indigo-100 text-sm mt-1">Enter a client ID to remove it from the network</p>
            </div>
            <div className="p-6">
              <RemoveClientForm onClientRemoved={handleClientRemoved} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClientsSection;