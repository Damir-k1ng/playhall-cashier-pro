import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { useDrinks } from '@/hooks/useDrinks';
import { Minus, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DrinksModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string | null;
}

export function DrinksModal({ open, onClose, sessionId }: DrinksModalProps) {
  const { drinks, isLoading, addDrinkToSession } = useDrinks();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuantityChange = (drinkId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[drinkId] || 0;
      const newValue = Math.max(0, current + delta);
      if (newValue === 0) {
        const { [drinkId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [drinkId]: newValue };
    });
  };

  const handleSubmit = async () => {
    if (!sessionId) return;

    const items = Object.entries(quantities).filter(([_, qty]) => qty > 0);
    if (items.length === 0) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      for (const [drinkId, quantity] of items) {
        const drink = drinks.find(d => d.id === drinkId);
        if (drink) {
          await addDrinkToSession(sessionId, drinkId, quantity, drink.price);
        }
      }
      toast.success('Напитки добавлены');
      setQuantities({});
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = drinks.reduce((sum, drink) => {
    const qty = quantities[drink.id] || 0;
    return sum + (drink.price * qty);
  }, 0);

  const hasItems = Object.values(quantities).some(q => q > 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {/* Fixed Header */}
        <DialogHeader className="shrink-0">
          <DialogTitle>Добавить напитки</DialogTitle>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {drinks.map(drink => {
                const qty = quantities[drink.id] || 0;
                return (
                  <div
                    key={drink.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/50"
                  >
                    <div>
                      <div className="font-medium">{drink.name}</div>
                      <div className="text-sm text-muted-foreground">{formatCurrency(drink.price)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(drink.id, -1)}
                        disabled={qty === 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(drink.id, 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 space-y-3 pt-4 border-t border-border/50">
          {hasItems && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Итого:</span>
              <span className="text-lg font-semibold">{formatCurrency(totalAmount)}</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Отмена
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleSubmit}
              disabled={!hasItems || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Добавить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}