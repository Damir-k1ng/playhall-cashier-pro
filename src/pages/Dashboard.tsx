import React, { useState } from 'react';
import { useStations } from '@/hooks/useStations';
import { Header } from '@/components/layout/Header';
import { StationGrid } from '@/components/stations/StationGrid';
import { CashDeskModal } from '@/components/modals/CashDeskModal';
import { ShiftReportModal } from '@/components/modals/ShiftReportModal';
import { DrinkSalesModal } from '@/components/modals/DrinkSalesModal';
import { ShiftHistoryModal } from '@/components/modals/ShiftHistoryModal';
import { Loader2 } from 'lucide-react';
import { DualSenseIcon } from '@/components/icons/DualSenseIcon';

export function Dashboard() {
  const { stations, isLoading, refetch: refetchStations } = useStations();
  
  // Modals
  const [cashDeskModalOpen, setCashDeskModalOpen] = useState(false);
  const [shiftReportModalOpen, setShiftReportModalOpen] = useState(false);
  const [drinkSalesModalOpen, setDrinkSalesModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-cyan-strong">
            <DualSenseIcon size={48} className="text-primary-foreground animate-pulse" />
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
    <div className="min-h-screen bg-background">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,hsl(185_100%_50%_/_0.03)_0%,transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(155_100%_45%_/_0.02)_0%,transparent_50%)] pointer-events-none" />
      
      <div className="relative z-10">
        <Header 
          onOpenCashDesk={() => setCashDeskModalOpen(true)}
          onOpenShiftReport={() => setShiftReportModalOpen(true)}
          onOpenDrinkSales={() => setDrinkSalesModalOpen(true)}
          onOpenHistory={() => setHistoryModalOpen(true)}
        />
        
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          <StationGrid stations={stations} refetchStations={refetchStations} />
        </main>
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
