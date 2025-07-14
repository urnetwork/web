import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Search, RefreshCw, AlertCircle, Globe, Users } from 'lucide-react';
import { fetchProviderLocations, findProviderLocations } from '../services/api';
import type { Device } from '../services/api';
import toast from 'react-hot-toast';
import debounce from 'lodash/debounce';
import { ProviderLocation } from '../services/types';

const ProvidersSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState<ProviderLocation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Memoize the loadLocations function
  const loadLocations = useCallback(async (query?: string) => {
    if (isLoading) return; // Prevent multiple simultaneous requests
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = query 
        ? await findProviderLocations(query)
        : await fetchProviderLocations();
      
      if (response.error) {
        setError(response.error.message);
        toast.error(response.error.message);
      } else {
        let sortedLocations: ProviderLocation[];
        
        if (query && query.trim().length > 0) {
          // When searching, prioritize exact matches first, then partial matches, then by provider count
          const queryLower = query.toLowerCase().trim();
          
          sortedLocations = [...response.locations].sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            const aCity = a.city?.toLowerCase() || '';
            const bCity = b.city?.toLowerCase() || '';
            const aRegion = a.region?.toLowerCase() || '';
            const bRegion = b.region?.toLowerCase() || '';
            const aCountry = a.country?.toLowerCase() || '';
            const bCountry = b.country?.toLowerCase() || '';
            
            // Check for exact matches (highest priority)
            const aExactMatch = aName === queryLower || aCity === queryLower || 
                               aRegion === queryLower || aCountry === queryLower;
            const bExactMatch = bName === queryLower || bCity === queryLower || 
                               bRegion === queryLower || bCountry === queryLower;
            
            if (aExactMatch && !bExactMatch) return -1;
            if (!aExactMatch && bExactMatch) return 1;
            
            // Check for starts with matches (second priority)
            const aStartsWith = aName.startsWith(queryLower) || aCity.startsWith(queryLower) || 
                               aRegion.startsWith(queryLower) || aCountry.startsWith(queryLower);
            const bStartsWith = bName.startsWith(queryLower) || bCity.startsWith(queryLower) || 
                               bRegion.startsWith(queryLower) || bCountry.startsWith(queryLower);
            
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            
            // Check for contains matches (third priority)
            const aContains = aName.includes(queryLower) || aCity.includes(queryLower) || 
                             aRegion.includes(queryLower) || aCountry.includes(queryLower);
            const bContains = bName.includes(queryLower) || bCity.includes(queryLower) || 
                             bRegion.includes(queryLower) || bCountry.includes(queryLower);
            
            if (aContains && !bContains) return -1;
            if (!aContains && bContains) return 1;
            
            // If same match type, sort by provider count (descending)
            return b.provider_count - a.provider_count;
          }).slice(0, 50) as ProviderLocation[];
        } else {
          // When not searching, sort by provider count in descending order (default behavior)
          sortedLocations = [...response.locations]
            .sort((a, b) => b.provider_count - a.provider_count)
            .slice(0, 50) as ProviderLocation[];
        }

        // Update state in a single batch
        setLocations(sortedLocations);
        setDevices(response.devices.slice(0, 50));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load provider locations';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Memoize and configure debounce with a longer delay
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.trim().length >= 2) {
        loadLocations(query.trim());
      }
    }, 500),
    [loadLocations]
  );

  useEffect(() => {
    loadLocations();
    return () => {
      debouncedSearch.cancel();
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsSearchActive(query.trim().length > 0);
    
    if (query.trim().length === 0) {
      setIsSearchActive(false);
      loadLocations();
    } else if (query.trim().length >= 2) {
      setIsSearchActive(true);
      debouncedSearch(query);
    }
  };

  // Memoize card components
  const LocationCard = React.memo<{ location: ProviderLocation }>(({ location }) => (
    <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 border border-gray-700 hover:border-gray-600 transform hover:scale-105">
      <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-3 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-100 truncate flex-1" title={location.name}>
            {location.name}
          </h3>
          <span className="bg-purple-900 text-purple-300 text-xs font-medium px-2 py-1 rounded border border-purple-700">
            {location.provider_count} Providers
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Users size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-400">Provider Count</p>
              <p className="text-sm font-medium text-purple-300">{location.provider_count || 0}</p>
            </div>
          </div>
          
          {location.region && (
            <div className="flex items-start gap-3">
              <Globe size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-400">Region</p>
                <p className="text-sm text-gray-200">{location.region}</p>
              </div>
            </div>
          )}
          
          {location.country_code && (
            <div className="flex items-start gap-3">
              <Globe size={16} className="text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-400">Country Code</p>
                <p className="text-sm text-gray-200 font-mono">{location.country_code}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl">
              <MapPin className="text-white" size={28} />
            </div>
            Provider Locations
          </h2>
          <p className="text-gray-400 mt-2">Browse and search provider locations worldwide</p>
          {isSearchActive && (
            <p className="text-sm text-blue-400 mt-1">
              Search results prioritized by exact matches, then partial matches
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Globe size={16} className="text-purple-400" />
            <span className="text-sm text-gray-500">
              {locations.length} locations {isSearchActive ? 'found' : 'available'}
              {isSearchActive ? '' : ' (sorted by provider count)'}
            </span>
          </div>
        </div>
        
        <button
          onClick={() => loadLocations()}
          disabled={isLoading}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-all duration-200 border border-purple-500 hover:shadow-lg"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh Locations
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search locations (minimum 2 characters)..."
          className="block w-full pl-10 pr-3 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
        />
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-red-300">Error loading locations</h3>
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-purple-500"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 animate-pulse"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Globe className="text-blue-400" size={20} />
              Provider Locations
             <span className="text-sm text-gray-400 font-normal">({locations.length})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location) => (
                <LocationCard key={location.location_id} location={location} />
              ))}
            </div>
          </div>
          
          {devices.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Users className="text-green-400" size={20} />
                Provider Devices
                <span className="text-sm text-gray-400 font-normal">({devices.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {devices.slice(0, 20).map((device) => (
                  <div key={device.client_id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                    <div className="flex items-center gap-3">
                      <Users size={16} className="text-green-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-200 truncate" title={device.device_name}>
                          {device.device_name || 'Unnamed Device'}
                        </p>
                        <p className="text-xs text-gray-400 font-mono truncate" title={device.client_id}>
                          {device.client_id.substring(0, 12)}...
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {devices.length > 20 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-400">
                    Showing 20 of {devices.length} devices
                  </p>
                </div>
              )}
            </div>
          )}

          {locations.length === 0 && !isLoading && (
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 text-center border border-gray-700">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="text-gray-500" size={24} />
                </div>
                <h3 className="text-lg font-medium text-gray-200 mb-2">No Locations Found</h3>
                <p className="text-gray-400 italic">
                  {searchQuery ? 'Try adjusting your search terms or clear the search to see all locations.' : 'No provider locations available at the moment.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProvidersSection;