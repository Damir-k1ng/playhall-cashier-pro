import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Gamepad2, Coffee, Banknote, Smartphone, AlertTriangle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatTimeFromISO, formatDuration } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Controller {
  id: string;
  taken_at: string;
  returned_at: string;
  cost: number;
}

interface Session {
  id: string;
  station_name: string;
  station_zone: string;
  cashier_name: string;
  tariff_type: 'hourly' | 'package';
  package_count: number;
  started_at: string;
  ended_at: string;
  game_cost: number;
  controller_cost: number;
  drink_cost: number;
  total_cost: number;
  payment: {
    payment_method: 'cash' | 'kaspi' | 'split';
    cash_amount: number;
    kaspi_amount: number;
    total_amount: number;
  } | null;
  controllers: Controller[];
}

interface EditSessionModalProps {
  session: Session;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditSessionModal({ session, open, onClose, onSuccess }: EditSessionModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Editable values
  const [gameCost, setGameCost] = useState(session.game_cost);
  const [controllerCost, setControllerCost] = useState(session.controller_cost);
  const [drinkCost, setDrinkCost] = useState(session.drink_cost);
  const [cashAmount, setCashAmount] = useState(session.payment?.cash_amount || 0);
  const [kaspiAmount, setKaspiAmount] = useState(session.payment?.kaspi_amount || 0);
  const [reason, setReason] = useState('');
  
  // Controller edits
  const [controllers, setControllers] = useState<Controller[]>(
    session.controllers.map(c => ({ ...c }))
  );

  const totalCost = gameCost + controllerCost + drinkCost;
  const paymentSum = cashAmount + kaspiAmount;
  const isPaymentValid = paymentSum === totalCost;

  const hasChanges = 
    gameCost !== session.game_cost ||
    controllerCost !== session.controller_cost ||
    drinkCost !== session.drink_cost ||
    cashAmount !== (session.payment?.cash_amount || 0) ||
    kaspiAmount !== (session.payment?.kaspi_amount || 0);

  const handleSubmit = async () => {
    if (!isPaymentValid) {
      toast({
        title: 'Ошибка',
        description: 'Сумма наличных + Kaspi должна равняться итогу',
        variant: 'destructive'
      });
      return;
    }

    if (reason.trim().length < 5) {
      toast({
        title: 'Ошибка',
        description: 'Укажите причину корректировки (минимум 5 символов)',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.editSession(session.id, {
        game_cost: gameCost,
        controller_cost: controllerCost,
        drink_cost: drinkCost,
        cash_amount: cashAmount,
        kaspi_amount: kaspiAmount,
        controllers: controllers.map(c => ({
          id: c.id,
          taken_at: c.taken_at,
          returned_at: c.returned_at
        })),
        reason: reason.trim()
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось сохранить изменения',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateDuration = (startedAt: string, endedAt: string): number => {
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    return Math.floor((end.getTime() - start.getTime()) / 60000);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Редактирование сессии
            <Badge variant="outline">{session.station_name}</Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Session Info (Read-only) */}
            <div className="p-3 rounded-lg bg-muted/30 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Кассир:</span>
                <span>{session.cashier_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Время:</span>
                <span>{formatTimeFromISO(session.started_at)} → {formatTimeFromISO(session.ended_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Длительность:</span>
                <span>{formatDuration(calculateDuration(session.started_at, session.ended_at))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Тариф:</span>
                <span>{session.tariff_type === 'package' ? `Пакет ×${session.package_count}` : 'Почасовой'}</span>
              </div>
            </div>

            <Separator />

            {/* Editable Costs */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-primary" />
                Суммы по категориям
              </h4>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">🎮 Игра</Label>
                  <Input
                    type="number"
                    value={gameCost}
                    onChange={(e) => setGameCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">🕹️ Джойстики</Label>
                  <Input
                    type="number"
                    value={controllerCost}
                    onChange={(e) => setControllerCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">🥤 Напитки</Label>
                  <Input
                    type="number"
                    value={drinkCost}
                    onChange={(e) => setDrinkCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-primary/10">
                <span className="font-medium">ИТОГО:</span>
                <span className="text-lg font-bold">{formatCurrency(totalCost)}</span>
              </div>
            </div>

            {/* Controllers (if any) */}
            {controllers.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-secondary" />
                    Джойстики
                  </h4>
                  
                  {controllers.map((ctrl, index) => (
                    <div key={ctrl.id} className="grid grid-cols-2 gap-2 p-2 rounded bg-muted/30">
                      <div>
                        <Label className="text-xs">Взят</Label>
                        <Input
                          type="time"
                          value={new Date(ctrl.taken_at).toTimeString().slice(0, 5)}
                          onChange={(e) => {
                            const newControllers = [...controllers];
                            const date = new Date(ctrl.taken_at);
                            const [hours, minutes] = e.target.value.split(':');
                            date.setHours(parseInt(hours), parseInt(minutes));
                            newControllers[index] = { ...ctrl, taken_at: date.toISOString() };
                            setControllers(newControllers);
                          }}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Возврат</Label>
                        <Input
                          type="time"
                          value={new Date(ctrl.returned_at).toTimeString().slice(0, 5)}
                          onChange={(e) => {
                            const newControllers = [...controllers];
                            const date = new Date(ctrl.returned_at);
                            const [hours, minutes] = e.target.value.split(':');
                            date.setHours(parseInt(hours), parseInt(minutes));
                            newControllers[index] = { ...ctrl, returned_at: date.toISOString() };
                            setControllers(newControllers);
                          }}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Separator />

            {/* Payment */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Banknote className="h-4 w-4 text-cash" />
                Способ оплаты
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Banknote className="h-3 w-3 text-cash" /> Наличные
                  </Label>
                  <Input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Smartphone className="h-3 w-3 text-kaspi" /> Kaspi
                  </Label>
                  <Input
                    type="number"
                    value={kaspiAmount}
                    onChange={(e) => setKaspiAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="mt-1"
                  />
                </div>
              </div>

              {!isPaymentValid && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Сумма ({formatCurrency(paymentSum)}) ≠ Итого ({formatCurrency(totalCost)})
                </div>
              )}
            </div>

            <Separator />

            {/* Reason */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                📝 Причина корректировки <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Опишите причину изменения..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!hasChanges || !isPaymentValid || reason.trim().length < 5 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
