import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { CLUB_NAME, CONTROLLER_RATE } from '@/lib/constants';
import { formatCurrency, formatDuration, formatTime, getElapsedMinutes, calculateGameCost, calculateControllerCost } from '@/lib/utils';
import { Banknote, Smartphone, CreditCard, Gamepad2, Coffee, Clock, Loader2 } from 'lucide-react';
import type { StationWithSession, ControllerUsage, SessionDrink, PaymentMethod } from '@/types/database';

interface PreCheckModalProps {
  open: boolean;
  onClose: () => void;
  station: StationWithSession | null;
  onConfirmPayment: (
    sessionId: string,
    gameCost: number,
    controllerCost: number,
    drinkCost: number,
    paymentMethod: PaymentMethod,
    cashAmount: number,
    kaspiAmount: number
  ) => Promise<void>;
}

interface ControllerCostItem {
  id: string;
  minutes: number;
  cost: number;
}

export function PreCheckModal({ open, onClose, station, onConfirmPayment }: PreCheckModalProps) {
  const [paymentMode, setPaymentMode] = useState<'select' | 'split'>('select');
  const [cashAmount, setCashAmount] = useState('');
  const [kaspiAmount, setKaspiAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [costs, setCosts] = useState({
    game: 0,
    controllers: 0,
    drinks: 0,
    total: 0,
  });
  const [controllerDetails, setControllerDetails] = useState<ControllerCostItem[]>([]);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Calculate costs when modal opens or time updates
  useEffect(() => {
    if (!open || !station?.activeSession) return;

    const calculateCosts = () => {
      const session = station.activeSession!;
      const elapsed = getElapsedMinutes(session.started_at);
      setElapsedMinutes(elapsed);

      // Game cost
      const gameCost = calculateGameCost(
        station.hourly_rate,
        station.package_rate,
        session.tariff_type,
        elapsed
      );

      // Controller costs - calculate each controller's time
      const controllers = station.controllers || [];
      const controllerItems: ControllerCostItem[] = controllers.map(c => {
        const takenAt = new Date(c.taken_at);
        const returnedAt = c.returned_at ? new Date(c.returned_at) : new Date();
        const minutes = Math.ceil((returnedAt.getTime() - takenAt.getTime()) / 60000);
        const cost = calculateControllerCost(minutes);
        return { id: c.id, minutes, cost };
      });
      const totalControllerCost = controllerItems.reduce((sum, c) => sum + c.cost, 0);
      setControllerDetails(controllerItems);

      // Drink costs - only if ordered
      const drinks = station.drinks || [];
      const drinkCost = drinks.reduce((sum, d) => sum + d.total_price, 0);

      const total = gameCost + totalControllerCost + drinkCost;

      setCosts({
        game: gameCost,
        controllers: totalControllerCost,
        drinks: drinkCost,
        total,
      });
    };

    calculateCosts();
    const interval = setInterval(calculateCosts, 1000);
    return () => clearInterval(interval);
  }, [open, station]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setPaymentMode('select');
      setCashAmount('');
      setKaspiAmount('');
      setIsProcessing(false);
    }
  }, [open]);

  if (!station?.activeSession) return null;

  const session = station.activeSession;
  const startTime = new Date(session.started_at);
  const endTime = new Date();
  const drinks = station.drinks || [];
  const hasControllers = controllerDetails.length > 0;
  const hasDrinks = drinks.length > 0;

  const handleSinglePayment = async (method: 'cash' | 'kaspi') => {
    setIsProcessing(true);
    try {
      await onConfirmPayment(
        session.id,
        costs.game,
        costs.controllers,
        costs.drinks,
        method,
        method === 'cash' ? costs.total : 0,
        method === 'kaspi' ? costs.total : 0
      );
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSplitPayment = async () => {
    const cash = parseInt(cashAmount) || 0;
    const kaspi = parseInt(kaspiAmount) || 0;

    if (cash + kaspi !== costs.total) {
      return; // Validation handled by button disable
    }

    setIsProcessing(true);
    try {
      await onConfirmPayment(
        session.id,
        costs.game,
        costs.controllers,
        costs.drinks,
        'split',
        cash,
        kaspi
      );
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const splitValid = (parseInt(cashAmount) || 0) + (parseInt(kaspiAmount) || 0) === costs.total;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        {/* Fixed Header */}
        <DialogHeader className="shrink-0">
          <div className="text-xs text-muted-foreground mb-1">{CLUB_NAME}</div>
          <DialogTitle className="text-xl">Пре-чек — {station.name}</DialogTitle>
        </DialogHeader>
        
        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4">

        {/* Session Time Info */}
        <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Начало</span>
            <span className="font-medium">{formatTime(startTime)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Конец</span>
            <span className="font-medium">{formatTime(endTime)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Длительность</span>
            <span className="font-mono font-semibold">{formatDuration(elapsedMinutes)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Тариф</span>
            <span className="font-medium">
              {session.tariff_type === 'package' ? 'Пакет 2+1' : 'Почасовая'}
            </span>
          </div>
        </div>

        <Separator />

        {/* Cost Breakdown */}
        <div className="space-y-3">
          {/* Game Cost */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>Игра ({formatDuration(elapsedMinutes)})</span>
            </div>
            <span className="font-semibold">{formatCurrency(costs.game)}</span>
          </div>

          {/* Controller Costs - only if controllers were used */}
          {hasControllers && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-primary" />
                  <span>Джойстики ({controllerDetails.length} шт.)</span>
                </div>
                <span className="font-semibold">{formatCurrency(costs.controllers)}</span>
              </div>
              <div className="pl-6 space-y-1">
                {controllerDetails.map((c, i) => (
                  <div key={c.id} className="text-xs text-muted-foreground flex justify-between">
                    <span>Джойстик {i + 1}: {formatDuration(c.minutes)}</span>
                    <span>{formatCurrency(c.cost)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drinks - only if ordered */}
          {hasDrinks && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-primary" />
                  <span>Напитки</span>
                </div>
                <span className="font-semibold">{formatCurrency(costs.drinks)}</span>
              </div>
              <div className="pl-6 space-y-1">
                {drinks.map(d => (
                  <div key={d.id} className="text-xs text-muted-foreground flex justify-between">
                    <span>{(d as any).drink?.name || 'Напиток'} × {d.quantity}</span>
                    <span>{formatCurrency(d.total_price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

          {/* Grand Total */}
          <div className="flex items-center justify-between text-lg">
            <span className="font-semibold">ИТОГО</span>
            <span className="text-2xl font-bold text-primary">{formatCurrency(costs.total)}</span>
          </div>
        </div>

        {/* Fixed Footer - Payment Buttons */}
        <div className="shrink-0 pt-4 border-t border-border/50">
        {paymentMode === 'select' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                className="h-14 gap-2 bg-cash hover:bg-cash/90"
                onClick={() => handleSinglePayment('cash')}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Banknote className="w-5 h-5" />}
                Наличные
              </Button>
              <Button
                size="lg"
                className="h-14 gap-2 bg-kaspi hover:bg-kaspi/90"
                onClick={() => handleSinglePayment('kaspi')}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
                Kaspi QR
              </Button>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 gap-2"
              onClick={() => setPaymentMode('split')}
              disabled={isProcessing}
            >
              <CreditCard className="w-5 h-5" />
              Разделить оплату
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Наличные</label>
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cash" />
                  <Input
                    type="number"
                    placeholder="0"
                    className="pl-10"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Kaspi</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kaspi" />
                  <Input
                    type="number"
                    placeholder="0"
                    className="pl-10"
                    value={kaspiAmount}
                    onChange={(e) => setKaspiAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Сумма: </span>
              <span className={splitValid ? 'text-success font-medium' : 'text-destructive font-medium'}>
                {formatCurrency((parseInt(cashAmount) || 0) + (parseInt(kaspiAmount) || 0))}
              </span>
              <span className="text-muted-foreground"> из </span>
              <span className="font-medium">{formatCurrency(costs.total)}</span>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPaymentMode('select')}
                disabled={isProcessing}
              >
                Назад
              </Button>
              <Button
                className="flex-1"
                onClick={handleSplitPayment}
                disabled={!splitValid || isProcessing}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Подтвердить
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}