import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CLUB_NAME } from '@/lib/constants';
import { formatCurrency, formatDateFull, formatTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Banknote, Smartphone, Gamepad2, Coffee, Clock, Printer, Download } from 'lucide-react';
import type { Session, Payment } from '@/types/database';

interface ShiftReportModalProps {
  open: boolean;
  onClose: () => void;
}

interface ShiftData {
  sessions: Session[];
  totalGames: number;
  totalControllers: number;
  totalDrinks: number;
  totalCash: number;
  totalKaspi: number;
  grandTotal: number;
}

const STORAGE_KEYS = {
  SESSIONS: 'svoy_sessions',
  PAYMENTS: 'svoy_payments',
};

function getStoredData<T>(key: string): T[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function ShiftReportModal({ open, onClose }: ShiftReportModalProps) {
  const { shift, cashier } = useAuth();
  const [data, setData] = useState<ShiftData | null>(null);

  useEffect(() => {
    if (!open || !shift) return;

    // Get data from localStorage
    const sessions = getStoredData<Session>(STORAGE_KEYS.SESSIONS);
    const payments = getStoredData<Payment>(STORAGE_KEYS.PAYMENTS);

    // Filter for this shift's completed sessions
    const shiftSessions = sessions.filter(
      s => s.shift_id === shift.id && s.status === 'completed'
    );
    const shiftPayments = payments.filter(p => p.shift_id === shift.id);

    // Calculate totals
    const totalGames = shiftSessions.reduce((sum, s) => sum + (s.game_cost || 0), 0);
    const totalControllers = shiftSessions.reduce((sum, s) => sum + (s.controller_cost || 0), 0);
    const totalDrinks = shiftSessions.reduce((sum, s) => sum + (s.drink_cost || 0), 0);
    const totalCash = shiftPayments.reduce((sum, p) => sum + (p.cash_amount || 0), 0);
    const totalKaspi = shiftPayments.reduce((sum, p) => sum + (p.kaspi_amount || 0), 0);

    setData({
      sessions: shiftSessions,
      totalGames,
      totalControllers,
      totalDrinks,
      totalCash,
      totalKaspi,
      grandTotal: totalCash + totalKaspi,
    });
  }, [open, shift]);

  const handlePrint = () => {
    window.print();
  };

  if (!shift || !cashier) return null;

  const startTime = new Date(shift.started_at);
  const endTime = shift.ended_at ? new Date(shift.ended_at) : new Date();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg print:max-w-none print:m-0 print:p-8 print:shadow-none print:bg-white print:text-black">
        <DialogHeader className="print:mb-6">
          <div className="text-xs text-muted-foreground uppercase tracking-wider print:text-gray-600">{CLUB_NAME}</div>
          <DialogTitle className="text-2xl print:text-3xl">Отчёт смены</DialogTitle>
        </DialogHeader>

        {data ? (
          <div className="space-y-5 print:space-y-6" id="shift-report">
            {/* Shift Info */}
            <div className="bg-secondary rounded-lg p-4 space-y-2 print:bg-gray-100 print:p-6">
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
                <span className="font-medium">{data.sessions.length}</span>
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
                  <span>Наличные</span>
                </div>
                <span className="font-semibold text-lg">{formatCurrency(data.totalCash)}</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-kaspi" />
                  <span>Kaspi</span>
                </div>
                <span className="font-semibold text-lg">{formatCurrency(data.totalKaspi)}</span>
              </div>
            </div>

            <Separator className="print:border-gray-300" />

            {/* Grand Total */}
            <div className="flex items-center justify-between py-4">
              <span className="font-semibold text-lg">ИТОГО</span>
              <span className="text-4xl font-bold">
                {formatCurrency(data.grandTotal)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Нет данных для отображения
          </div>
        )}

        {/* Actions - hidden in print */}
        <div className="flex gap-3 print:hidden mt-4">
          <Button variant="outline" className="flex-1 gap-2 h-12" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
            Печать
          </Button>
          <Button className="flex-1 gap-2 h-12" onClick={handlePrint}>
            <Download className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
