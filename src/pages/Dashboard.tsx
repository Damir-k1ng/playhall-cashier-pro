import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStations } from '@/hooks/useStations';
import { useNetworkStatusContext } from '@/contexts/NetworkStatusContext';
import { Header } from '@/components/layout/Header';
import { StationGrid } from '@/components/stations/StationGrid';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PackageAlerts } from '@/components/PackageAlerts';
import { CashDeskModal } from '@/components/modals/CashDeskModal';
import { ShiftReportModal } from '@/components/modals/ShiftReportModal';
import { DrinkSalesModal } from '@/components/modals/DrinkSalesModal';
import { ShiftHistoryModal } from '@/components/modals/ShiftHistoryModal';
import { ClubSetupWizard } from '@/components/setup/ClubSetupWizard';
import { Loader2 } from 'lucide-react';
import { CLUB_NAME, APP_VERSION } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { getQueue, dequeue } from '@/lib/offline-queue';
import { apiClient } from '@/lib/api';
import logoImage from '@/assets/logo.jpg';

export function Dashboard() {
  const { tenant } = useAuth();
  const { stations, isLoading, isRefreshing, refetch: refetchStations } = useStations();
  const { isOnline, wasOffline, clearWasOffline } = useNetworkStatusContext();
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  
  // Modals
  const [cashDeskModalOpen, setCashDeskModalOpen] = useState(false);
  const [shiftReportModalOpen, setShiftReportModalOpen] = useState(false);
  const [drinkSalesModalOpen, setDrinkSalesModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Sync offline queue when coming back online
  const syncQueue = useCallback(async () => {
    const queue = getQueue();
    if (queue.length === 0) return;
    
    setIsSyncing(true);
    setQueueLength(queue.length);

    for (const action of queue) {
      try {
        if (action.type === 'create_session') {
          await apiClient.createSession(action.payload as any);
        }
        dequeue(action.id);
        setQueueLength(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Sync failed for action:', action.id, err);
        // Stop syncing on first failure — will retry next time
        break;
      }
    }

    setIsSyncing(false);
    const remaining = getQueue().length;
    setQueueLength(remaining);
    if (remaining === 0 && queue.length > 0) {
      toast({
        title: '✅ Очередь синхронизирована',
        description: `Успешно отправлено: ${queue.length}`,
      });
    }
    refetchStations();
  }, [refetchStations]);

  useEffect(() => {
    if (wasOffline && isOnline) {
      syncQueue().then(() => clearWasOffline());
    }
  }, [wasOffline, isOnline, syncQueue, clearWasOffline]);

  // Update queue length on interval (for display)
  useEffect(() => {
    if (!isOnline) {
      const interval = setInterval(() => setQueueLength(getQueue().length), 2000);
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl overflow-hidden glow-cyan-strong">
            <img src={logoImage} alt={CLUB_NAME} className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-2xl animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-muted-foreground font-medium">Загрузка станций...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,hsl(185_100%_50%_/_0.03)_0%,transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(155_100%_45%_/_0.02)_0%,transparent_50%)] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col h-full">
        <PackageAlerts stations={stations} />
        <OfflineBanner isOnline={isOnline} isSyncing={isSyncing} queueLength={queueLength} />
        <Header 
          onOpenCashDesk={() => setCashDeskModalOpen(true)}
          onOpenShiftReport={() => setShiftReportModalOpen(true)}
          onOpenDrinkSales={() => setDrinkSalesModalOpen(true)}
          onOpenHistory={() => setHistoryModalOpen(true)}
          isRefreshing={isRefreshing}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <StationGrid stations={stations} refetchStations={refetchStations} />
          </div>
        </main>
        
        <footer className="shrink-0 py-3 text-center border-t border-border/30 bg-background/80 backdrop-blur-sm">
          <span className="text-muted-foreground text-sm tracking-wide">
            <span className="font-brand text-primary">Lavé</span>
            <span className="text-muted-foreground/60"> POS</span>
            <span className="mx-2 text-muted-foreground/40">·</span>
            <span className="font-mono text-xs">{APP_VERSION}</span>
            <span className="mx-2 text-muted-foreground/40">·</span>
            <span className="text-emerald-400/80">by Damir Kabdulla</span>
          </span>
        </footer>
      </div>

      {/* Modals */}
      <CashDeskModal
        open={cashDeskModalOpen}
        onClose={() => setCashDeskModalOpen(false)}
      />

      <ShiftReportModal
        open={shiftReportModalOpen}
        onClose={() => setShiftReportModalOpen(false)}
      />

      <DrinkSalesModal
        open={drinkSalesModalOpen}
        onClose={() => setDrinkSalesModalOpen(false)}
      />

      <ShiftHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
      />
    </div>
  );
}
