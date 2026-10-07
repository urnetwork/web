import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Search, RefreshCw, AlertCircle, Globe, Users } from 'lucide-react';
import { fetchProviderLocations, findProviderLocations } from '../services/api';
import type { Device } from '../services/api';
import toast from 'react-hot-toast';
import debounce from 'lodash/debounce';
import { Location } from '../services/types';
import { getColorHex } from '../theme/locationColors';

const ProvidersSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
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
        let sortedLocations: Location[];
        
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
          }).slice(0, 50) as Location[];
        } else {
          // When not searching, sort by provider count in descending order (default behavior)
          sortedLocations = [...response.locations]
            .sort((a, b) => b.provider_count - a.provider_count)
            .slice(0, 50) as Location[];
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
  const LocationCard = React.memo<{ location: Location }>(({ location }) => (
    <div className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden hover:shadow-3xl transition-all duration-300 border border-ur-border hover:border-ur-border transform hover:scale-105">
      <div className="bg-ur-raised px-4 py-3 border-b border-ur-border">
        <div className="flex items-center justify-between">
          <span
            className="w-4 h-4 rounded-full flex-shrink-0 mr-2"
            style={{ backgroundColor: getColorHex(location.country_code || location.name) }}
            aria-hidden
          />
          <h3 className="font-medium text-ur-white truncate flex-1" title={location.name}>
            {location.name}
          </h3>
          <span className="bg-ur-pink/10 text-ur-pink text-xs font-medium px-2 py-1 rounded border border-ur-pink/40">
            {location.provider_count} Providers
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Users size={16} className="text-ur-pink mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-ur-gray">Provider Count</p>
              <p className="text-sm font-medium text-ur-pink">{location.provider_count || 0}</p>
            </div>
          </div>
          
          {location.region && (
            <div className="flex items-start gap-3">
              <Globe size={16} className="text-ur-yellow-light mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-ur-gray">Region</p>
                <p className="text-sm text-ur-white">{location.region}</p>
              </div>
            </div>
          )}
          
          {location.country_code && (
            <div className="flex items-start gap-3">
              <Globe size={16} className="text-ur-coral mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-ur-gray">Country Code</p>
                <p className="text-sm text-ur-white font-mono">{location.country_code}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-staggerFadeUp" style={{ animationDelay: '0.05s' }}>
        <div>
          <h2 className="text-3xl font-bold text-ur-white flex items-center gap-3">
            <div className="p-2 bg-ur-pink rounded-ur">
              <MapPin className="text-ur-black" size={28} />
            </div>
            Provider Locations
          </h2>
          <p className="text-ur-gray mt-2">Browse and search provider locations worldwide</p>
          {isSearchActive && (
            <p className="text-sm text-ur-blue-light mt-1">
              Search results prioritized by exact matches, then partial matches
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Globe size={16} className="text-ur-pink" />
            <span className="text-sm text-ur-gray-dark">
              {locations.length} locations {isSearchActive ? 'found' : 'available'}
              {isSearchActive ? '' : ' (sorted by provider count)'}
            </span>
          </div>
        </div>
        
        <button
          onClick={() => loadLocations()}
          disabled={isLoading}
          className="flex items-center gap-2 bg-ur-pink hover:bg-ur-pink/90 text-ur-black px-6 py-3 rounded-lg transition-all duration-200 border border-ur-pink "
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh Locations
        </button>
      </div>

      <div className="relative animate-staggerFadeUp" style={{ animationDelay: '0.1s' }}>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-ur-gray" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search locations (minimum 2 characters)..."
          className="block w-full pl-10 pr-3 py-3 bg-ur-panel border border-ur-border rounded-lg text-ur-white placeholder-ur-gray-dark focus:outline-none focus:ring-2 focus:ring-ur-pink focus:border-ur-pink transition-all duration-200"
        />
      </div>

      {error && (
        <div className="bg-ur-coral/15 border border-ur-coral p-4 rounded-ur flex items-start gap-3">
          <AlertCircle size={20} className="text-ur-coral mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-ur-coral">Error loading locations</h3>
            <p className="text-ur-coral">{error}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-ur-border border-t-ur-pink"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-ur-pink/20 to-ur-blue/20 animate-pulse"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-ur-white mb-6 flex items-center gap-2 animate-staggerFadeUp" style={{ animationDelay: '0.15s' }}>
              <Globe className="text-ur-blue-light" size={20} />
              Provider Locations
             <span className="text-sm text-ur-gray font-normal">({locations.length})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-staggerFadeUp" style={{ animationDelay: '0.2s' }}>
              {locations.map((location) => (
                <LocationCard key={location.location_id} location={location} />
              ))}
            </div>
          </div>
          
          {devices.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-ur-white mb-6 flex items-center gap-2">
                <Users className="text-ur-green" size={20} />
                Provider Devices
                <span className="text-sm text-ur-gray font-normal">({devices.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {devices.slice(0, 20).map((device) => (
                  <div key={device.client_id} className="bg-ur-panel rounded-lg p-4 border border-ur-border hover:border-ur-border transition-colors">
                    <div className="flex items-center gap-3">
                      <Users size={16} className="text-ur-green flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ur-white truncate" title={device.device_name}>
                          {device.device_name || 'Unnamed Device'}
                        </p>
                        <p className="text-xs text-ur-gray font-mono truncate" title={device.client_id}>
                          {device.client_id.substring(0, 12)}...
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {devices.length > 20 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-ur-gray">
                    Showing 20 of {devices.length} devices
                  </p>
                </div>
              )}
            </div>
          )}

          {locations.length === 0 && !isLoading && (
            <div className="bg-ur-panel rounded-ur shadow-ur-flat p-8 text-center border border-ur-border">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-ur-raised rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="text-ur-gray-dark" size={24} />
                </div>
                <h3 className="text-lg font-medium text-ur-white mb-2">No Locations Found</h3>
                <p className="text-ur-gray italic">
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