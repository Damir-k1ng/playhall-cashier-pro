import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
  isSyncing: boolean;
  queueLength: number;
}

export function OfflineBanner({ isOnline, isSyncing, queueLength }: OfflineBannerProps) {
  if (isOnline && !isSyncing && queueLength === 0) return null;

  if (!isOnline) {
    return (
      <div className="bg-destructive/20 border-b border-destructive/30 px-4 py-2 flex items-center justify-center gap-2 text-sm">
        <WifiOff className="w-4 h-4 text-destructive" />
        <span className="text-destructive font-medium">Офлайн-режим</span>
        <span className="text-destructive/70">• Данные из кэша</span>
        {queueLength > 0 && (
          <span className="text-destructive/70">• {queueLength} в очереди</span>
        )}
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="bg-accent border-b border-border px-4 py-2 flex items-center justify-center gap-2 text-sm">
        <RefreshCw className="w-4 h-4 text-primary animate-spin" />
        <span className="text-accent-foreground font-medium">Синхронизация...</span>
        <span className="text-muted-foreground">{queueLength} осталось</span>
      </div>
    );
  }

  // Online but queue just finished — brief success (parent should hide after timeout)
  return null;
}
