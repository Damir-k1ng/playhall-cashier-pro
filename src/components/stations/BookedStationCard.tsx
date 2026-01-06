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
        'relative rounded-lg sm:rounded-xl lg:rounded-2xl p-2.5 sm:p-3 lg:p-4 transition-all duration-300',
        'glass-card',
        'border-2 border-reserved/40',
        'min-h-[140px] sm:min-h-[160px] lg:min-h-[180px] flex flex-col'
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
      <div className="flex items-start justify-between mb-1.5 sm:mb-2">
        <h3 className="font-gaming font-bold text-sm sm:text-base lg:text-lg text-foreground tracking-wide">
          {station.name}
        </h3>
        <span className={cn(
          'text-[7px] sm:text-[8px] lg:text-[9px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full uppercase tracking-widest',
          station.zone === 'vip' 
            ? 'bg-vip/20 text-vip border border-vip/40 shadow-[0_0_15px_hsl(42_100%_55%_/_0.3)]' 
            : 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_15px_hsl(185_100%_50%_/_0.3)]'
        )}>
          {station.zone === 'vip' ? 'VIP' : 'ЗАЛ'}
        </span>
      </div>

      {/* CENTER: Big neon glowing time */}
      <div className="flex-1 flex flex-col items-center justify-center py-1 sm:py-2">
        <div className={cn(
          'font-gaming text-xl sm:text-2xl lg:text-3xl font-bold tracking-wider',
          'text-reserved',
          'drop-shadow-[0_0_30px_hsl(210_100%_60%_/_0.6)]',
          'animate-pulse'
        )}>
          {bookingTime}
        </div>

        {/* Status label */}
        <div className={cn(
          'mt-1.5 sm:mt-2 inline-flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md',
          'bg-reserved/15 border border-reserved/30'
        )}>
          <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-reserved" />
          <span className="text-[8px] sm:text-[10px] lg:text-xs font-bold text-reserved">
            Бронь
          </span>
        </div>

        {/* Client info */}
        {booking.comment && (
          <div className="mt-1 sm:mt-1.5 text-[10px] sm:text-xs text-muted-foreground text-center max-w-full px-1">
            <span className="truncate block">{booking.comment}</span>
          </div>
        )}
      </div>

      {/* Bottom Buttons */}
      <div className="relative z-10 flex gap-1.5 mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-border/30">
        <Button 
          className="h-7 sm:h-8 lg:h-9 rounded-md bg-gradient-to-r from-success to-emerald-600 hover:opacity-90 font-bold text-xs sm:text-sm flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onStartSession(station.id, booking.id);
          }}
        >
          <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
          Начать
        </Button>
        <Button 
          variant="outline"
          className="h-7 sm:h-8 lg:h-9 px-2 sm:px-3 rounded-md border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onCancelBooking(booking.id);
          }}
        >
          <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </Button>
      </div>
    </div>
  );
}
