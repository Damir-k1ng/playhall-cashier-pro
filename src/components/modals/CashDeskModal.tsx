import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { CLUB_NAME } from '@/lib/constants';
import { formatCurrency, formatTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Banknote, Smartphone, Gamepad2, Coffee, Clock } from 'lucide-react';
import { DualSenseIcon } from '@/components/icons/DualSenseIcon';

interface CashDeskModalProps {
  open: boolean;
  onClose: () => void;
}

export function CashDeskModal({ open, onClose }: CashDeskModalProps) {
  const { shift, cashier } = useAuth();

  if (!shift || !cashier) return null;

  const startTime = new Date(shift.started_at);
  const grandTotal = (shift.total_cash || 0) + (shift.total_kaspi || 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-card border-primary/20">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <DualSenseIcon size={16} className="text-primary" />
            <span className="text-xs text-muted-foreground">{CLUB_NAME}</span>
          </div>
          <DialogTitle className="text-xl">Касса смены</DialogTitle>
        </DialogHeader>

        {/* Shift Info */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-2 border border-border/50">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Кассир</span>
            <span className="font-medium">{cashier.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Начало смены</span>
            <span className="font-medium">{formatTime(startTime)}</span>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* By Category */}
        <div className="space-y-3">
          <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">По категориям</h3>
          
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

        <Separator className="bg-border/50" />

        {/* By Payment Method */}
        <div className="space-y-3">
          <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">По типу оплаты</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-cash" />
              <span>💵 Наличные</span>
            </div>
            <span className="font-semibold text-lg text-cash">{formatCurrency(shift.total_cash || 0)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-kaspi" />
              <span>📱 Kaspi</span>
            </div>
            <span className="font-semibold text-lg text-kaspi">{formatCurrency(shift.total_kaspi || 0)}</span>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Grand Total */}
        <div className="flex items-center justify-between py-2">
          <span className="font-semibold text-lg">ИТОГО</span>
          <span className="text-4xl font-bold text-primary text-glow-cyan">{formatCurrency(grandTotal)}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
