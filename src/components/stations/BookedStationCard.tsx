import React, { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Play, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Primitive props only - no objects!
interface BookedStationCardProps {
  stationId: string;
  stationName: string;
  zone: 'vip' | 'hall';
  bookingId: string;
  bookingStartTime: string;
  bookingComment?: string | null;
  onCancelBooking: (bookingId: string) => void;
  onStartSession: (stationId: string, bookingId: string) => void;
}

function BookedStationCardComponent({
  stationId,
  stationName,
  zone,
  bookingId,
  bookingStartTime,
  bookingComment,
  onCancelBooking,
  onStartSession
}: BookedStationCardProps) {
  // Memoized formatted time
  const bookingTime = useMemo(() => {
    return bookingStartTime.substring(0, 5);
  }, [bookingStartTime]);

  return (
    <div
      className={cn(
        'relative rounded-xl sm:rounded-2xl p-3 sm:p-5 md:p-6 transition-all duration-300',
        'glass-card',
        'border-2 border-reserved/40',
        'min-h-[200px] sm:min-h-[280px] md:min-h-[300px] flex flex-col'
      )}
    >
      {/* Zone indicator line at top */}
      <div className={cn(
        'absolute top-0 left-3 right-3 sm:left-4 sm:right-4 h-0.5 sm:h-1 rounded-b-full',
        zone === 'vip' 
          ? 'bg-gradient-to-r from-transparent via-vip to-transparent shadow-[0_0_20px_hsl(42_100%_55%_/_0.5)]' 
          : 'bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_hsl(185_100%_50%_/_0.5)]'
      )} />

      {/* Top: Station Name + Zone Badge */}
      <div className="flex items-start justify-between mb-2 sm:mb-4">
        <h3 className="font-gaming font-bold text-base sm:text-xl md:text-2xl text-foreground tracking-wide">
          {stationName}
        </h3>
        <span className={cn(
          'text-[8px] sm:text-[10px] font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded-full uppercase tracking-widest',
          zone === 'vip' 
            ? 'bg-vip/20 text-vip border border-vip/40 shadow-[0_0_15px_hsl(42_100%_55%_/_0.3)]' 
            : 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_15px_hsl(185_100%_50%_/_0.3)]'
        )}>
          {zone === 'vip' ? 'VIP' : 'ЗАЛ'}
        </span>
      </div>

      {/* CENTER: Big neon glowing time */}
      <div className="flex-1 flex flex-col items-center justify-center py-2 sm:py-4">
        <div className={cn(
          'font-gaming text-3xl sm:text-5xl md:text-6xl font-bold tracking-wider',
          'text-reserved',
          'drop-shadow-[0_0_30px_hsl(210_100%_60%_/_0.6)]',
          'animate-pulse'
        )}>
          {bookingTime}
        </div>

        {/* Status label */}
        <div className={cn(
          'mt-2 sm:mt-4 inline-flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-4 sm:py-2 rounded-lg',
          'bg-reserved/15 border border-reserved/30'
        )}>
          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-reserved" />
          <span className="text-[10px] sm:text-sm font-bold text-reserved">
            🔵 Бронь на {bookingTime}
          </span>
        </div>

        {/* Client info */}
        {bookingComment && (
          <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground text-center max-w-full px-2">
            <span className="truncate block">{bookingComment}</span>
          </div>
        )}
      </div>

      {/* Bottom Buttons */}
      <div className="relative z-10 flex flex-col gap-1.5 sm:gap-2 mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-border/30">
        <Button 
          className="w-full h-9 sm:h-11 rounded-lg bg-gradient-to-r from-success to-emerald-600 hover:opacity-90 font-bold text-sm sm:text-base"
          onClick={(e) => {
            e.stopPropagation();
            onStartSession(stationId, bookingId);
          }}
        >
          <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          Начать
        </Button>
        <Button 
          variant="outline"
          className="w-full h-8 sm:h-10 rounded-lg border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive font-medium text-xs sm:text-sm"
          onClick={(e) => {
            e.stopPropagation();
            onCancelBooking(bookingId);
          }}
        >
          <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          Снять бронь
        </Button>
      </div>
    </div>
  );
}

// Memoized component - only re-renders when primitive props change
export const BookedStationCard = memo(BookedStationCardComponent);
