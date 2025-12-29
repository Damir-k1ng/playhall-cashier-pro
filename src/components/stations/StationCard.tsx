import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StationWithSession } from '@/types/database';
import { formatDurationHMS, formatCurrency, getElapsedSeconds, getPackageRemainingMinutes } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Gamepad2, Coffee, Play, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StationCardProps {
  station: StationWithSession;
  onBook?: () => void;
  hasBooking?: boolean;
}

type StationStatus = 'FREE' | 'ACTIVE' | 'WARNING' | 'OVERTIME';

export function StationCard({ station, onBook, hasBooking }: StationCardProps) {
  const navigate = useNavigate();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const isActive = !!station.activeSession;
  const isPackage = station.activeSession?.tariff_type === 'package';
  const activeControllers = station.controllers?.filter(c => !c.returned_at) || [];
  const totalDrinks = station.drinks?.reduce((sum, d) => sum + d.quantity, 0) || 0;

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
          borderColor: 'border-warning/50',
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
    navigate(`/station/${station.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative rounded-2xl p-5 md:p-6 transition-all duration-300 cursor-pointer card-lift',
        'glass-card glass-card-hover',
        'border-2',
        config.borderColor,
        config.bgGlow,
        'min-h-[220px] md:min-h-[240px] flex flex-col'
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
      <div className="flex items-start justify-between mb-3">
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

      {/* Price */}
      {!isActive && (
        <div className="text-base text-muted-foreground mb-3 font-medium">
          {formatCurrency(station.hourly_rate)}<span className="text-sm opacity-70">/час</span>
        </div>
      )}

      {/* Status Label */}
      <div className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg w-fit mb-4',
        config.statusBg
      )}>
        <div className={cn('w-2 h-2 rounded-full', config.color.replace('text-', 'bg-'), 'animate-pulse')} />
        <span className={cn('text-xs font-bold uppercase tracking-widest', config.color)}>
          {config.label}
        </span>
      </div>

      {/* Timer or Empty State */}
      <div className="flex-1 flex items-center">
        {isActive ? (
          <div 
            className={cn(
              'font-gaming text-4xl md:text-5xl font-bold tracking-wider',
              config.timerColor,
              config.glow
            )}
            style={{
              fontVariantNumeric: 'tabular-nums',
              width: '8ch',
              textAlign: 'center',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}
          >
            {formatDurationHMS(elapsedSeconds)}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground/60">
            <Play className="w-4 h-4" />
            <span className="text-sm">Нажмите для запуска</span>
          </div>
        )}
      </div>

      {/* Bottom: Badges for controllers and drinks */}
      {isActive && (activeControllers.length > 0 || totalDrinks > 0) && (
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/30">
          {activeControllers.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                <Gamepad2 className="w-4 h-4 text-primary" />
              </div>
              <span className="text-primary font-bold text-lg">+{activeControllers.length}</span>
            </div>
          )}
          {totalDrinks > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-secondary/15 border border-secondary/25 flex items-center justify-center">
                <Coffee className="w-4 h-4 text-secondary" />
              </div>
              <span className="text-secondary font-bold text-lg">{totalDrinks}</span>
            </div>
          )}
        </div>
      )}

      {/* Primary Actions for FREE stations */}
      {!isActive && (
        <div className="mt-4 pt-4 border-t border-border/30 flex gap-2">
          <Button 
            className="flex-1 h-11 bg-gradient-to-r from-success to-emerald-600 hover:opacity-90 font-bold text-base btn-press glow-emerald"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/station/${station.id}`);
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            Начать
          </Button>
          {onBook && !hasBooking && (
            <Button 
              variant="outline"
              className="h-11 px-4 border-reserved/40 text-reserved hover:bg-reserved/10 hover:border-reserved"
              onClick={(e) => {
                e.stopPropagation();
                onBook();
              }}
            >
              <Calendar className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
