import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { CLUB_NAME } from '@/lib/constants';
import { formatCurrency, formatTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Banknote, Smartphone, Gamepad2, Coffee, Clock } from 'lucide-react';

interface CashDeskModalProps {
  open: boolean;
  onClose: () => void;
}

export function CashDeskModal({ open, onClose }: CashDeskModalProps) {
  const { shift, cashier } = useAuth();

  if (!shift || !cashier) return null;

  const startTime = new Date(shift.started_at);
  const grandTotal = (shift.total_cash || 0) + (shift.total_kaspi || 0);
  const categoryTotal = (shift.total_games || 0) + (shift.total_controllers || 0) + (shift.total_drinks || 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="text-xs text-muted-foreground">{CLUB_NAME}</div>
          <DialogTitle>Касса смены</DialogTitle>
        </DialogHeader>

        {/* Shift Info */}
        <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Кассир</span>
            <span className="font-medium">{cashier.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Начало смены</span>
            <span className="font-medium">{formatTime(startTime)}</span>
          </div>
        </div>

        <Separator />

        {/* By Category */}
        <div className="space-y-3">
          <h3 className="font-semibold text-muted-foreground text-xs">ПО КАТЕГОРИЯМ</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>Игры</span>
            </div>
            <span className="font-medium">{formatCurrency(shift.total_games || 0)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-primary" />
              <span>Джойстики</span>
            </div>
            <span className="font-medium">{formatCurrency(shift.total_controllers || 0)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-primary" />
              <span>Напитки</span>
            </div>
            <span className="font-medium">{formatCurrency(shift.total_drinks || 0)}</span>
          </div>
        </div>

        <Separator />

        {/* By Payment Method */}
        <div className="space-y-3">
          <h3 className="font-semibold text-muted-foreground text-xs">ПО ТИПУ ОПЛАТЫ</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-cash" />
              <span>Наличные</span>
            </div>
            <span className="font-semibold text-lg">{formatCurrency(shift.total_cash || 0)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-kaspi" />
              <span>Kaspi</span>
            </div>
            <span className="font-semibold text-lg">{formatCurrency(shift.total_kaspi || 0)}</span>
          </div>
        </div>

        <Separator />

        {/* Grand Total */}
        <div className="flex items-center justify-between py-2">
          <span className="font-semibold text-lg">ИТОГО</span>
          <span className="text-3xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}