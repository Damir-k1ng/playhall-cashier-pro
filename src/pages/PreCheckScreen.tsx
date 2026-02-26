import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStations } from '@/hooks/useStations';
import { useGlobalTimer } from '@/contexts/GlobalTimerContext';
import { Button } from '@/components/ui/button';
import { PreCheckSkeleton } from '@/components/skeletons/PreCheckSkeleton';
import { formatDuration, formatDurationHMS, formatCurrency, calculateGameCost, formatTimeFromISO, formatTime } from '@/lib/utils';
import { ArrowLeft, Clock, Gamepad2, Coffee, CreditCard, Percent } from 'lucide-react';
import { CONTROLLER_RATE, CLUB_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';

interface ControllerDetail {
  id: string;
  minutes: number;
  cost: number;
}

interface DiscountPreset {
  id: string;
  percent: number;
}

export function PreCheckScreen() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { stations, isLoading } = useStations();
  const { getElapsedSeconds, getElapsedMinutes } = useGlobalTimer();

  const [discountPresets, setDiscountPresets] = useState<DiscountPreset[]>([]);
  const [maxDiscountPercent, setMaxDiscountPercent] = useState(0);
  const [selectedDiscount, setSelectedDiscount] = useState(0);

  const station = stations.find(s => s.activeSession?.id === sessionId);
  const session = station?.activeSession;
  const packageCount = session?.package_count || 1;

  // Fetch discount presets
  useEffect(() => {
    apiClient.getDiscountPresets()
      .then((data) => {
        setDiscountPresets(data.presets || []);
        setMaxDiscountPercent(data.max_discount_percent || 0);
      })
      .catch(() => {});
  }, []);

  // Calculate all values using global timer
  const elapsedSeconds = session ? getElapsedSeconds(session.started_at) : 0;
  const elapsedMins = Math.floor(elapsedSeconds / 60);

  const gameCost = station && session ? calculateGameCost(
    station.hourly_rate,
    station.package_rate,
    session.tariff_type,
    elapsedMins,
    packageCount
  ) : 0;

  const controllerDetails: ControllerDetail[] = (station?.controllers || []).map(c => {
    let minutes: number;
    if (c.returned_at) {
      minutes = Math.ceil((new Date(c.returned_at).getTime() - new Date(c.taken_at).getTime()) / 60000);
    } else {
      minutes = getElapsedMinutes(c.taken_at);
    }
    const cost = c.cost ?? Math.ceil((minutes / 60) * CONTROLLER_RATE);
    return { id: c.id, minutes, cost };
  });

  const totalControllerCost = controllerDetails.reduce((sum, c) => sum + c.cost, 0);
  const drinkCost = (station?.drinks || []).reduce((sum, d) => sum + d.total_price, 0);

  // Discount applies to game + controllers only (not drinks)
  const discountableAmount = gameCost + totalControllerCost;
  const discountAmount = Math.round(discountableAmount * selectedDiscount / 100);
  const totalBeforeDiscount = gameCost + totalControllerCost + drinkCost;
  const totalCost = totalBeforeDiscount - discountAmount;

  if (isLoading) {
    return <PreCheckSkeleton />;
  }

  if (!station || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Сессия не найдена</p>
      </div>
    );
  }

  const startTime = formatTimeFromISO(session.started_at);
  const endTime = formatTime(new Date());

  const handleProceedToPayment = () => {
    navigate(`/payment/${sessionId}`, {
      state: {
        stationId: station.id,
        stationName: station.name,
        gameCost,
        controllerCost: totalControllerCost,
        drinkCost,
        totalCost,
        discountPercent: selectedDiscount,
        discountAmount,
      }
    });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background animate-fade-in">
      {/* Header - Fixed */}
      <header className="shrink-0 glass-card border-b border-primary/10 px-6 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/station/${station.id}`)}
            className="text-muted-foreground hover:text-foreground rounded-xl border border-transparent hover:border-primary/20 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <span className="text-xs text-muted-foreground tracking-wider">{CLUB_NAME}</span>
          <div className="w-16" />
        </div>
      </header>

      {/* Content - Scrollable */}
      <main className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
        {/* Receipt Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <CreditCard className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Пре-чек</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground">{station.name}</h1>
        </div>

        {/* Time Info */}
        <div className="glass-card rounded-2xl border border-primary/20 p-6 mb-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Старт</div>
              <div className="text-2xl font-mono font-bold text-foreground">{startTime}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Конец</div>
              <div className="text-2xl font-mono font-bold text-foreground">{endTime}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Время</div>
              <div className="text-2xl font-mono font-bold text-primary text-glow-cyan">{formatDurationHMS(elapsedSeconds)}</div>
            </div>
          </div>
          <div className="text-center mt-4 pt-4 border-t border-border/50">
            <span className="text-sm text-muted-foreground">
              Тариф: <span className="text-foreground font-medium">
                {session.tariff_type === 'package' 
                  ? `Пакет 2+1 × ${packageCount}` 
                  : 'Почасовая'}
              </span>
            </span>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-4 mb-8">
          {/* Game */}
          <div className="glass-card rounded-xl border border-border/50 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-lg">Игра</div>
                  <div className="text-sm text-muted-foreground">
                    {session.tariff_type === 'package' 
                      ? `Пакет 2+1 × ${packageCount}` 
                      : `${formatDuration(Math.floor(elapsedSeconds / 60))}`}
                  </div>
                </div>
              </div>
              <div className="text-2xl font-bold text-primary">{formatCurrency(gameCost)}</div>
            </div>
          </div>

          {/* Controllers */}
          {controllerDetails.length > 0 && (
            <div className="glass-card rounded-xl border border-border/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Gamepad2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="font-semibold text-lg">Джойстики</div>
                </div>
                <div className="text-2xl font-bold text-primary">{formatCurrency(totalControllerCost)}</div>
              </div>
              <div className="space-y-2 pl-16">
                {controllerDetails.map((c, index) => (
                  <div key={c.id} className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>#{index + 1} — {formatDuration(c.minutes)}</span>
                    <span>{formatCurrency(c.cost)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drinks */}
          {drinkCost > 0 && (
            <div className="glass-card rounded-xl border border-border/50 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center">
                    <Coffee className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">Напитки</div>
                    <div className="text-sm text-muted-foreground">
                      {(station.drinks || []).reduce((sum, d) => sum + d.quantity, 0)} шт
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-success">{formatCurrency(drinkCost)}</div>
              </div>
            </div>
          )}

          {/* Discount Section */}
          {discountPresets.length > 0 && (
            <div className="glass-card rounded-xl border border-amber-500/20 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Percent className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <div className="font-semibold text-lg">Скидка</div>
                  <div className="text-xs text-muted-foreground">
                    На игру и джойстики (макс. {maxDiscountPercent}%)
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedDiscount === 0 ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'rounded-lg',
                    selectedDiscount === 0 && 'bg-primary'
                  )}
                  onClick={() => setSelectedDiscount(0)}
                >
                  Без скидки
                </Button>
                {discountPresets.map(preset => (
                  <Button
                    key={preset.id}
                    variant={selectedDiscount === preset.percent ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'rounded-lg',
                      selectedDiscount === preset.percent && 'bg-amber-500 hover:bg-amber-600 text-white'
                    )}
                    onClick={() => setSelectedDiscount(preset.percent)}
                  >
                    {preset.percent}%
                  </Button>
                ))}
              </div>
              {selectedDiscount > 0 && (
                <div className="mt-3 flex items-center justify-between text-amber-500 font-semibold">
                  <span>Скидка {selectedDiscount}%</span>
                  <span>−{formatCurrency(discountAmount)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grand Total */}
        <div className="glass-card rounded-2xl border-2 border-primary/30 p-8 mb-8 text-center shadow-glow-md">
          <div className="text-sm text-muted-foreground uppercase tracking-widest mb-3">
            Итого к оплате
          </div>
          {selectedDiscount > 0 && (
            <div className="text-2xl font-mono text-muted-foreground line-through mb-1">
              {formatCurrency(totalBeforeDiscount)}
            </div>
          )}
          <div className="text-6xl font-bold text-primary text-glow-cyan">
            {formatCurrency(totalCost)}
          </div>
        </div>

        {/* Action */}
        <Button 
          size="lg" 
          className={cn(
            'w-full h-20 text-xl font-bold rounded-2xl',
            'bg-gradient-to-r from-primary to-secondary',
            'hover:shadow-glow-lg hover:scale-[1.01] transition-all duration-200'
          )}
          onClick={handleProceedToPayment}
        >
          Перейти к оплате
        </Button>
        </div>
      </main>
    </div>
  );
}