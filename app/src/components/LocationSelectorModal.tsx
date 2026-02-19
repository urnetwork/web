import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, MapPin, Users, Globe, Loader2 } from 'lucide-react';
import { fetchProviderLocations, findProviderLocations } from '../services/api';
import type { Location } from '../services/types';
import toast from 'react-hot-toast';
import debounce from 'lodash/debounce';

interface LocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: Location) => void;
  currentCountryCode?: string;
  currentLocationId?: string;
}

const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  currentCountryCode,
  currentLocationId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const isLoadingRef = useRef(false);

  const loadLocations = useCallback(async (query?: string) => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
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

            const aExactMatch = aName === queryLower || aCity === queryLower ||
              aRegion === queryLower || aCountry === queryLower;
            const bExactMatch = bName === queryLower || bCity === queryLower ||
              bRegion === queryLower || bCountry === queryLower;

            if (aExactMatch && !bExactMatch) return -1;
            if (!aExactMatch && bExactMatch) return 1;

            const aStartsWith = aName.startsWith(queryLower) || aCity.startsWith(queryLower) ||
              aRegion.startsWith(queryLower) || aCountry.startsWith(queryLower);
            const bStartsWith = bName.startsWith(queryLower) || bCity.startsWith(queryLower) ||
              bRegion.startsWith(queryLower) || bCountry.startsWith(queryLower);

            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;

            const aContains = aName.includes(queryLower) || aCity.includes(queryLower) ||
              aRegion.includes(queryLower) || aCountry.includes(queryLower);
            const bContains = bName.includes(queryLower) || bCity.includes(queryLower) ||
              bRegion.includes(queryLower) || bCountry.includes(queryLower);

            if (aContains && !bContains) return -1;
            if (!aContains && bContains) return 1;

            return b.provider_count - a.provider_count;
          }).slice(0, 50) as Location[];
        } else {
          sortedLocations = [...response.locations]
            .sort((a, b) => b.provider_count - a.provider_count)
            .slice(0, 50) as Location[];
        }

        setLocations(sortedLocations);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load provider locations';
      setError(message);
      toast.error(message);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      if (query.trim().length >= 2) {
        loadLocations(query.trim());
      }
    }, 500),
    [loadLocations]
  );

  useEffect(() => {
    if (isOpen) {
      loadLocations();
    }
    return () => {
      debouncedSearch.cancel();
    };
  }, [isOpen, loadLocations, debouncedSearch]);

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

  const handleSelectLocation = (location: Location) => {
    onSelectLocation(location);
    const label = location.location_type === 'country'
      ? `${location.name} (${location.country_code.toUpperCase()})`
      : `${location.name} (${location.location_type})`;
    toast.success(`Selected ${label}`);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const portalRoot = document.getElementById('portal-root');
  if (!portalRoot) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-visible"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-selector-title"
    >
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col border border-gray-700 animate-fadeIn">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 border-b border-gray-600 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <MapPin size={24} className="text-white" />
            <div>
              <h2 id="location-selector-title" className="text-xl font-bold text-white">
                Select Provider Location
              </h2>
              <p className="text-teal-100 text-sm mt-1">
                Browse and search locations by provider availability
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-teal-700 p-2 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search locations (minimum 2 characters)..."
              className="block w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200"
              autoFocus
            />
          </div>

          {isSearchActive && (
            <p className="text-sm text-teal-400">
              Search results prioritized by exact matches, then partial matches
            </p>
          )}

          <div className="flex items-center gap-2">
            <Globe size={16} className="text-teal-400" />
            <span className="text-sm text-gray-400">
              {locations.length} locations {isSearchActive ? 'found' : 'available'}
              {isSearchActive ? '' : ' (sorted by provider count)'}
            </span>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 p-3 rounded-lg flex items-start gap-2">
              <div>
                <h3 className="font-medium text-red-300 text-sm">Error loading locations</h3>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex-1 flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={48} className="text-teal-500 animate-spin" />
                <p className="text-gray-400">Loading locations...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-2 py-1">
              {locations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                  {locations.map((location) => (
                    <button
                      key={location.location_id}
                      onClick={() => handleSelectLocation(location)}
                      className={`bg-gray-750 rounded-lg p-4 border transition-all duration-200 text-left hover:scale-105 hover:shadow-lg ${
                        (currentLocationId && currentLocationId === location.location_id) ||
                        (!currentLocationId && currentCountryCode?.toLowerCase() === location.country_code?.toLowerCase() && location.location_type === 'country')
                          ? 'border-teal-500 bg-teal-900/30'
                          : 'border-gray-600 hover:border-teal-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <h3 className="font-medium text-gray-100 truncate" title={location.name}>
                            {location.name}
                          </h3>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
                            location.location_type === 'city'
                              ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                              : location.location_type === 'region'
                                ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50'
                                : 'bg-gray-700 text-gray-400 border border-gray-600'
                          }`}>
                            {location.location_type}
                          </span>
                        </div>
                        <span className="bg-teal-900 text-teal-300 text-xs font-medium px-2 py-1 rounded border border-teal-700 ml-2 flex-shrink-0">
                          {location.provider_count}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-teal-400 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">Provider Count</p>
                            <p className="text-xs font-medium text-teal-300">{location.provider_count || 0}</p>
                          </div>
                        </div>

                        {location.country_code && (
                          <div className="flex items-center gap-2">
                            <Globe size={14} className="text-orange-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-400">Country Code</p>
                              <p className="text-xs text-gray-200 font-mono">{location.country_code.toUpperCase()}</p>
                            </div>
                          </div>
                        )}

                        {location.region && (
                          <div className="flex items-center gap-2">
                            <Globe size={14} className="text-yellow-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-400">Region</p>
                              <p className="text-xs text-gray-200">{location.region}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex justify-center items-center py-12">
                  <div className="max-w-md text-center">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MapPin className="text-gray-500" size={24} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-200 mb-2">No Locations Found</h3>
                    <p className="text-gray-400">
                      {searchQuery ? 'Try adjusting your search terms or clear the search to see all locations.' : 'No provider locations available at the moment.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    portalRoot
  );
};

export default LocationSelectorModal;
