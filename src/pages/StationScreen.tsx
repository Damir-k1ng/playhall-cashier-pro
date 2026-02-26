import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStations } from '@/hooks/useStations';
import { useDrinks } from '@/hooks/useDrinks';
import { useGlobalTimer, usePackageRemaining } from '@/contexts/GlobalTimerContext';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { StationSkeleton } from '@/components/skeletons/StationSkeleton';
import { formatDuration, formatDurationHMS, formatCurrency, getElapsedMinutes, formatTimeFromISO } from '@/lib/utils';
import { ArrowLeft, Play, Square, Gamepad2, Plus, Package, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CONTROLLER_RATE, CLUB_NAME, PACKAGE_WARNING_MINUTES } from '@/lib/constants';

export function StationScreen() {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const { stations, isLoading, startSession, addController, returnController, extendPackage, refetch: refetchStations } = useStations();
  const { drinks, addDrinkToSession, removeSessionDrink } = useDrinks();
  const { getElapsedSeconds } = useGlobalTimer();
  
  const [showDrinks, setShowDrinks] = useState(false);
  const [isAddingController, setIsAddingController] = useState(false);
  const [isExtendingPackage, setIsExtendingPackage] = useState(false);
  const [returningControllerId, setReturningControllerId] = useState<string | null>(null);
  const [addingDrinkId, setAddingDrinkId] = useState<string | null>(null);
  const [removingDrinkId, setRemovingDrinkId] = useState<string | null>(null);
  const [drinkToDelete, setDrinkToDelete] = useState<{ id: string; name: string } | null>(null);
  const warningPlayedRef = useRef(false);
  const endPlayedRef = useRef(false);
  const prevRemainingRef = useRef<number | null>(null);

  const station = stations.find(s => s.id === stationId);
  const isActive = !!station?.activeSession;
  const isPackage = station?.activeSession?.tariff_type === 'package';
  const packageCount = station?.activeSession?.package_count || 1;
  const activeControllers = station?.controllers?.filter(c => !c.returned_at) || [];
  const sessionDrinks = station?.drinks || [];
  const hasDrinks = sessionDrinks.length > 0;

  // Use global timer instead of local interval
  const elapsedSeconds = isActive ? getElapsedSeconds(station.activeSession!.started_at) : 0;
  const remaining = usePackageRemaining(station?.activeSession?.started_at, packageCount);

  // Controller times from global timer
  const controllerSeconds: Record<string, number> = {};
  activeControllers.forEach(c => {
    controllerSeconds[c.id] = getElapsedSeconds(c.taken_at);
  });

  // Handle warning/end sounds with effects (no interval needed)
  useEffect(() => {
    if (!station?.activeSession) {
      warningPlayedRef.current = false;
      endPlayedRef.current = false;
      prevRemainingRef.current = null;
      return;
    }

    if (!isPackage) return;

    // Play warning sound once at 5 minutes
    if (remaining <= PACKAGE_WARNING_MINUTES && remaining > 0 && !warningPlayedRef.current) {
      playWarningSound();
      warningPlayedRef.current = true;
      toast.warning('⚠ Осталось 5 минут до окончания пакета', {
        duration: 5000,
      });
    }
    
    // Play end sound when package expires
    if (remaining <= 0 && !endPlayedRef.current) {
      playPackageEndSound();
      endPlayedRef.current = true;
      toast.error('🚨 Пакет закончился! Открытое время начислено.', {
        duration: 8000,
      });
    }

    prevRemainingRef.current = remaining;
  }, [station?.activeSession, isPackage, remaining]);

  // Show skeleton loading while stations are being fetched
  if (isLoading) {
    return <StationSkeleton />;
  }

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
    if (!station.activeSession || isAddingController) return;
    
    setIsAddingController(true);
    try {
      const result = await addController(station.activeSession.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('🎮 Джойстик добавлен');
      }
    } finally {
      setIsAddingController(false);
    }
  };

  const handleReturnController = async (controllerId: string) => {
    if (returningControllerId) return;
    
    const controller = activeControllers.find(c => c.id === controllerId);
    if (!controller) return;
    
    setReturningControllerId(controllerId);
    try {
      const minutes = getElapsedMinutes(controller.taken_at);
      const cost = Math.ceil((minutes / 60) * CONTROLLER_RATE);
      
      const result = await returnController(controllerId, cost);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`🎮 Джойстик возвращён — ${formatCurrency(cost)}`);
      }
    } finally {
      setReturningControllerId(null);
    }
  };

  const handleAddDrink = async (drinkId: string, price: number) => {
    if (!station.activeSession || addingDrinkId) return;
    
    setAddingDrinkId(drinkId);
    try {
      const result = await addDrinkToSession(station.activeSession.id, drinkId, 1, price);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('🥤 Напиток добавлен');
        setShowDrinks(false);
      }
    } finally {
      setAddingDrinkId(null);
    }
  };

  const handleExtendPackage = async () => {
    if (!station.activeSession || !isPackage || isExtendingPackage) return;
    
    setIsExtendingPackage(true);
    try {
      const result = await extendPackage(station.activeSession.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        // Reset warning/end flags so they can trigger again for the new package
        warningPlayedRef.current = false;
        endPlayedRef.current = false;
        toast.success(`🎮 Пакет 2+1 добавлен! Всего пакетов: ${result.package_count}`);
      }
    } finally {
      setIsExtendingPackage(false);
    }
  };

  const confirmRemoveDrink = (sessionDrinkId: string, drinkName: string) => {
    setDrinkToDelete({ id: sessionDrinkId, name: drinkName });
  };

  const handleRemoveDrink = async () => {
    if (!drinkToDelete || removingDrinkId) return;
    
    setRemovingDrinkId(drinkToDelete.id);
    try {
      const result = await removeSessionDrink(drinkToDelete.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('🗑 Напиток удалён');
        await refetchStations();
      }
    } finally {
      setRemovingDrinkId(null);
      setDrinkToDelete(null);
    }
  };

  const handleEndSession = () => {
    if (!station.activeSession) return;
    navigate(`/precheck/${station.activeSession.id}`);
  };

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const totalPackageMinutes = 180 * packageCount;
  const isWarning = isPackage && remaining <= PACKAGE_WARNING_MINUTES && remaining > 0;
  const isOvertime = isPackage && remaining <= 0 && elapsedMinutes >= totalPackageMinutes;

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
    <div className="h-screen flex flex-col overflow-hidden bg-background animate-fade-in">
      {/* Background effects */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,hsl(185_100%_50%_/_0.03)_0%,transparent_50%)] pointer-events-none" />
      
      {/* Header - Fixed */}
      <header className="shrink-0 glass-card border-b border-primary/10 px-6 py-4 relative z-10">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground rounded-xl border border-transparent hover:border-primary/20 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          
          <span className="text-xs text-muted-foreground tracking-wider font-brand">{CLUB_NAME}</span>
          
          <span className={cn(
            'text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest',
            station.zone === 'vip' 
              ? 'bg-vip/15 text-vip border border-vip/30' 
              : 'bg-primary/15 text-primary border border-primary/30'
          )}>
            {station.zone === 'vip' ? 'VIP' : 'ЗАЛ'}
          </span>
        </div>
      </header>

      {/* Content - Scrollable */}
      <main className="flex-1 min-h-0 overflow-y-auto p-6 relative z-10">
        <div className="max-w-5xl mx-auto">
        {/* Station Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-foreground mb-2">{station.name}</h1>
          {isActive && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className={cn(
                'font-bold uppercase tracking-wider',
                isWarning && 'text-warning',
                isOvertime && 'text-destructive',
                !isWarning && !isOvertime && (isPackage ? 'text-success' : 'text-primary')
              )}>
                {isOvertime ? 'Переигрывает' : isWarning ? '⚠ Осталось 5 минут' : 'Активна'}
              </span>
              <span className="text-muted-foreground/30">•</span>
              <span>{isPackage ? `Пакет 2+1 × ${packageCount}` : 'Почасовая'}</span>
              <span className="text-muted-foreground/30">•</span>
              <span>с {formatTimeFromISO(station.activeSession!.started_at)}</span>
            </div>
          )}
        </div>

        {!isActive ? (
          /* Start Session */
          <div className="space-y-8">
            <p className="text-muted-foreground text-lg">Выберите тариф для начала сессии</p>
            
            <div className="grid grid-cols-2 gap-6 max-w-2xl">
              <Button
                size="lg"
                className={cn(
                  'h-40 flex-col gap-4 text-xl rounded-2xl',
                  'bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30',
                  'hover:border-primary hover:shadow-glow-md transition-all duration-300'
                )}
                variant="ghost"
                onClick={() => handleStartSession('hourly')}
              >
                <Play className="w-10 h-10 text-primary" />
                <span className="font-bold text-primary">Почасовая</span>
                <span className="text-base text-muted-foreground">{formatCurrency(station.hourly_rate)}/час</span>
              </Button>
              
              <Button
                size="lg"
                className={cn(
                  'h-40 flex-col gap-4 text-xl rounded-2xl',
                  'bg-gradient-to-br from-success/20 to-success/5 border-2 border-success/30',
                  'hover:border-success hover:shadow-glow-emerald transition-all duration-300'
                )}
                variant="ghost"
                onClick={() => handleStartSession('package')}
              >
                <Play className="w-10 h-10 text-success" />
                <span className="font-bold text-success">Пакет 2+1</span>
                <span className="text-base text-muted-foreground">{formatCurrency(station.package_rate)}</span>
              </Button>
            </div>
          </div>
        ) : (
          /* Active Session */
          <div className="space-y-8">
            {/* Timer - DOMINANT Element */}
            <div className={cn(
              'text-center py-16 rounded-3xl glass-card border-2',
              isWarning && 'border-warning/50 shadow-glow-gold',
              isOvertime && 'border-destructive/50 glow-destructive',
              !isWarning && !isOvertime && (isPackage ? 'border-success/30 shadow-glow-emerald' : 'border-primary/30 shadow-glow-md')
            )}>
              <div className={cn(
                'font-gaming font-bold tracking-tight',
                'text-7xl sm:text-8xl lg:text-9xl',
                getTimerColor()
              )}>
                {formatDurationHMS(elapsedSeconds)}
              </div>
              {isPackage && (
                <div className="flex flex-col items-center gap-4 mt-6">
                  <div className={cn(
                    'text-xl font-medium',
                    isWarning && 'text-warning',
                    isOvertime && 'text-destructive',
                    !isWarning && !isOvertime && 'text-muted-foreground'
                  )}>
                    {isOvertime 
                      ? 'Пакет закончился — открытое время'
                      : `Осталось: ${formatDuration(remaining)}`
                    }
                  </div>
                  
                  {/* Package counter and extend button */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success/10 border border-success/30">
                      <Package className="w-5 h-5 text-success" />
                      <span className="text-success font-bold text-lg">×{packageCount}</span>
                    </div>
                    
                    <Button
                      size="lg"
                      onClick={handleExtendPackage}
                      disabled={isExtendingPackage}
                      className={cn(
                        'gap-2 rounded-xl font-bold transition-all',
                        'bg-gradient-to-r from-success to-emerald-600 hover:opacity-90',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {isExtendingPackage ? (
                        '⏳ Добавляю...'
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          Пакет 2+1
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Controllers Section */}
            <section className="glass-card rounded-2xl border border-primary/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold flex items-center gap-3 text-muted-foreground uppercase tracking-widest">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Gamepad2 size={20} className="text-primary" />
                  </div>
                  Дополнительные джойстики
                </h2>
                <Button 
                  size="lg" 
                  onClick={handleAddController}
                  disabled={isAddingController}
                  className="gap-2 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary hover:shadow-glow-sm transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingController ? '⏳ Добавляю...' : '🎮 ВЗЯЛИ'}
                </Button>
              </div>
              
              {activeControllers.length === 0 ? (
                <p className="text-muted-foreground/60 py-4">Нет активных джойстиков</p>
              ) : (
                <div className="space-y-3">
                  {activeControllers.map((controller, index) => {
                    const seconds = controllerSeconds[controller.id] || 0;
                    const cost = getControllerCost(seconds);
                    return (
                      <div 
                        key={controller.id}
                        className="flex items-center justify-between p-5 bg-muted/30 rounded-xl border border-border/50"
                      >
                        <div className="flex items-center gap-6">
                          <span className="font-semibold text-lg">Джойстик #{index + 1}</span>
                          <span className="font-mono text-2xl text-primary text-glow-cyan">
                            {formatDurationHMS(seconds)}
                          </span>
                          <span className="text-muted-foreground text-lg">
                            {formatCurrency(cost)}
                          </span>
                        </div>
                        <Button 
                          size="lg"
                          onClick={() => handleReturnController(controller.id)}
                          disabled={returningControllerId === controller.id}
                          className="rounded-xl bg-success/10 border border-success/30 text-success hover:bg-success/20 hover:border-success font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {returningControllerId === controller.id ? '⏳ Возврат...' : '🎮 ВЕРНУЛИ'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Drinks Section */}
            <section className="glass-card rounded-2xl border border-success/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold flex items-center gap-3 text-muted-foreground uppercase tracking-widest">
                  <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-xl">
                    🥤
                  </div>
                  Напитки
                </h2>
                <Button 
                  size="lg" 
                  onClick={() => setShowDrinks(!showDrinks)} 
                  className="gap-2 rounded-xl bg-success/10 border border-success/30 text-success hover:bg-success/20 hover:border-success hover:shadow-glow-emerald transition-all font-bold"
                >
                  🥤 Напитки
                </Button>
              </div>
              
              {showDrinks && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 pb-6 border-b border-border/50">
                  {drinks.map(drink => (
                    <Button
                      key={drink.id}
                      variant="outline"
                      size="lg"
                      className="justify-between h-16 rounded-xl border-border/50 hover:border-success/50 hover:bg-success/5 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleAddDrink(drink.id, drink.price)}
                      disabled={addingDrinkId !== null}
                    >
                      <span className="font-medium">
                        {addingDrinkId === drink.id ? '⏳ Добавляю...' : drink.name}
                      </span>
                      <span className="text-success font-semibold">{formatCurrency(drink.price)}</span>
                    </Button>
                  ))}
                </div>
              )}
              
              {!hasDrinks ? (
                <p className="text-muted-foreground/60 py-4">Напитки не заказаны</p>
              ) : (
                <div className="space-y-2">
                  {sessionDrinks.map((drink) => (
                    <div 
                      key={drink.id}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-xl group"
                    >
                      <span className="font-medium">{drink.quantity}x {drink.drink?.name || 'напиток'}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-success font-semibold">{formatCurrency(drink.total_price)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => confirmRemoveDrink(drink.id, drink.drink?.name || 'напиток')}
                          disabled={removingDrinkId === drink.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Delete Drink Confirmation */}
            <AlertDialog open={!!drinkToDelete} onOpenChange={(open) => !open && setDrinkToDelete(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить напиток?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Вы уверены, что хотите удалить «{drinkToDelete?.name}» из сессии?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRemoveDrink}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Удалить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* End Session Button */}
            <Button 
              size="lg"
              className={cn(
                'w-full h-20 text-xl font-bold rounded-2xl',
                'bg-gradient-to-r from-destructive/80 to-destructive border-2 border-destructive',
                'hover:shadow-lg hover:scale-[1.01] transition-all duration-200 btn-press'
              )}
              onClick={handleEndSession}
            >
              <Square className="w-6 h-6 mr-3" />
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
