import React, { useMemo, memo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { formatDurationHMS, formatCurrency, formatPackageTimeRange } from '@/lib/utils';
import { useGlobalTimer, usePackageRemaining } from '@/contexts/GlobalTimerContext';
import { cn } from '@/lib/utils';
import { Gamepad2, Coffee, Play, Calendar, Lock, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { stationQueryKey } from '@/hooks/useStations';

// Primitive props only - no objects!
interface StationCardProps {
  id: string;
  name: string;
  zone: 'vip' | 'hall';
  hourlyRate: number;
  // Session data (undefined if no active session)
  isActive: boolean;
  startedAt?: string;
  tariffType?: 'hourly' | 'package';
  packageCount?: number;
  isOwnSession?: boolean;
  // Computed counts
  activeControllersCount: number;
  totalDrinksCount: number;
  // Callbacks
  onBook?: () => void;
  hasBooking?: boolean;
}

type StationStatus = 'FREE' | 'ACTIVE' | 'WARNING' | 'OVERTIME' | 'LOCKED';

// Memoized status config to avoid recalculating on every render
const STATUS_CONFIGS = {
  FREE: { 
    label: 'СВОБОДНО', 
    color: 'text-success', 
    timerColor: 'text-success',
    glow: '',
    borderColor: 'border-success/30 hover:border-success/60',
    bgGlow: 'hover:glow-emerald',
    statusBg: 'bg-success/15'
  },
  LOCKED: { 
    label: 'ДРУГОЙ КАССИР', 
    color: 'text-muted-foreground', 
    timerColor: 'text-muted-foreground',
    glow: '',
    borderColor: 'border-muted/40',
    bgGlow: '',
    statusBg: 'bg-muted/15'
  },
  ACTIVE: { 
    label: 'В ИГРЕ', 
    color: 'text-ingame', 
    timerColor: 'text-primary',
    glow: 'text-glow-cyan',
    borderColor: 'border-ingame/40 hover:border-ingame/60',
    bgGlow: 'glow-purple hover:glow-cyan',
    statusBg: 'bg-ingame/15'
  },
  WARNING: { 
    label: 'ЗАВЕРШАЕТСЯ', 
    color: 'text-warning', 
    timerColor: 'text-warning',
    glow: 'text-glow-gold animate-glow-pulse',
    borderColor: 'border-warning/50 animate-warning-pulse',
    bgGlow: 'glow-gold',
    statusBg: 'bg-warning/15'
  },
  OVERTIME: { 
    label: 'ПЕРЕИГРЫВАЕТ', 
    color: 'text-destructive', 
    timerColor: 'text-destructive',
    glow: 'animate-pulse',
    borderColor: 'border-destructive/50',
    bgGlow: 'glow-destructive',
    statusBg: 'bg-destructive/15'
  }
} as const;

function StationCardComponent({
  id,
  name,
  zone,
  hourlyRate,
  isActive,
  startedAt,
  tariffType,
  packageCount = 1,
  isOwnSession = true,
  activeControllersCount,
  totalDrinksCount,
  onBook,
  hasBooking
}: StationCardProps) {
  const navigate = useNavigate();
  const { getElapsedSeconds } = useGlobalTimer();
  
  const isPackage = tariffType === 'package';

  // Memoized elapsed seconds - only recalculates when startedAt or global timer changes
  const elapsedSeconds = useMemo(() => {
    if (!isActive || !startedAt) return 0;
    return getElapsedSeconds(startedAt);
  }, [isActive, startedAt, getElapsedSeconds]);

  // Memoized remaining time for packages
  const remaining = usePackageRemaining(startedAt, packageCount);

  // Memoized status calculation
  const status = useMemo((): StationStatus => {
    if (!isActive) return 'FREE';
    if (isPackage && remaining <= 0) return 'OVERTIME';
    if (isPackage && remaining <= 5) return 'WARNING';
    return 'ACTIVE';
  }, [isActive, isPackage, remaining]);

  const config = STATUS_CONFIGS[status];

  // Memoized formatted time
  const formattedTime = useMemo(() => {
    return formatDurationHMS(elapsedSeconds);
  }, [elapsedSeconds]);

  // Memoized formatted price
  const formattedPrice = useMemo(() => {
    return formatCurrency(hourlyRate);
  }, [hourlyRate]);

  // Memoized package time range (e.g., "С 20:00 до 23:00")
  const packageTimeRange = useMemo(() => {
    if (!isPackage || !startedAt) return null;
    return formatPackageTimeRange(startedAt, packageCount);
  }, [isPackage, startedAt, packageCount]);

  // Prefetch on hover with 150ms debounce to avoid flooding
  const queryClient = useQueryClient();
  const hoverTimerRef = useRef<number | null>(null);

  const handleMouseEnter = useCallback(() => {
    hoverTimerRef.current = window.setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: stationQueryKey(id),
        queryFn: () => apiClient.getStation(id),
        staleTime: 5_000, // Don't refetch if fresh
      });
    }, 150);
  }, [id, queryClient]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const handleClick = () => {
    navigate(`/station/${id}`);
  };

  const handleStartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/station/${id}`);
  };

  const handleBookClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBook?.();
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative rounded-xl sm:rounded-2xl p-3 sm:p-5 md:p-6 transition-all duration-300',
        'glass-card glass-card-hover',
        'border-2',
        config.borderColor,
        config.bgGlow,
        'min-h-[180px] sm:min-h-[220px] md:min-h-[240px] flex flex-col',
        'min-h-[180px] sm:min-h-[220px] md:min-h-[240px] flex flex-col cursor-pointer card-lift'
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
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <h3 className="font-gaming font-bold text-base sm:text-xl md:text-2xl text-foreground tracking-wide">
          {name}
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

      {/* Price */}
      {!isActive && (
        <div className="text-sm sm:text-base text-muted-foreground mb-2 sm:mb-3 font-medium">
          {formattedPrice}<span className="text-xs sm:text-sm opacity-70">/час</span>
        </div>
      )}

      {/* Status Label */}
      <div className={cn(
        'inline-flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg w-fit mb-2 sm:mb-4',
        config.statusBg
      )}>
        {status === 'LOCKED' && <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />}
        <div className={cn('w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full', config.color.replace('text-', 'bg-'), status !== 'LOCKED' && 'animate-pulse')} />
        <span className={cn('text-[10px] sm:text-xs font-bold uppercase tracking-widest', config.color)}>
          {config.label}
        </span>
      </div>

      {/* Timer or Empty State */}
      <div className="flex-1 flex items-center">
        {isActive ? (
          <div 
            className={cn(
              'font-gaming text-xl sm:text-3xl md:text-4xl font-bold tracking-wide truncate',
              config.timerColor,
              config.glow
            )}
            style={{
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.25
            }}
          >
            {formattedTime}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground/60">
            <Play className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Нажмите для запуска</span>
          </div>
        )}
      </div>

      {/* Package time range (e.g., "С 20:00 до 23:00") */}
      {isActive && isPackage && packageTimeRange && (
        <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-2">
          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
          <span className="text-xs sm:text-sm text-muted-foreground font-medium">
            {packageTimeRange}
          </span>
        </div>
      )}

      {/* Bottom: Badges for controllers, drinks, and packages */}
      {isActive && (activeControllersCount > 0 || totalDrinksCount > 0 || (isPackage && packageCount > 1)) && (
        <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-border/30">
          {isPackage && packageCount > 1 && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-success/15 border border-success/25 flex items-center justify-center">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success" />
              </div>
              <span className="text-success font-bold text-sm sm:text-lg">×{packageCount}</span>
            </div>
          )}
          {activeControllersCount > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              </div>
              <span className="text-primary font-bold text-sm sm:text-lg">+{activeControllersCount}</span>
            </div>
          )}
          {totalDrinksCount > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-secondary/15 border border-secondary/25 flex items-center justify-center">
                <Coffee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary" />
              </div>
              <span className="text-secondary font-bold text-sm sm:text-lg">{totalDrinksCount}</span>
            </div>
          )}
        </div>
      )}

      {/* Primary Actions for FREE stations */}
      {!isActive && (
        <div 
          className="relative z-10 mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-border/30 flex gap-1.5 sm:gap-2"
        >
          <Button 
            className="h-9 sm:h-11 bg-gradient-to-r from-success to-secondary hover:opacity-90 font-bold text-xs sm:text-base btn-press min-w-0 flex-1 rounded-lg"
            onClick={handleStartClick}
          >
            <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
            Начать
          </Button>
          {onBook && !hasBooking && (
            <Button 
              variant="outline"
              className="h-9 sm:h-11 px-3 sm:px-4 border-reserved/40 text-reserved hover:bg-reserved/10 hover:border-reserved shrink-0"
              onClick={handleBookClick}
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Memoized component - only re-renders when primitive props change
export const StationCard = memo(StationCardComponent);
