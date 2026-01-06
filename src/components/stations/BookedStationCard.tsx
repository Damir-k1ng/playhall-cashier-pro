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
        'relative rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-5 transition-all duration-300',
        'glass-card',
        'border-2 border-reserved/40',
        'min-h-[160px] sm:min-h-[180px] lg:min-h-[200px] flex flex-col'
      )}
    >
      {/* Zone indicator line at top */}
      <div className={cn(
        'absolute top-0 left-2 right-2 sm:left-3 sm:right-3 h-0.5 rounded-b-full',
        station.zone === 'vip' 
          ? 'bg-gradient-to-r from-transparent via-vip to-transparent shadow-[0_0_20px_hsl(42_100%_55%_/_0.5)]' 
          : 'bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_hsl(185_100%_50%_/_0.5)]'
      )} />

      {/* Top: Station Name + Zone Badge */}
      <div className="flex items-start justify-between mb-2 sm:mb-2.5">
        <h3 className="font-gaming font-bold text-base sm:text-lg lg:text-xl text-foreground tracking-wide">
          {station.name}
        </h3>
        <span className={cn(
          'text-[8px] sm:text-[9px] lg:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full uppercase tracking-widest',
          station.zone === 'vip' 
            ? 'bg-vip/20 text-vip border border-vip/40 shadow-[0_0_15px_hsl(42_100%_55%_/_0.3)]' 
            : 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_15px_hsl(185_100%_50%_/_0.3)]'
        )}>
          {station.zone === 'vip' ? 'VIP' : 'ЗАЛ'}
        </span>
      </div>

      {/* CENTER: Big neon glowing time */}
      <div className="flex-1 flex flex-col items-center justify-center py-2 sm:py-3">
        <div className={cn(
          'font-gaming text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wider',
          'text-reserved',
          'drop-shadow-[0_0_30px_hsl(210_100%_60%_/_0.6)]',
          'animate-pulse'
        )}>
          {bookingTime}
        </div>

        {/* Status label */}
        <div className={cn(
          'mt-2 sm:mt-2.5 inline-flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md',
          'bg-reserved/15 border border-reserved/30'
        )}>
          <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-reserved" />
          <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-reserved">
            Бронь
          </span>
        </div>

        {/* Client info */}
        {booking.comment && (
          <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground text-center max-w-full px-1">
            <span className="truncate block">{booking.comment}</span>
          </div>
        )}
      </div>

      {/* Bottom Buttons */}
      <div className="relative z-10 flex gap-2 mt-2 sm:mt-2.5 pt-2 sm:pt-2.5 border-t border-border/30">
        <Button 
          className="h-8 sm:h-9 lg:h-10 rounded-md bg-gradient-to-r from-success to-emerald-600 hover:opacity-90 font-bold text-sm sm:text-base flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onStartSession(station.id, booking.id);
          }}
        >
          <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
          Начать
        </Button>
        <Button 
          variant="outline"
          className="h-8 sm:h-9 lg:h-10 px-2.5 sm:px-3.5 rounded-md border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onCancelBooking(booking.id);
          }}
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Button>
      </div>
    </div>
  );
}
