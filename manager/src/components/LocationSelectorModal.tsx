import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, MapPin, Users, Globe, Loader2 } from 'lucide-react';
import { fetchProviderLocations, findProviderLocations } from '../services/api';
import type { Location } from '../services/types';
import toast from 'react-hot-toast';
import debounce from 'lodash/debounce';
import { getColorHex } from '../theme/locationColors';

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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-ur-black/70 backdrop-blur-sm p-4 overflow-visible"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-selector-title"
    >
      <div className="bg-ur-panel rounded-ur shadow-ur-flat w-full max-w-5xl max-h-[85vh] flex flex-col border border-ur-border animate-fadeIn">
        <div className="bg-ur-raised px-6 py-4 border-b border-ur-border flex items-center justify-between rounded-t-ur">
          <div className="flex items-center gap-3">
            <MapPin size={24} className="text-ur-white" />
            <div>
              <h2 id="location-selector-title" className="text-xl font-bold text-ur-white">
                Select Provider Location
              </h2>
              <p className="text-ur-gray text-sm mt-1">
                Browse and search locations by provider availability
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ur-white hover:bg-ur-hover p-2 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-ur-gray" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search locations (minimum 2 characters)..."
              className="block w-full pl-10 pr-3 py-3 bg-ur-raised border border-ur-border rounded-lg text-ur-white placeholder-ur-gray-dark focus:outline-none focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200"
              autoFocus
            />
          </div>

          {isSearchActive && (
            <p className="text-sm text-ur-gray">
              Search results prioritized by exact matches, then partial matches
            </p>
          )}

          <div className="flex items-center gap-2">
            <Globe size={16} className="text-ur-green" />
            <span className="text-sm text-ur-gray">
              {locations.length} locations {isSearchActive ? 'found' : 'available'}
              {isSearchActive ? '' : ' (sorted by provider count)'}
            </span>
          </div>

          {error && (
            <div className="bg-ur-coral/15 border border-ur-coral p-3 rounded-lg flex items-start gap-2">
              <div>
                <h3 className="font-medium text-ur-coral text-sm">Error loading locations</h3>
                <p className="text-ur-coral text-sm">{error}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex-1 flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={48} className="text-ur-green animate-spin" />
                <p className="text-ur-gray">Loading locations...</p>
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
                      className={`bg-ur-raised rounded-lg p-4 border transition-all duration-200 text-left hover:scale-105 ${
 (currentLocationId && currentLocationId === location.location_id) ||
 (!currentLocationId && currentCountryCode?.toLowerCase() === location.country_code?.toLowerCase() && location.location_type === 'country')
 ? 'border-ur-green bg-ur-green/10'
 : 'border-ur-border hover:border-ur-green'
 }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getColorHex(location.country_code || location.name) }}
                            aria-hidden
                          />
                          <h3 className="font-medium text-ur-white truncate" title={location.name}>
                            {location.name}
                          </h3>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
 location.location_type === 'city'
 ? 'bg-ur-blue/15 text-ur-blue-light border border-ur-blue/40'
 : location.location_type === 'region'
 ? 'bg-ur-yellow-light/10 text-ur-yellow-light border border-ur-yellow-light/30'
 : 'bg-ur-raised text-ur-gray border border-ur-border'
 }`}>
                            {location.location_type}
                          </span>
                        </div>
                        <span className="bg-ur-green/10 text-ur-green text-xs font-medium px-2 py-1 rounded border border-ur-green/40 ml-2 flex-shrink-0">
                          {location.provider_count}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-ur-green flex-shrink-0" />
                          <div>
                            <p className="text-xs text-ur-gray">Provider Count</p>
                            <p className="text-xs font-medium text-ur-green">{location.provider_count || 0}</p>
                          </div>
                        </div>

                        {location.country_code && (
                          <div className="flex items-center gap-2">
                            <Globe size={14} className="text-ur-coral flex-shrink-0" />
                            <div>
                              <p className="text-xs text-ur-gray">Country Code</p>
                              <p className="text-xs text-ur-white font-mono">{location.country_code.toUpperCase()}</p>
                            </div>
                          </div>
                        )}

                        {location.region && (
                          <div className="flex items-center gap-2">
                            <Globe size={14} className="text-ur-yellow-light flex-shrink-0" />
                            <div>
                              <p className="text-xs text-ur-gray">Region</p>
                              <p className="text-xs text-ur-white">{location.region}</p>
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
                    <div className="w-16 h-16 bg-ur-raised rounded-full flex items-center justify-center mx-auto mb-4">
                      <MapPin className="text-ur-gray-dark" size={24} />
                    </div>
                    <h3 className="text-lg font-medium text-ur-white mb-2">No Locations Found</h3>
                    <p className="text-ur-gray">
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
