import React, { useState } from 'react';
import { StationCard } from './StationCard';
import { BookedStationCard } from './BookedStationCard';
import { BookingModal } from '@/components/modals/BookingModal';
import { StationWithSession } from '@/types/database';
import { useBookings, BookingWithStation } from '@/hooks/useBookings';
import { useStations } from '@/hooks/useStations';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  
  const vipStations = stations.filter(s => s.zone === 'vip');
  const hallStations = stations.filter(s => s.zone === 'hall');

  const getStationBooking = (stationId: string): BookingWithStation | undefined => {
    return bookings.find(b => b.station_id === stationId);
  };

  const handleCreateBooking = async (stationId: string, startTime: string, comment?: string) => {
    const result = await createBooking(stationId, startTime, comment);
    if (result.success) {
      // Immediately refetch to ensure UI is updated
      await refetchBookings();
    }
    return result;
  };

  const handleCancelBooking = async (bookingId: string) => {
    const result = await cancelBooking(bookingId);
    if (result.success) {
      // Immediately refetch to ensure UI is updated
      await refetchBookings();
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
          onCancelBooking={handleCancelBooking}
          onStartSession={handleStartSession}
        />
      );
    }
    
    // Otherwise show regular card with booking capability
    return (
      <StationCard
        key={station.id}
        station={station}
        onBook={() => handleOpenBookingModal(station)}
        hasBooking={!!booking}
      />
    );
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* VIP Zone */}
        <section>
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 lg:mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-vip/30 to-transparent" />
            <h2 className="text-[9px] sm:text-[10px] lg:text-xs font-bold text-vip uppercase tracking-[0.15em] sm:tracking-[0.2em]">
              VIP Зона
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-vip/30 to-transparent" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
            {vipStations.map(renderStationCard)}
          </div>
        </section>

        {/* Hall Zone */}
        <section>
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 lg:mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <h2 className="text-[9px] sm:text-[10px] lg:text-xs font-bold text-primary uppercase tracking-[0.15em] sm:tracking-[0.2em]">
              Зал
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/30 to-transparent" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
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
    </>
  );
}
