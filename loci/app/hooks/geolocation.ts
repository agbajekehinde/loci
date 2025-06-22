// hooks/useGeolocation.ts

import { useState, useEffect, useCallback } from 'react';

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface GeolocationState {
  location: Location | null;
  pinLocation: Location | null;
  status: 'requesting' | 'granted' | 'denied' | 'unavailable';
  pinDropped: boolean;
  error: string | null;
}

interface GeolocationActions {
  requestLocation: () => void;
  simulateMapPin: () => void;
  resetToUserLocation: () => void;
  setPinLocation: (location: Location) => void;
}

export const useGeolocation = (): GeolocationState & GeolocationActions => {
  const [location, setLocation] = useState<Location | null>(null);
  const [pinLocation, setPinLocationState] = useState<Location | null>(null);
  const [status, setStatus] = useState<'requesting' | 'granted' | 'denied' | 'unavailable'>('requesting');
  const [pinDropped, setPinDropped] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification('LandVerify', {
            body: 'Please allow location access to verify your address',
            icon: '/favicon.ico'
          });
        }
      } catch (error) {
        console.error('Notification permission error:', error);
      }
    }
  }, []);

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      setError('Geolocation is not supported by this browser');
      return;
    }

    await requestNotificationPermission();

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        setLocation(newLocation);
        setPinLocationState(newLocation);
        setStatus('granted');
        setError(null);
        
        if (Notification.permission === 'granted') {
          new Notification('Location Access Granted', {
            body: 'Your location has been captured for address verification',
            icon: '/favicon.ico'
          });
        }
      },
      (error) => {
        console.error('Location error:', error);
        setStatus('denied');
        setError(error.message);
        
        if (Notification.permission === 'granted') {
          new Notification('Location Access Denied', {
            body: 'Manual pin drop will be required for verification',
            icon: '/favicon.ico'
          });
        }
      },
      options
    );
  }, [requestNotificationPermission]);

  const simulateMapPin = () => {
    const baseLocation = location || { latitude: 6.5244, longitude: 3.3792 }; // Default to Lagos
    const offset = 0.01;
    
    const newPin: Location = {
      latitude: baseLocation.latitude + (Math.random() - 0.5) * offset,
      longitude: baseLocation.longitude + (Math.random() - 0.5) * offset
    };
    
    setPinLocationState(newPin);
    setPinDropped(true);

    if (Notification.permission === 'granted') {
      new Notification('Location Pin Updated', {
        body: `New coordinates: ${newPin.latitude.toFixed(6)}, ${newPin.longitude.toFixed(6)}`,
        icon: '/favicon.ico'
      });
    }
  };

  const resetToUserLocation = () => {
    if (location) {
      setPinLocationState(location);
      setPinDropped(false);
    }
  };

  const setPinLocation = (newLocation: Location) => {
    setPinLocationState(newLocation);
    setPinDropped(true);
  };

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return {
    location,
    pinLocation,
    status,
    pinDropped,
    error,
    requestLocation,
    simulateMapPin,
    resetToUserLocation,
    setPinLocation
  };
};