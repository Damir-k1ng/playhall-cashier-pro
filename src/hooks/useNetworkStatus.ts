import { useState, useEffect, useCallback, useRef } from 'react';

export type ConnectionQuality = 'good' | 'slow' | 'offline';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [quality, setQuality] = useState<ConnectionQuality>(navigator.onLine ? 'good' : 'offline');
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkLatency = useCallback(async () => {
    if (!navigator.onLine) {
      setQuality('offline');
      return;
    }
    
    try {
      const start = performance.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-pin`, {
        method: 'OPTIONS',
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      const latency = performance.now() - start;
      
      if (latency < 1500) {
        setQuality('good');
      } else {
        setQuality('slow');
      }
    } catch {
      // If OPTIONS fails but navigator says online → slow
      setQuality(navigator.onLine ? 'slow' : 'offline');
    }
  }, []);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setQuality('good');
    if (!navigator.onLine) return;
    setWasOffline(true);
    // Check real latency after coming back
    checkLatency();
  }, [checkLatency]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setQuality('offline');
    setWasOffline(false);
  }, []);

  const clearWasOffline = useCallback(() => {
    setWasOffline(false);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Periodic latency check every 30 seconds
    checkLatency();
    pingIntervalRef.current = setInterval(checkLatency, 30000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [handleOnline, handleOffline, checkLatency]);

  return { isOnline, wasOffline, clearWasOffline, quality };
}