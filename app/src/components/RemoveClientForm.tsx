import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { removeClient } from '../services/api';
import toast from 'react-hot-toast';

interface RemoveClientFormProps {
  onClientRemoved: (clientId: string) => void;
}

const RemoveClientForm: React.FC<RemoveClientFormProps> = ({ onClientRemoved }) => {
  const { token } = useAuth();
  const [clientId, setClientId] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !clientId.trim()) return;
    
    setIsRemoving(true);
    try {
      const response = await removeClient(token, clientId.trim());
      
      if (response.error) {
        toast.error(response.error.message);
      } else {
        toast.success(`Client removed successfully`);
        onClientRemoved(clientId.trim());
        setClientId('');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove client');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="max-w-md">
      <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={16} className="text-yellow-400" />
          <span className="text-sm font-medium text-yellow-300">Warning</span>
        </div>
        <p className="text-xs text-yellow-200">
          This action will permanently remove the client from your network. Make sure you have the correct client ID.
        </p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="clientId" className="block text-sm font-medium text-gray-300 mb-2">
            Client ID
          </label>
          <input
            id="clientId"
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Enter client ID to remove"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-white placeholder-gray-400 font-mono"
            disabled={isRemoving}
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isRemoving || !clientId.trim()}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 ${
            isRemoving || !clientId.trim() 
              ? 'bg-gray-600 cursor-not-allowed border border-gray-600' 
              : 'bg-red-600 hover:bg-red-700 border border-red-500 hover:shadow-lg transform hover:scale-105'
          }`}
        >
          {isRemoving ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Removing...
            </>
          ) : (
            <>
              <Trash2 size={16} />
              Remove Client
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default RemoveClientForm;