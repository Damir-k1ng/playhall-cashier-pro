import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CLUB_NAME } from '@/lib/constants';
import { formatCurrency, formatDateFull, formatTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Banknote, Smartphone, Gamepad2, Coffee, Clock, Printer, Download } from 'lucide-react';
import { DualSenseIcon } from '@/components/icons/DualSenseIcon';

interface ShiftReportModalProps {
  open: boolean;
  onClose: () => void;
}

interface ShiftData {
  sessionsCount: number;
  totalGames: number;
  totalControllers: number;
  totalDrinks: number;
  totalCash: number;
  totalKaspi: number;
  grandTotal: number;
}

export function ShiftReportModal({ open, onClose }: ShiftReportModalProps) {
  const { shift, cashier } = useAuth();
  const [data, setData] = useState<ShiftData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !shift) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get sessions count for this shift
        const { count } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('shift_id', shift.id)
          .eq('status', 'completed');

        setData({
          sessionsCount: count || 0,
          totalGames: shift.total_games || 0,
          totalControllers: shift.total_controllers || 0,
          totalDrinks: shift.total_drinks || 0,
          totalCash: shift.total_cash || 0,
          totalKaspi: shift.total_kaspi || 0,
          grandTotal: (shift.total_cash || 0) + (shift.total_kaspi || 0),
        });
      } catch (err) {
        console.error('Error fetching shift data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, shift]);

  const handlePrint = () => {
    window.print();
  };

  if (!shift || !cashier) return null;

  const startTime = new Date(shift.started_at);
  const endTime = shift.ended_at ? new Date(shift.ended_at) : new Date();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg glass-card border-primary/20 print:max-w-none print:m-0 print:p-8 print:shadow-none print:bg-white print:text-black">
        <DialogHeader className="print:mb-6">
          <div className="flex items-center gap-2 mb-2 print:hidden">
            <DualSenseIcon size={16} className="text-primary" />
            <span className="text-xs text-muted-foreground">{CLUB_NAME}</span>
          </div>
          <div className="hidden print:block text-center mb-4">
            <p className="text-lg font-bold">{CLUB_NAME}</p>
          </div>
          <DialogTitle className="text-2xl print:text-3xl print:text-center">Отчёт смены</DialogTitle>
        </DialogHeader>

        {data ? (
          <div className="space-y-5 print:space-y-6" id="shift-report">
            {/* Shift Info */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-2 border border-border/50 print:bg-gray-100 print:p-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground print:text-gray-600">Дата</span>
                <span className="font-medium">{formatDateFull(startTime)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground print:text-gray-600">Кассир</span>
                <span className="font-medium">{cashier.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground print:text-gray-600">Время</span>
                <span className="font-medium">
                  {formatTime(startTime)} — {formatTime(endTime)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground print:text-gray-600">Сессий</span>
                <span className="font-medium">{data.sessionsCount}</span>
              </div>
            </div>

            <Separator className="print:border-gray-300" />

            {/* Revenue Breakdown */}
            <div className="space-y-3">
              <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider print:text-gray-600">
                Выручка по категориям
              </h3>
              
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground print:text-gray-600" />
                  <span>Игры</span>
                </div>
                <span className="font-semibold text-lg">{formatCurrency(data.totalGames)}</span>
              </div>

              {data.totalControllers > 0 && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Gamepad2 className="w-5 h-5 text-muted-foreground print:text-gray-600" />
                    <span>Джойстики</span>
                  </div>
                  <span className="font-semibold text-lg">{formatCurrency(data.totalControllers)}</span>
                </div>
              )}

              {data.totalDrinks > 0 && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Coffee className="w-5 h-5 text-muted-foreground print:text-gray-600" />
                    <span>Напитки</span>
                  </div>
                  <span className="font-semibold text-lg">{formatCurrency(data.totalDrinks)}</span>
                </div>
              )}
            </div>

            <Separator className="print:border-gray-300" />

            {/* Payment Methods */}
            <div className="space-y-3">
              <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider print:text-gray-600">
                Оплата по типам
              </h3>
              
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Banknote className="w-5 h-5 text-cash" />
                  <span>💵 Наличные</span>
                </div>
                <span className="font-semibold text-lg">{formatCurrency(data.totalCash)}</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-kaspi" />
                  <span>📱 Kaspi</span>
                </div>
                <span className="font-semibold text-lg">{formatCurrency(data.totalKaspi)}</span>
              </div>
            </div>

            <Separator className="print:border-gray-300" />

            {/* Grand Total */}
            <div className="flex items-center justify-between py-4">
              <span className="font-semibold text-lg">ИТОГО</span>
              <span className="text-4xl font-bold text-primary print:text-black">
                {formatCurrency(data.grandTotal)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {isLoading ? 'Загрузка...' : 'Нет данных для отображения'}
          </div>
        )}

        {/* Actions - hidden in print */}
        <div className="flex gap-3 print:hidden mt-4">
          <Button variant="outline" className="flex-1 gap-2 h-12" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
            Печать
          </Button>
          <Button className="flex-1 gap-2 h-12 bg-gradient-to-r from-primary to-secondary" onClick={handlePrint}>
            <Download className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
