import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStations } from '@/hooks/useStations';
import { useDrinks } from '@/hooks/useDrinks';
import { Button } from '@/components/ui/button';
import { formatDuration, formatDurationHMS, formatCurrency, getElapsedMinutes, getElapsedSeconds, getPackageRemainingMinutes } from '@/lib/utils';
import { ArrowLeft, Play, Square } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CONTROLLER_RATE, CLUB_NAME, PACKAGE_WARNING_MINUTES } from '@/lib/constants';
import { Gamepad2 } from 'lucide-react';

export function StationScreen() {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const { stations, startSession, addController, returnController, refetch: refetchStations } = useStations();
  const { drinks, addDrinkToSession } = useDrinks();
  
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [controllerSeconds, setControllerSeconds] = useState<Record<string, number>>({});
  const [showDrinks, setShowDrinks] = useState(false);
  const warningPlayedRef = useRef(false);
  const endPlayedRef = useRef(false);

  const station = stations.find(s => s.id === stationId);
  const isActive = !!station?.activeSession;
  const isPackage = station?.activeSession?.tariff_type === 'package';
  const activeControllers = station?.controllers?.filter(c => !c.returned_at) || [];
  const sessionDrinks = station?.drinks || [];
  const hasDrinks = sessionDrinks.length > 0;

  useEffect(() => {
    if (!station?.activeSession) {
      warningPlayedRef.current = false;
      endPlayedRef.current = false;
      return;
    }

    const updateTime = () => {
      setElapsedSeconds(getElapsedSeconds(station.activeSession!.started_at));
      if (isPackage) {
        const rem = getPackageRemainingMinutes(station.activeSession!.started_at);
        setRemaining(rem);
        
        // Play warning sound once at 5 minutes
        if (rem <= PACKAGE_WARNING_MINUTES && rem > 0 && !warningPlayedRef.current) {
          playWarningSound();
          warningPlayedRef.current = true;
          toast.warning('⚠ Осталось 5 минут до окончания пакета', {
            duration: 5000,
          });
        }
        
        // Play end sound when package expires
        if (rem <= 0 && !endPlayedRef.current) {
          playPackageEndSound();
          endPlayedRef.current = true;
          toast.error('🚨 Пакет закончился! Открытое время начислено.', {
            duration: 8000,
          });
        }
      }
      
      const times: Record<string, number> = {};
      activeControllers.forEach(c => {
        times[c.id] = getElapsedSeconds(c.taken_at);
      });
      setControllerSeconds(times);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [station?.activeSession, isPackage, activeControllers.length]);

  if (!station) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Станция не найдена</p>
      </div>
    );
  }

  const handleStartSession = async (tariffType: 'hourly' | 'package') => {
    const result = await startSession(station.id, tariffType);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    // Immediately refetch stations after confirmed backend success
    await refetchStations();
    toast.success('Сессия запущена');
  };

  const handleAddController = async () => {
    if (!station.activeSession) return;
    const result = await addController(station.activeSession.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('🎮 Джойстик добавлен');
    }
  };

  const handleReturnController = async (controllerId: string) => {
    const controller = activeControllers.find(c => c.id === controllerId);
    if (!controller) return;
    
    const minutes = getElapsedMinutes(controller.taken_at);
    const cost = Math.ceil((minutes / 60) * CONTROLLER_RATE);
    
    const result = await returnController(controllerId, cost);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`🎮 Джойстик возвращён — ${formatCurrency(cost)}`);
    }
  };

  const handleAddDrink = async (drinkId: string, price: number) => {
    if (!station.activeSession) return;
    await addDrinkToSession(station.activeSession.id, drinkId, 1, price);
    toast.success('🥤 Напиток добавлен');
    setShowDrinks(false);
  };

  const handleEndSession = () => {
    if (!station.activeSession) return;
    navigate(`/precheck/${station.activeSession.id}`);
  };

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const isWarning = isPackage && remaining <= PACKAGE_WARNING_MINUTES && remaining > 0;
  const isOvertime = isPackage && remaining <= 0 && elapsedMinutes >= 180;

  const getControllerCost = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return Math.ceil((minutes / 60) * CONTROLLER_RATE);
  };

  const getTimerColor = () => {
    if (isWarning) return 'text-warning text-glow-gold animate-pulse-glow';
    if (isOvertime) return 'text-destructive animate-pulse';
    if (isPackage) return 'text-success text-glow-emerald';
    return 'text-primary text-glow-cyan';
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,hsl(185_100%_50%_/_0.03)_0%,transparent_50%)] pointer-events-none" />
      
      {/* Header - Fixed */}
      <header className="shrink-0 glass-card border-b border-primary/10 px-3 sm:px-6 py-3 sm:py-4 relative z-10">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground rounded-xl border border-transparent hover:border-primary/20 -ml-1 sm:-ml-2 h-8 sm:h-9 px-2 sm:px-3"
          >
            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Назад</span>
          </Button>
          
          <span className="text-[10px] sm:text-xs text-muted-foreground tracking-wider font-brand">{CLUB_NAME}</span>
          
          <span className={cn(
            'text-[10px] font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full uppercase tracking-widest',
            station.zone === 'vip' 
              ? 'bg-vip/15 text-vip border border-vip/30' 
              : 'bg-primary/15 text-primary border border-primary/30'
          )}>
            {station.zone === 'vip' ? 'VIP' : 'ЗАЛ'}
          </span>
        </div>
      </header>

      {/* Content - Scrollable */}
      <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 relative z-10">
        <div className="max-w-5xl mx-auto">
        {/* Station Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-1 sm:mb-2">{station.name}</h1>
          {isActive && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <span className={cn(
                'font-bold uppercase tracking-wider',
                isWarning && 'text-warning',
                isOvertime && 'text-destructive',
                !isWarning && !isOvertime && (isPackage ? 'text-success' : 'text-primary')
              )}>
                {isOvertime ? 'Переигрывает' : isWarning ? '⚠ 5 мин' : 'Активна'}
              </span>
              <span className="text-muted-foreground/30 hidden sm:inline">•</span>
              <span className="hidden sm:inline">{isPackage ? 'Пакет 2+1' : 'Почасовая'}</span>
              <span className="text-muted-foreground/30">•</span>
              <span>с {new Date(station.activeSession!.started_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>

        {!isActive ? (
          /* Start Session */
          <div className="space-y-4 sm:space-y-8">
            <p className="text-muted-foreground text-base sm:text-lg">Выберите тариф для начала сессии</p>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-2xl">
              <Button
                size="lg"
                className={cn(
                  'h-28 sm:h-40 flex-col gap-2 sm:gap-4 text-base sm:text-xl rounded-xl sm:rounded-2xl',
                  'bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30',
                  'hover:border-primary hover:shadow-glow-md transition-all duration-300'
                )}
                variant="ghost"
                onClick={() => handleStartSession('hourly')}
              >
                <Play className="w-6 h-6 sm:w-10 sm:h-10 text-primary" />
                <span className="font-bold text-primary text-sm sm:text-base">Почасовая</span>
                <span className="text-xs sm:text-base text-muted-foreground">{formatCurrency(station.hourly_rate)}/час</span>
              </Button>
              
              <Button
                size="lg"
                className={cn(
                  'h-28 sm:h-40 flex-col gap-2 sm:gap-4 text-base sm:text-xl rounded-xl sm:rounded-2xl',
                  'bg-gradient-to-br from-success/20 to-success/5 border-2 border-success/30',
                  'hover:border-success hover:shadow-glow-emerald transition-all duration-300'
                )}
                variant="ghost"
                onClick={() => handleStartSession('package')}
              >
                <Play className="w-6 h-6 sm:w-10 sm:h-10 text-success" />
                <span className="font-bold text-success text-sm sm:text-base">Пакет 2+1</span>
                <span className="text-xs sm:text-base text-muted-foreground">{formatCurrency(station.package_rate)}</span>
              </Button>
            </div>
          </div>
        ) : (
          /* Active Session */
          <div className="space-y-4 sm:space-y-8">
            {/* Timer - DOMINANT Element */}
            <div className={cn(
              'text-center py-6 sm:py-12 lg:py-16 rounded-xl sm:rounded-3xl glass-card border-2',
              isWarning && 'border-warning/50 shadow-glow-gold',
              isOvertime && 'border-destructive/50 glow-destructive',
              !isWarning && !isOvertime && (isPackage ? 'border-success/30 shadow-glow-emerald' : 'border-primary/30 shadow-glow-md')
            )}>
              <div className={cn(
                'font-gaming font-bold tracking-tight',
                'text-4xl sm:text-6xl lg:text-8xl',
                getTimerColor()
              )}>
                {formatDurationHMS(elapsedSeconds)}
              </div>
              {isPackage && (
                <div className={cn(
                  'text-sm sm:text-lg lg:text-xl mt-3 sm:mt-6 font-medium',
                  isWarning && 'text-warning',
                  isOvertime && 'text-destructive',
                  !isWarning && !isOvertime && 'text-muted-foreground'
                )}>
                  {isOvertime 
                    ? 'Пакет закончился — открытое время'
                    : `Осталось: ${formatDuration(remaining)}`
                  }
                </div>
              )}
            </div>

            {/* Controllers Section */}
            <section className="glass-card rounded-xl sm:rounded-2xl border border-primary/20 p-3 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-6 gap-2">
                <h2 className="text-xs sm:text-sm font-bold flex items-center gap-2 sm:gap-3 text-muted-foreground uppercase tracking-widest">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Gamepad2 size={16} className="sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <span className="hidden sm:inline">Дополнительные джойстики</span>
                  <span className="sm:hidden">Джойстики</span>
                </h2>
                <Button 
                  size="sm"
                  onClick={handleAddController} 
                  className="gap-1 sm:gap-2 rounded-lg sm:rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary hover:shadow-glow-sm transition-all font-bold text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4"
                >
                  <span className="hidden sm:inline">🎮</span> ВЗЯЛИ
                </Button>
              </div>
              
              {activeControllers.length === 0 ? (
                <p className="text-muted-foreground/60 py-3 sm:py-4 text-sm">Нет активных джойстиков</p>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {activeControllers.map((controller, index) => {
                    const seconds = controllerSeconds[controller.id] || 0;
                    const cost = getControllerCost(seconds);
                    return (
                      <div 
                        key={controller.id}
                        className="flex items-center justify-between p-2 sm:p-5 bg-muted/30 rounded-lg sm:rounded-xl border border-border/50"
                      >
                        <div className="flex items-center gap-2 sm:gap-6 flex-1 min-w-0">
                          <span className="font-semibold text-sm sm:text-lg whitespace-nowrap">#{index + 1}</span>
                          <span className="font-mono text-lg sm:text-2xl text-primary text-glow-cyan">
                            {formatDurationHMS(seconds)}
                          </span>
                          <span className="text-muted-foreground text-sm sm:text-lg hidden xs:inline">
                            {formatCurrency(cost)}
                          </span>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => handleReturnController(controller.id)}
                          className="rounded-lg sm:rounded-xl bg-success/10 border border-success/30 text-success hover:bg-success/20 hover:border-success font-bold text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4 shrink-0"
                        >
                          <span className="hidden sm:inline">🎮</span> ВЕРНУЛИ
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Drinks Section */}
            <section className="glass-card rounded-xl sm:rounded-2xl border border-success/20 p-3 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-6 gap-2">
                <h2 className="text-xs sm:text-sm font-bold flex items-center gap-2 sm:gap-3 text-muted-foreground uppercase tracking-widest">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-base sm:text-xl">
                    🥤
                  </div>
                  Напитки
                </h2>
                <Button 
                  size="sm"
                  onClick={() => setShowDrinks(!showDrinks)} 
                  className="gap-1 sm:gap-2 rounded-lg sm:rounded-xl bg-success/10 border border-success/30 text-success hover:bg-success/20 hover:border-success hover:shadow-glow-emerald transition-all font-bold text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4"
                >
                  🥤 <span className="hidden sm:inline">Напитки</span>
                </Button>
              </div>
              
              {showDrinks && (
                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-border/50">
                  {drinks.map(drink => (
                    <Button
                      key={drink.id}
                      variant="outline"
                      size="sm"
                      className="justify-between h-10 sm:h-16 rounded-lg sm:rounded-xl border-border/50 hover:border-success/50 hover:bg-success/5 text-xs sm:text-base px-2 sm:px-4"
                      onClick={() => handleAddDrink(drink.id, drink.price)}
                    >
                      <span className="font-medium truncate">{drink.name}</span>
                      <span className="text-success font-semibold shrink-0 ml-1">{formatCurrency(drink.price)}</span>
                    </Button>
                  ))}
                </div>
              )}
              
              {!hasDrinks ? (
                <p className="text-muted-foreground/60 py-3 sm:py-4 text-sm">Напитки не заказаны</p>
              ) : (
                <div className="space-y-2">
                  {sessionDrinks.map((drink, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 sm:p-4 bg-muted/30 rounded-lg sm:rounded-xl"
                    >
                      <span className="font-medium text-sm sm:text-base">{drink.quantity}x {drink.drink?.name || 'напиток'}</span>
                      <span className="text-success font-semibold text-sm sm:text-base">{formatCurrency(drink.total_price)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* End Session Button */}
            <Button 
              size="lg"
              className={cn(
                'w-full h-14 sm:h-20 text-base sm:text-xl font-bold rounded-xl sm:rounded-2xl',
                'bg-gradient-to-r from-destructive/80 to-destructive border-2 border-destructive',
                'hover:shadow-lg hover:scale-[1.01] transition-all duration-200 btn-press'
              )}
              onClick={handleEndSession}
            >
              <Square className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
              Завершить сессию
            </Button>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}

function playWarningSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 440; // A4
    gainNode.gain.value = 0.15;
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (err) {
    // Audio not supported
  }
}

function playPackageEndSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.25;
    
    // Play 3 ascending beeps
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
    frequencies.forEach((freq, i) => {
      const osc = audioContext.createOscillator();
      osc.connect(gainNode);
      osc.frequency.value = freq;
      osc.start(audioContext.currentTime + i * 0.2);
      osc.stop(audioContext.currentTime + i * 0.2 + 0.15);
    });
    
    // Final longer warning tone
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      osc2.connect(gainNode);
      osc2.frequency.value = 880; // A5
      osc2.start();
      osc2.stop(audioContext.currentTime + 0.4);
    }, 700);
  } catch (err) {
    // Audio not supported
  }
}
