import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface GlobalTimerContextType {
  // Current timestamp in milliseconds, updated every second
  currentTime: number;
  // Subscribe to timer updates (for components that need to react)
  getElapsedSeconds: (startedAt: string) => number;
  getElapsedMinutes: (startedAt: string) => number;
}

const GlobalTimerContext = createContext<GlobalTimerContextType | null>(null);

export function GlobalTimerProvider({ children }: { children: React.ReactNode }) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Single interval for the entire application
    intervalRef.current = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getElapsedSeconds = useCallback((startedAt: string): number => {
    const start = new Date(startedAt).getTime();
    return Math.floor((currentTime - start) / 1000);
  }, [currentTime]);

  const getElapsedMinutes = useCallback((startedAt: string): number => {
    const start = new Date(startedAt).getTime();
    return Math.floor((currentTime - start) / 60000);
  }, [currentTime]);

  return (
    <GlobalTimerContext.Provider value={{ currentTime, getElapsedSeconds, getElapsedMinutes }}>
      {children}
    </GlobalTimerContext.Provider>
  );
}

export function useGlobalTimer() {
  const context = useContext(GlobalTimerContext);
  if (!context) {
    throw new Error('useGlobalTimer must be used within GlobalTimerProvider');
  }
  return context;
}

// Hook for package remaining time calculation
export function usePackageRemaining(startedAt: string | undefined, packageCount: number = 1) {
  const { getElapsedMinutes } = useGlobalTimer();
  
  if (!startedAt) return 0;
  
  const totalPackageMinutes = 180 * packageCount; // 3 hours per package
  const elapsed = getElapsedMinutes(startedAt);
  return Math.max(0, totalPackageMinutes - elapsed);
}
