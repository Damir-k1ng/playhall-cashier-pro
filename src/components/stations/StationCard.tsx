import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StationWithSession } from '@/types/database';
import { formatDurationHMS, formatCurrency, getElapsedSeconds, getPackageRemainingMinutes } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Gamepad2, Coffee, Play, Calendar, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StationCardProps {
  station: StationWithSession;
  onBook?: () => void;
  hasBooking?: boolean;
}

type StationStatus = 'FREE' | 'ACTIVE' | 'WARNING' | 'OVERTIME' | 'LOCKED';

export function StationCard({ station, onBook, hasBooking }: StationCardProps) {
  const navigate = useNavigate();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const isActive = !!station.activeSession;
  const isPackage = station.activeSession?.tariff_type === 'package';
  const activeControllers = station.controllers?.filter(c => !c.returned_at) || [];
  const totalDrinks = station.drinks?.reduce((sum, d) => sum + d.quantity, 0) || 0;
  // Check if current cashier owns this session
  const isOwnSession = station.isOwnSession !== false; // null or true means own session

  useEffect(() => {
    if (!station.activeSession) return;

    const updateTime = () => {
      setElapsedSeconds(getElapsedSeconds(station.activeSession!.started_at));
      if (isPackage) {
        setRemaining(getPackageRemainingMinutes(station.activeSession!.started_at));
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [station.activeSession, isPackage]);

  // Determine status
  const getStatus = (): StationStatus => {
    if (!isActive) return 'FREE';
    // If this is another cashier's session, show as LOCKED
    if (!isOwnSession) return 'LOCKED';
    if (isPackage && remaining <= 0) return 'OVERTIME';
    if (isPackage && remaining <= 5) return 'WARNING';
    return 'ACTIVE';
  };

  const status = getStatus();

  const getStatusConfig = () => {
    switch (status) {
      case 'FREE': 
        return { 
          label: 'СВОБОДНО', 
          color: 'text-success', 
          timerColor: 'text-success',
          glow: '',
          borderColor: 'border-success/30 hover:border-success/60',
          bgGlow: 'hover:glow-emerald',
          statusBg: 'bg-success/15'
        };
      case 'LOCKED':
        return { 
          label: 'ДРУГОЙ КАССИР', 
          color: 'text-muted-foreground', 
          timerColor: 'text-muted-foreground',
          glow: '',
          borderColor: 'border-muted/40',
          bgGlow: '',
          statusBg: 'bg-muted/15'
        };
      case 'ACTIVE': 
        return { 
          label: 'В ИГРЕ', 
          color: 'text-ingame', 
          timerColor: 'text-primary',
          glow: 'text-glow-cyan',
          borderColor: 'border-ingame/40 hover:border-ingame/60',
          bgGlow: 'glow-purple hover:glow-cyan',
          statusBg: 'bg-ingame/15'
        };
      case 'WARNING': 
        return { 
          label: 'ЗАВЕРШАЕТСЯ', 
          color: 'text-warning', 
          timerColor: 'text-warning',
          glow: 'text-glow-gold animate-glow-pulse',
          borderColor: 'border-warning/50 animate-warning-pulse',
          bgGlow: 'glow-gold',
          statusBg: 'bg-warning/15'
        };
      case 'OVERTIME': 
        return { 
          label: 'ПЕРЕИГРЫВАЕТ', 
          color: 'text-destructive', 
          timerColor: 'text-destructive',
          glow: 'animate-pulse',
          borderColor: 'border-destructive/50',
          bgGlow: 'glow-destructive',
          statusBg: 'bg-destructive/15'
        };
    }
  };

  const config = getStatusConfig();

  const handleClick = () => {
    // Don't navigate to station details if it's another cashier's session
    if (isActive && !isOwnSession) {
      return;
    }
    navigate(`/station/${station.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative rounded-xl sm:rounded-2xl p-3 sm:p-5 md:p-6 transition-all duration-300',
        'glass-card glass-card-hover',
        'border-2',
        config.borderColor,
        config.bgGlow,
        'min-h-[180px] sm:min-h-[220px] md:min-h-[240px] flex flex-col',
        // Make card non-clickable if it's another cashier's session
        isActive && !isOwnSession ? 'cursor-not-allowed opacity-70' : 'cursor-pointer card-lift'
      )}
    >
      {/* Zone indicator line at top */}
      <div className={cn(
        'absolute top-0 left-3 right-3 sm:left-4 sm:right-4 h-0.5 sm:h-1 rounded-b-full',
        station.zone === 'vip' 
          ? 'bg-gradient-to-r from-transparent via-vip to-transparent shadow-[0_0_20px_hsl(42_100%_55%_/_0.5)]' 
          : 'bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_hsl(185_100%_50%_/_0.5)]'
      )} />

      {/* Top: Station Name + Zone Badge */}
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <h3 className="font-gaming font-bold text-base sm:text-xl md:text-2xl text-foreground tracking-wide">
          {station.name}
        </h3>
        <span className={cn(
          'text-[8px] sm:text-[10px] font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded-full uppercase tracking-widest',
          station.zone === 'vip' 
            ? 'bg-vip/20 text-vip border border-vip/40 shadow-[0_0_15px_hsl(42_100%_55%_/_0.3)]' 
            : 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_15px_hsl(185_100%_50%_/_0.3)]'
        )}>
          {station.zone === 'vip' ? 'VIP' : 'ЗАЛ'}
        </span>
      </div>

      {/* Price */}
      {!isActive && (
        <div className="text-sm sm:text-base text-muted-foreground mb-2 sm:mb-3 font-medium">
          {formatCurrency(station.hourly_rate)}<span className="text-xs sm:text-sm opacity-70">/час</span>
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
              'font-gaming text-2xl sm:text-3xl md:text-4xl font-bold tracking-wide',
              config.timerColor,
              config.glow
            )}
            style={{
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.25
            }}
          >
            {formatDurationHMS(elapsedSeconds)}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground/60">
            <Play className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Нажмите для запуска</span>
          </div>
        )}
      </div>

      {/* Bottom: Badges for controllers and drinks */}
      {isActive && (activeControllers.length > 0 || totalDrinks > 0) && (
        <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-border/30">
          {activeControllers.length > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              </div>
              <span className="text-primary font-bold text-sm sm:text-lg">+{activeControllers.length}</span>
            </div>
          )}
          {totalDrinks > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-secondary/15 border border-secondary/25 flex items-center justify-center">
                <Coffee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary" />
              </div>
              <span className="text-secondary font-bold text-sm sm:text-lg">{totalDrinks}</span>
            </div>
          )}
        </div>
      )}

      {/* Primary Actions for FREE stations */}
      {!isActive && (
        <div 
          className="relative z-10 mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-border/30 flex gap-2"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}
        >
          <Button 
            className="h-9 sm:h-11 bg-gradient-to-r from-success to-emerald-600 hover:opacity-90 font-bold text-sm sm:text-base btn-press glow-emerald min-w-0 flex-1 rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/station/${station.id}`);
            }}
          >
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 shrink-0" />
            <span className="truncate">Начать</span>
          </Button>
          {onBook && !hasBooking && (
            <Button 
              variant="outline"
              className="h-9 sm:h-11 px-3 sm:px-4 border-reserved/40 text-reserved hover:bg-reserved/10 hover:border-reserved shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onBook();
              }}
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
