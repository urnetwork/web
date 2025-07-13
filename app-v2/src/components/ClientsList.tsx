import React from 'react';
import type { Client } from '../services/api';
import ClientCard from './ClientCard';

interface ClientsListProps {
  clients: Client[];
  onClientRemoved: (clientId: string) => void;
}

const ClientsList: React.FC<ClientsListProps> = ({ clients, onClientRemoved }) => {
  if (clients.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl shadow-2xl p-8 text-center border border-gray-700">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h3 className="text-lg font-medium text-gray-200 mb-2">No Clients Found</h3>
          <p className="text-gray-400 italic">Try refreshing the list or check your network connection.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {clients.map((client) => (
        <ClientCard 
          key={client.client_id} 
          client={client} 
          onClientRemoved={onClientRemoved} 
        />
      ))}
    </div>
  );
};

export default ClientsList;