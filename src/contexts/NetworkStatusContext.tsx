import React, { createContext, useContext } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface NetworkStatusContextType {
  isOnline: boolean;
  wasOffline: boolean;
  clearWasOffline: () => void;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isOnline: true,
  wasOffline: false,
  clearWasOffline: () => {},
});

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const networkStatus = useNetworkStatus();

  return (
    <NetworkStatusContext.Provider value={networkStatus}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatusContext() {
  return useContext(NetworkStatusContext);
}
