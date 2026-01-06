import React, { useState } from 'react';
import { useStations } from '@/hooks/useStations';
import { Header } from '@/components/layout/Header';
import { StationGrid } from '@/components/stations/StationGrid';
import { CashDeskModal } from '@/components/modals/CashDeskModal';
import { ShiftReportModal } from '@/components/modals/ShiftReportModal';
import { DrinkSalesModal } from '@/components/modals/DrinkSalesModal';
import { ShiftHistoryModal } from '@/components/modals/ShiftHistoryModal';
import { Loader2 } from 'lucide-react';
import { CLUB_NAME } from '@/lib/constants';
import logoImage from '@/assets/logo.jpg';

export function Dashboard() {
  const { stations, isLoading, isRefreshing, refetch: refetchStations } = useStations();
  
  // Modals
  const [cashDeskModalOpen, setCashDeskModalOpen] = useState(false);
  const [shiftReportModalOpen, setShiftReportModalOpen] = useState(false);
  const [drinkSalesModalOpen, setDrinkSalesModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

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
        
        <footer className="py-3 text-center flex items-center justify-center gap-3">
          <span className="text-emerald-400 font-medium tracking-wide text-sm animate-pulse drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]">
            by Damir Kabdulla
          </span>
          <span className="text-muted-foreground/50 text-xs">•</span>
          <span className="text-muted-foreground/50 text-xs font-mono">v1.0.0</span>
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
