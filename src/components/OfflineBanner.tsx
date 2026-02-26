import React, { useState, useEffect, useRef } from 'react';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineBannerProps {
  isOnline: boolean;
  isSyncing: boolean;
  queueLength: number;
}

type BannerState = 'hidden' | 'offline' | 'syncing' | 'restored';

export function OfflineBanner({ isOnline, isSyncing, queueLength }: OfflineBannerProps) {
  const [state, setState] = useState<BannerState>('hidden');
  const [isExiting, setIsExiting] = useState(false);
  const wasOfflineRef = useRef(false);
  const hideTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (!isOnline) {
      wasOfflineRef.current = true;
      setIsExiting(false);
      setState('offline');
    } else if (isSyncing) {
      setIsExiting(false);
      setState('syncing');
    } else if (wasOfflineRef.current) {
      // Just came back online
      setIsExiting(false);
      setState('restored');
      wasOfflineRef.current = false;
      // Auto-hide after 3 seconds with exit animation
      hideTimeoutRef.current = window.setTimeout(() => {
        setIsExiting(true);
        // Wait for animation to finish before hiding
        hideTimeoutRef.current = window.setTimeout(() => {
          setState('hidden');
          setIsExiting(false);
        }, 300);
      }, 3000);
    } else {
      setState('hidden');
    }

    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isOnline, isSyncing]);

  if (state === 'hidden') return null;

  return (
    <div
      className={cn(
        'px-4 py-2.5 flex items-center justify-center gap-2 text-sm border-b transition-all duration-300 overflow-hidden',
        isExiting && 'animate-slide-up',
        !isExiting && 'animate-slide-down',
        state === 'offline' && 'bg-destructive/15 border-destructive/30',
        state === 'syncing' && 'bg-accent border-border',
        state === 'restored' && 'bg-secondary/15 border-secondary/30',
      )}
    >
      {state === 'offline' && (
        <>
          <WifiOff className="w-4 h-4 text-destructive animate-pulse" />
          <span className="text-destructive font-medium">Офлайн-режим</span>
          <span className="text-destructive/60">•</span>
          <span className="text-destructive/70">Данные из кэша</span>
          {queueLength > 0 && (
            <>
              <span className="text-destructive/60">•</span>
              <span className="text-destructive/70">{queueLength} в очереди</span>
            </>
          )}
        </>
      )}
      {state === 'syncing' && (
        <>
          <RefreshCw className="w-4 h-4 text-primary animate-spin" />
          <span className="text-accent-foreground font-medium">Синхронизация...</span>
          <span className="text-muted-foreground">{queueLength} осталось</span>
        </>
      )}
      {state === 'restored' && (
        <>
          <Wifi className="w-4 h-4 text-secondary" />
          <span className="text-secondary font-medium">Подключение восстановлено</span>
        </>
      )}
    </div>
  );
}
