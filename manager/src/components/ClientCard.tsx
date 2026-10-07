import React, { useState } from 'react';
import { Calendar, Clock, Cpu, Trash2, Info, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import type { Client } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { removeClient } from '../services/api';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';

interface ClientCardProps {
  client: Client;
  onClientRemoved: (clientId: string) => void;
  isInGroup?: boolean;
  isConnected?: boolean;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, onClientRemoved, isInGroup = false, isConnected: isConnectedOverride }) => {
  const { token } = useAuth();
  const [isRemoving, setIsRemoving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleRemoveClick = () => {
    setShowModal(true);
  };

  const handleRemoveConfirm = async () => {
    if (!token) return;
    
    setIsRemoving(true);
    try {
      const response = await removeClient(token, client.client_id);
      
      if (response.error) {
        toast.error(response.error.message);
      } else {
        toast.success(`Client ${client.device_name || client.client_id} removed successfully`);
        onClientRemoved(client.client_id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove client');
    } finally {
      setIsRemoving(false);
      setShowModal(false);
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const isConnected = isConnectedOverride || (client.connections && client.connections.length > 0);

  return (
    <>
      <div className={`bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden hover:shadow-3xl transition-all duration-300 border border-ur-border hover:border-ur-border ${isInGroup ? '' : 'transform hover:scale-105'}`}>
        <div className="bg-ur-raised px-4 py-3 border-b border-ur-border overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium text-ur-white truncate flex-1 min-w-0 overflow-hidden" title={client.device_name || client.client_id}>
              {client.device_name || 'Unnamed Device'}
            </h3>
            <div className="flex items-center space-x-2 flex-shrink-0">
              {isConnected ? (
                <Wifi size={16} className="text-ur-green" />
              ) : (
                <WifiOff size={16} className="text-ur-coral" />
              )}
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
 isConnected 
 ? 'bg-ur-green/10 text-ur-green border border-ur-green' 
 : 'bg-ur-coral/10 text-ur-coral border border-ur-coral'
 }`}>
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Cpu size={16} className="text-ur-blue-light mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ur-gray">Device ID</p>
                <p className="text-sm font-medium text-ur-white font-mono break-all">{client.device_id}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Calendar size={16} className="text-ur-pink mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ur-gray">Created</p>
                <p className="text-sm text-ur-white">{formatDate(client.create_time)}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-ur-yellow-light mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ur-gray">Last Authentication</p>
                <p className="text-sm text-ur-white">{formatDate(client.auth_time)}</p>
              </div>
            </div>
          </div>
          
          {showDetails && (
            <div className="mt-4 pt-4 border-t border-ur-border">
              <h4 className="text-sm font-medium text-ur-gray mb-3">Additional Details</h4>
              
              <div className="space-y-2 text-xs bg-ur-black p-3 rounded-lg border border-ur-border">
                {client.source_client_id && (
                  <p><span className="text-ur-gray">Source Client ID:</span> <span className="text-ur-white font-mono break-all">{client.source_client_id}</span></p>
                )}
                <p><span className="text-ur-gray">Client ID:</span> <span className="text-ur-white font-mono break-all">{client.client_id}</span></p>
                <p><span className="text-ur-gray">Network ID:</span> <span className="text-ur-white font-mono break-all">{client.network_id}</span></p>
                <p><span className="text-ur-gray">Description:</span> <span className="text-ur-white">{client.description || 'N/A'}</span></p>
                <p><span className="text-ur-gray">Device Spec:</span> <span className="text-ur-white break-words">{client.device_spec || 'N/A'}</span></p>
              </div>
              
              {client.resident && (
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-ur-gray mb-2">Resident Information</h5>
                  <div className="space-y-1 text-xs bg-ur-black p-3 rounded-lg border border-ur-border">
                    <p><span className="text-ur-gray">Host:</span> <span className="text-ur-white">{client.resident.resident_host}</span></p>
                    <p><span className="text-ur-gray">Service:</span> <span className="text-ur-white">{client.resident.resident_service}</span></p>
                    <p><span className="text-ur-gray">ID:</span> <span className="text-ur-white font-mono break-all">{client.resident.resident_id}</span></p>
                  </div>
                </div>
              )}
              
              {client.connections && client.connections.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-ur-gray mb-2">Connections ({client.connections.length})</h5>
                  <div className="space-y-2 text-xs max-h-24 overflow-y-auto">
                    {client.connections.map((conn, index) => (
                      <div key={index} className="p-2 bg-ur-black rounded border border-ur-border">
                        <p><span className="text-ur-gray">ID:</span> <span className="text-ur-white font-mono break-all">{conn.connection_id.substring(0, 8)}...</span></p>
                        <p><span className="text-ur-gray">Host:</span> <span className="text-ur-white">{conn.connection_host}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-4 flex justify-between">
            <button
              onClick={toggleDetails}
              className="text-xs flex items-center gap-1 text-ur-blue-light hover:text-ur-blue-light transition-colors"
            >
              <Info size={14} />
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
            
            <button
              onClick={handleRemoveClick}
              disabled={isRemoving}
              className="text-xs flex items-center gap-1 text-ur-coral hover:text-ur-coral transition-colors"
            >
              <Trash2 size={14} />
              Remove Client
            </button>
          </div>
        </div>
      </div>
      
      <ConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleRemoveConfirm}
        title="Remove Client"
        isLoading={isRemoving}
        icon={<AlertTriangle className="h-6 w-6 text-ur-coral" />}
      >
        <p className="text-ur-gray">Are you sure you want to remove client <span className="font-medium text-ur-white">{client.device_name || client.client_id}</span>?</p>
        <p className="text-sm text-ur-gray mt-2">This action cannot be undone.</p>
      </ConfirmModal>
    </>
  );
};

export default ClientCard;