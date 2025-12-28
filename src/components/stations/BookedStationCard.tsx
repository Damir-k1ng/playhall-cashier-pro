import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StationWithSession } from '@/types/database';
import { BookingWithStation } from '@/hooks/useBookings';
import { cn } from '@/lib/utils';
import { Play, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BookedStationCardProps {
  station: StationWithSession;
  booking: BookingWithStation;
  onCancelBooking: (bookingId: string) => void;
  onStartSession: (stationId: string, bookingId: string) => void;
}

export function BookedStationCard({ station, booking, onCancelBooking, onStartSession }: BookedStationCardProps) {
  const navigate = useNavigate();

  // Format time from HH:MM:SS to HH:MM
  const formatBookingTime = (time: string) => {
    return time.substring(0, 5);
  };

  const bookingTime = formatBookingTime(booking.start_time);

  return (
    <div
      className={cn(
        'relative rounded-2xl p-5 md:p-6 transition-all duration-300',
        'glass-card',
        'border-2 border-reserved/40',
        'min-h-[280px] md:min-h-[300px] flex flex-col'
      )}
    >
      {/* Zone indicator line at top */}
      <div className={cn(
        'absolute top-0 left-4 right-4 h-1 rounded-b-full',
        station.zone === 'vip' 
          ? 'bg-gradient-to-r from-transparent via-vip to-transparent shadow-[0_0_20px_hsl(42_100%_55%_/_0.5)]' 
          : 'bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_hsl(185_100%_50%_/_0.5)]'
      )} />

      {/* Top: Station Name + Zone Badge */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-gaming font-bold text-xl md:text-2xl text-foreground tracking-wide">
          {station.name}
        </h3>
        <span className={cn(
          'text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest',
          station.zone === 'vip' 
            ? 'bg-vip/20 text-vip border border-vip/40 shadow-[0_0_15px_hsl(42_100%_55%_/_0.3)]' 
            : 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_15px_hsl(185_100%_50%_/_0.3)]'
        )}>
          {station.zone === 'vip' ? 'VIP' : 'ЗАЛ'}
        </span>
      </div>

      {/* CENTER: Big neon glowing time */}
      <div className="flex-1 flex flex-col items-center justify-center py-4">
        <div className={cn(
          'font-gaming text-5xl md:text-6xl font-bold tracking-wider',
          'text-reserved',
          'drop-shadow-[0_0_30px_hsl(210_100%_60%_/_0.6)]',
          'animate-pulse'
        )}>
          {bookingTime}
        </div>

        {/* Status label */}
        <div className={cn(
          'mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg',
          'bg-reserved/15 border border-reserved/30'
        )}>
          <Calendar className="w-4 h-4 text-reserved" />
          <span className="text-sm font-bold text-reserved">
            🔵 Забронировано на {bookingTime}
          </span>
        </div>

        {/* Client info */}
        {booking.comment && (
          <div className="mt-3 text-sm text-muted-foreground text-center max-w-full px-2">
            <span className="truncate block">{booking.comment}</span>
          </div>
        )}
      </div>

      {/* Bottom Buttons */}
      <div className="flex gap-3 mt-4 pt-4 border-t border-border/30">
        <Button 
          variant="outline"
          className="flex-1 h-12 rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive font-bold"
          onClick={(e) => {
            e.stopPropagation();
            onCancelBooking(booking.id);
          }}
        >
          <X className="w-4 h-4 mr-2" />
          Снять бронь
        </Button>
        <Button 
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-success to-emerald-600 hover:opacity-90 font-bold glow-emerald"
          onClick={(e) => {
            e.stopPropagation();
            onStartSession(station.id, booking.id);
          }}
        >
          <Play className="w-4 h-4 mr-2" />
          Начать
        </Button>
      </div>
    </div>
  );
}
