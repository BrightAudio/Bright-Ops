"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Keep for backwards compatibility
export const LOCATIONS = [
  'All Locations',
  'NEW SOUND Warehouse',
  'Bright Audio Warehouse',
] as const;

export type LocationType = string; // Changed from typeof LOCATIONS[number] to allow dynamic locations

interface LocationContextType {
  currentLocation: LocationType;
  setCurrentLocation: (location: LocationType) => void;
  availableLocations: string[]; // User's accessible warehouse names
  refreshLocations: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [currentLocation, setCurrentLocationState] = useState<LocationType>('All Locations');
  const [availableLocations, setAvailableLocations] = useState<string[]>(['All Locations']);
  const [loading, setLoading] = useState(true);

  // Load warehouses user has access to
  async function loadAvailableLocations() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAvailableLocations(['All Locations']);
        setLoading(false);
        return;
      }

      // Get warehouse access
      const { data: accessData, error: accessError } = await supabase
        .from('user_warehouse_access')
        .select('warehouse_id')
        .eq('user_id', user.id);

      if (accessError) {
        console.error('Error loading warehouse access:', accessError);
        setAvailableLocations(['All Locations']);
        setLoading(false);
        return;
      }

      if (!accessData || accessData.length === 0) {
        setAvailableLocations(['All Locations']);
        setLoading(false);
        return;
      }

      const warehouseIds = accessData.map(a => a.warehouse_id);

      // Get warehouse names
      const { data: warehousesData, error: warehousesError } = await supabase
        .from('warehouses')
        .select('name')
        .in('id', warehouseIds);

      if (warehousesError) {
        console.error('Error loading warehouses:', warehousesError);
        setAvailableLocations(['All Locations']);
      } else {
        const warehouseNames = warehousesData.map(w => w.name);
        setAvailableLocations(['All Locations', ...warehouseNames]);
      }
    } catch (error) {
      console.error('Error in loadAvailableLocations:', error);
      setAvailableLocations(['All Locations']);
    } finally {
      setLoading(false);
    }
  }

  // Load locations on mount
  useEffect(() => {
    loadAvailableLocations();
  }, []);

  // Load saved location from localStorage after locations are loaded
  useEffect(() => {
    if (!loading && availableLocations.length > 0) {
      const savedLocation = localStorage.getItem('selectedLocation');
      if (savedLocation && availableLocations.includes(savedLocation)) {
        setCurrentLocationState(savedLocation);
      } else {
        // Default to 'All Locations' if saved location is not available
        setCurrentLocationState('All Locations');
      }
    }
  }, [loading, availableLocations]);

  // Save location to localStorage when it changes
  const setCurrentLocation = (location: LocationType) => {
    setCurrentLocationState(location);
    localStorage.setItem('selectedLocation', location);
  };

  const refreshLocations = async () => {
    await loadAvailableLocations();
  };

  return (
    <LocationContext.Provider value={{ 
      currentLocation, 
      setCurrentLocation,
      availableLocations,
      refreshLocations
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
