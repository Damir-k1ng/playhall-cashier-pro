import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Station } from '@/types/database';

interface StartSessionModalProps {
  open: boolean;
  onClose: () => void;
  station: Station | null;
  onConfirm: (tariffType: 'hourly' | 'package') => void;
}

export function StartSessionModal({ open, onClose, station, onConfirm }: StartSessionModalProps) {
  const [selected, setSelected] = useState<'hourly' | 'package' | null>(null);

  if (!station) return null;

  const handleConfirm = () => {
    if (selected) {
      onConfirm(selected);
      setSelected(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {/* Fixed Header */}
        <DialogHeader className="shrink-0">
          <DialogTitle>Запуск сессии — {station.name}</DialogTitle>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-4">
          <button
            onClick={() => setSelected('hourly')}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              selected === 'hourly' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="font-medium">Почасовая</div>
            <div className="text-2xl font-semibold mt-1">{formatCurrency(station.hourly_rate)}/час</div>
          </button>

          <button
            onClick={() => setSelected('package')}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              selected === 'package' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="font-medium">Пакет 2+1</div>
            <div className="text-2xl font-semibold mt-1">{formatCurrency(station.package_rate)}</div>
            <div className="text-sm text-muted-foreground mt-1">3 часа (2 платных + 1 бесплатный)</div>
          </button>
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 flex gap-3 pt-4 border-t border-border/50">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Отмена
          </Button>
          <Button className="flex-1" disabled={!selected} onClick={handleConfirm}>
            Начать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}