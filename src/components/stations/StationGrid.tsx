import React, { useState } from 'react';
import { StationCard } from './StationCard';
import { BookedStationCard } from './BookedStationCard';
import { BookingModal } from '@/components/modals/BookingModal';
import { StationWithSession } from '@/types/database';
import { useBookings, BookingWithStation } from '@/hooks/useBookings';
import { useStations } from '@/hooks/useStations';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface StationGridProps {
  stations: StationWithSession[];
  refetchStations: () => Promise<void>;
}

export function StationGrid({ stations, refetchStations }: StationGridProps) {
  const { shift } = useAuth();
  const { bookings, createBooking, cancelBooking, completeBooking, refetch: refetchBookings } = useBookings();
  const { startSession } = useStations();
  
  // Booking modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<StationWithSession | null>(null);
  
  // Cancel confirmation dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  
  const vipStations = stations.filter(s => s.zone === 'vip');
  const hallStations = stations.filter(s => s.zone === 'hall');

  const getStationBooking = (stationId: string): BookingWithStation | undefined => {
    return bookings.find(b => b.station_id === stationId && b.status === 'booked');
  };

  const handleCreateBooking = async (stationId: string, startTime: string, comment?: string) => {
    const result = await createBooking(stationId, startTime, comment);
    if (result.success) {
      // Immediately refetch to ensure UI is updated
      await refetchBookings();
    }
    return result;
  };

  const handleRequestCancelBooking = (bookingId: string) => {
    setBookingToCancel(bookingId);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancelBooking = async () => {
    if (!bookingToCancel) return;
    
    setIsCanceling(true);
    try {
      const result = await cancelBooking(bookingToCancel);
      if (result.success) {
        // Immediately refetch both bookings and stations to ensure UI is updated
        await Promise.all([refetchBookings(), refetchStations()]);
      }
    } finally {
      setIsCanceling(false);
      setCancelDialogOpen(false);
      setBookingToCancel(null);
    }
  };

  const handleStartSession = async (stationId: string, bookingId: string) => {
    if (!shift?.id) {
      toast.error('Нет активной смены');
      return;
    }
    
    // Complete the booking first
    const bookingResult = await completeBooking(bookingId);
    if (!bookingResult.success) {
      toast.error(bookingResult.error || 'Ошибка завершения брони');
      return;
    }
    
    // Start hourly session (from booking, always hourly)
    const sessionResult = await startSession(stationId, 'hourly');
    if (sessionResult.error) {
      toast.error(sessionResult.error);
      return;
    }
    
    // Immediately refetch both bookings and stations to ensure UI is updated
    await Promise.all([refetchBookings(), refetchStations()]);
    
    toast.success('Сессия запущена');
  };

  const handleOpenBookingModal = (station: StationWithSession) => {
    setSelectedStation(station);
    setBookingModalOpen(true);
  };

  const renderStationCard = (station: StationWithSession) => {
    const booking = getStationBooking(station.id);
    
    // If station has active booking and no active session, show booked card
    if (booking && !station.activeSession) {
      return (
        <BookedStationCard
          key={station.id}
          station={station}
          booking={booking}
          onCancelBooking={handleRequestCancelBooking}
          onStartSession={handleStartSession}
        />
      );
    }
    
    // Extract primitive values for memoized StationCard
    const activeSession = station.activeSession;
    const activeControllers = station.controllers?.filter(c => !c.returned_at) || [];
    const totalDrinks = station.drinks?.reduce((sum, d) => sum + d.quantity, 0) || 0;
    
    // Pass only primitives to StationCard for optimal memoization
    return (
      <StationCard
        key={station.id}
        id={station.id}
        name={station.name}
        zone={station.zone as 'vip' | 'hall'}
        hourlyRate={station.hourly_rate}
        isActive={!!activeSession}
        startedAt={activeSession?.started_at}
        tariffType={activeSession?.tariff_type}
        packageCount={activeSession?.package_count}
        isOwnSession={station.isOwnSession !== false}
        activeControllersCount={activeControllers.length}
        totalDrinksCount={totalDrinks}
        onBook={() => handleOpenBookingModal(station)}
        hasBooking={!!booking}
      />
    );
  };

  return (
    <>
      <div className="space-y-6 sm:space-y-12">
        {/* VIP Zone */}
        <section>
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-vip/30 to-transparent" />
            <h2 className="text-[10px] sm:text-xs font-bold text-vip uppercase tracking-[0.2em] sm:tracking-[0.3em]">
              VIP Зона
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-vip/30 to-transparent" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-5">
            {vipStations.map(renderStationCard)}
          </div>
        </section>

        {/* Hall Zone */}
        <section>
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <h2 className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-[0.2em] sm:tracking-[0.3em]">
              Зал
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/30 to-transparent" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-5">
            {hallStations.map(renderStationCard)}
          </div>
        </section>
      </div>

      {/* Booking Modal */}
      {selectedStation && (
        <BookingModal
          open={bookingModalOpen}
          onClose={() => {
            setBookingModalOpen(false);
            setSelectedStation(null);
          }}
          stationId={selectedStation.id}
          stationName={selectedStation.name}
          stationZone={selectedStation.zone}
          onCreateBooking={handleCreateBooking}
        />
      )}

      {/* Cancel Booking Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Снять бронь?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите снять бронь? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCanceling}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancelBooking}
              disabled={isCanceling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCanceling ? 'Снимаем...' : 'Да, снять бронь'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
