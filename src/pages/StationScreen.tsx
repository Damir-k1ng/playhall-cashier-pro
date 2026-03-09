import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useStations, useStation, stationQueryKey, STATIONS_QUERY_KEY } from '@/hooks/useStations';
import type { StationWithSession, ControllerUsage } from '@/types/database';
import { useDrinks } from '@/hooks/useDrinks';
import { useGlobalTimer, usePackageRemaining } from '@/contexts/GlobalTimerContext';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { StationSkeleton } from '@/components/skeletons/StationSkeleton';
import { formatDuration, formatDurationHMS, formatCurrency, getElapsedMinutes, formatTimeFromISO } from '@/lib/utils';
import { ArrowLeft, Play, Square, Gamepad2, Plus, Package, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CONTROLLER_RATE, CLUB_NAME } from '@/lib/constants';

export function StationScreen() {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const { station, isLoading: isStationLoading } = useStation(stationId);
  const queryClient = useQueryClient();
  const { startSession, addController, returnController, extendPackage, refetch: refetchStations } = useStations();
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

  const isLoading = isStationLoading;
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

  // Reset warning refs when session changes (alerts now handled by PackageAlerts on Dashboard)
  useEffect(() => {
    if (!station?.activeSession) {
      warningPlayedRef.current = false;
      endPlayedRef.current = false;
    }
  }, [station?.activeSession]);

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

  const invalidateStation = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: stationQueryKey(stationId!) }),
      queryClient.invalidateQueries({ queryKey: STATIONS_QUERY_KEY }),
    ]);
  };

  const handleAddDrink = async (drinkId: string, price: number, quantity: number = 1) => {
    if (!station.activeSession || addingDrinkId) return;
    
    setAddingDrinkId(drinkId);
    try {
      const result = await addDrinkToSession(station.activeSession.id, drinkId, quantity, price);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('🥤 Напиток добавлен');
        await invalidateStation();
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
        await invalidateStation();
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
  const isWarning = isPackage && remaining <= 5 && remaining > 0;
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
            <section className="glass-card rounded-2xl border border-primary/20 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
                <h2 className="text-xs sm:text-sm font-bold flex items-center gap-2 sm:gap-3 text-muted-foreground uppercase tracking-widest min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Gamepad2 size={16} className="text-primary sm:w-5 sm:h-5" />
                  </div>
                  <span className="truncate">Джойстики</span>
                </h2>
                <Button 
                  size="default" 
                  onClick={handleAddController}
                  disabled={isAddingController}
                  className="gap-1.5 sm:gap-2 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary hover:shadow-glow-sm transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm shrink-0 h-9 sm:h-11 px-3 sm:px-4"
                >
                  {isAddingController ? '⏳...' : '🎮 ВЗЯЛИ'}
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
                        className="flex items-center justify-between p-3 sm:p-5 bg-muted/30 rounded-xl border border-border/50 gap-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 min-w-0">
                          <span className="font-semibold text-sm sm:text-lg whitespace-nowrap">Джойстик #{index + 1}</span>
                          <div className="flex items-center gap-2 sm:gap-6">
                            <span className="font-mono text-lg sm:text-2xl text-primary text-glow-cyan">
                              {formatDurationHMS(seconds)}
                            </span>
                            <span className="text-muted-foreground text-sm sm:text-lg">
                              {formatCurrency(cost)}
                            </span>
                          </div>
                        </div>
                        <Button 
                          size="default"
                          onClick={() => handleReturnController(controller.id)}
                          disabled={returningControllerId === controller.id}
                          className="rounded-xl bg-success/10 border border-success/30 text-success hover:bg-success/20 hover:border-success font-bold disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm shrink-0 h-9 sm:h-11 px-3 sm:px-4"
                        >
                          {returningControllerId === controller.id ? '⏳...' : '🎮 ВЕРНУЛИ'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Drinks Section */}
            <section className="glass-card rounded-2xl border border-success/20 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
                <h2 className="text-xs sm:text-sm font-bold flex items-center gap-2 sm:gap-3 text-muted-foreground uppercase tracking-widest">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-base sm:text-xl shrink-0">
                    🥤
                  </div>
                  Напитки
                </h2>
                <Button 
                  size="default" 
                  onClick={() => setShowDrinks(!showDrinks)} 
                  className="gap-1.5 sm:gap-2 rounded-xl bg-success/10 border border-success/30 text-success hover:bg-success/20 hover:border-success hover:shadow-glow-emerald transition-all font-bold text-xs sm:text-sm shrink-0 h-9 sm:h-11 px-3 sm:px-4"
                >
                  🥤 Напитки
                </Button>
              </div>
              
              {showDrinks && (
                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-border/50">
                  {drinks.map(drink => (
                    <div
                      key={drink.id}
                      className="flex items-center justify-between h-14 sm:h-16 rounded-xl border border-border/50 hover:border-success/50 hover:bg-success/5 px-3 sm:px-4 transition-colors"
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <span className="font-medium text-sm truncate block">{drink.name}</span>
                        <span className="text-success font-semibold text-xs">{formatCurrency(drink.price)}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0 border-success/30 text-success hover:bg-success/20 hover:border-success"
                        onClick={() => handleAddDrink(drink.id, drink.price)}
                        disabled={addingDrinkId !== null}
                      >
                        {addingDrinkId === drink.id ? (
                          <span className="text-xs">⏳</span>
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
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
                      className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-xl group"
                    >
                      <span className="font-medium text-sm sm:text-base">{drink.quantity}x {drink.drink?.name || 'напиток'}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-success font-semibold">{formatCurrency(drink.total_price)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
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
                'w-full h-14 sm:h-20 text-base sm:text-xl font-bold rounded-2xl',
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

