"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export const LOCATIONS = [
  'All Locations',
  'NEW SOUND Warehouse',
  'Bright Audio Warehouse',
] as const;

export type LocationType = typeof LOCATIONS[number];

interface LocationContextType {
  currentLocation: LocationType;
  setCurrentLocation: (location: LocationType) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [currentLocation, setCurrentLocationState] = useState<LocationType>('All Locations');

  // Load location from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('selectedLocation') as LocationType;
    if (savedLocation && LOCATIONS.includes(savedLocation)) {
      setCurrentLocationState(savedLocation);
    }
  }, []);

  // Save location to localStorage when it changes
  const setCurrentLocation = (location: LocationType) => {
    setCurrentLocationState(location);
    localStorage.setItem('selectedLocation', location);
  };

  return (
    <LocationContext.Provider value={{ currentLocation, setCurrentLocation }}>
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
