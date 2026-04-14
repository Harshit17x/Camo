import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface Location {
  lat: number;
  lng: number;
}

export function useGeolocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [path, setPath] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    let watchId: string | number | null = null;

    const handleSuccess = (lat: number, lng: number) => {
      const newLoc = { lat, lng };
      
      setLocation(prev => {
        if (prev && prev.lat === newLoc.lat && prev.lng === newLoc.lng) return prev;
        return newLoc;
      });

      setPath(prev => {
        const last = prev[prev.length - 1];
        if (last && last.lat === newLoc.lat && last.lng === newLoc.lng) return prev;
        return [...prev, newLoc];
      });
      setLoading(false);
    };

    const handleError = (err: any) => {
      console.warn("Geolocation error:", err.message || err);
      setError(err.message || String(err));
      
      // Fallback to a default location if permission denied or other error
      // Only set fallback if we don't have a location yet
      setLocation(prev => prev || { lat: 23.1545, lng: 72.8850 }); // RRU Campus default
      setLoading(false);
    };

    const startTracking = async () => {
      try {
        if (isNative) {
          // Check/Request permissions first on native
          const permissions = await Geolocation.checkPermissions();
          if (permissions.location !== 'granted') {
            const request = await Geolocation.requestPermissions();
            if (request.location !== 'granted') {
              throw new Error('Location permission denied');
            }
          }

          // Get initial position
          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000
          });
          handleSuccess(position.coords.latitude, position.coords.longitude);

          // Watch position
          watchId = await Geolocation.watchPosition({
            enableHighAccuracy: true,
            timeout: 10000
          }, (pos, err) => {
            if (err) {
              handleError(err);
            } else if (pos) {
              handleSuccess(pos.coords.latitude, pos.coords.longitude);
            }
          });
        } else {
          // Web fallback
          if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by your browser');
          }

          navigator.geolocation.getCurrentPosition(
            (pos) => handleSuccess(pos.coords.latitude, pos.coords.longitude),
            handleError,
            { enableHighAccuracy: true, timeout: 10000 }
          );

          watchId = navigator.geolocation.watchPosition(
            (pos) => handleSuccess(pos.coords.latitude, pos.coords.longitude),
            handleError,
            { enableHighAccuracy: true }
          );
        }
      } catch (err) {
        handleError(err);
      }
    };

    startTracking();

    return () => {
      if (watchId !== null) {
        if (isNative) {
          Geolocation.clearWatch({ id: watchId as string });
        } else {
          navigator.geolocation.clearWatch(watchId as number);
        }
      }
    };
  }, [isNative]);

  return { location, path, error, loading };
}
