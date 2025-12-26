import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { useDrinks } from '@/hooks/useDrinks';
import { usePayments } from '@/hooks/usePayments';
import { Loader2, Check, Plus, CreditCard, Banknote, ArrowLeftRight, Coffee } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface DrinkSalesModalProps {
  open: boolean;
  onClose: () => void;
}

type PaymentStep = 'select' | 'payment' | 'success';

export function DrinkSalesModal({ open, onClose }: DrinkSalesModalProps) {
  const { drinks, isLoading } = useDrinks();
  const { processDrinkSale } = usePayments();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [step, setStep] = useState<PaymentStep>('select');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'kaspi' | 'split'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [kaspiAmount, setKaspiAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAddDrink = (drinkId: string) => {
    setQuantities(prev => ({
      ...prev,
      [drinkId]: (prev[drinkId] || 0) + 1
    }));
  };

  const totalAmount = drinks.reduce((sum, drink) => {
    const qty = quantities[drink.id] || 0;
    return sum + (drink.price * qty);
  }, 0);

  const hasItems = Object.values(quantities).some(q => q > 0);

  const handleProceedToPayment = () => {
    if (!hasItems) return;
    setStep('payment');
  };

  const handlePayment = async (method: 'cash' | 'kaspi') => {
    if (!hasItems) return;
    
    setIsProcessing(true);
    try {
      // Process each drink sale
      for (const [drinkId, qty] of Object.entries(quantities)) {
        if (qty > 0) {
          const drink = drinks.find(d => d.id === drinkId);
          if (drink) {
            await processDrinkSale(
              drinkId,
              qty,
              drink.price * qty,
              method,
              method === 'cash' ? drink.price * qty : 0,
              method === 'kaspi' ? drink.price * qty : 0
            );
          }
        }
      }
      
      setStep('success');
      setTimeout(() => {
        handleReset();
      }, 1500);
    } catch (error) {
      toast.error('Ошибка при обработке платежа');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSplitPayment = async () => {
    const cash = parseFloat(cashAmount) || 0;
    const kaspi = parseFloat(kaspiAmount) || 0;
    
    if (cash + kaspi !== totalAmount) {
      toast.error('Сумма должна равняться итого');
      return;
    }
    
    setIsProcessing(true);
    try {
      for (const [drinkId, qty] of Object.entries(quantities)) {
        if (qty > 0) {
          const drink = drinks.find(d => d.id === drinkId);
          if (drink) {
            const drinkTotal = drink.price * qty;
            const drinkCashRatio = cash / totalAmount;
            const drinkCash = Math.round(drinkTotal * drinkCashRatio);
            const drinkKaspi = drinkTotal - drinkCash;
            
            await processDrinkSale(drinkId, qty, drinkTotal, 'split', drinkCash, drinkKaspi);
          }
        }
      }
      
      setStep('success');
      setTimeout(() => {
        handleReset();
      }, 1500);
    } catch (error) {
      toast.error('Ошибка при обработке платежа');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setQuantities({});
    setStep('select');
    setPaymentMode('cash');
    setCashAmount('');
    setKaspiAmount('');
    onClose();
  };

  const splitSum = (parseFloat(cashAmount) || 0) + (parseFloat(kaspiAmount) || 0);
  const isSplitValid = splitSum === totalAmount;

  return (
    <Dialog open={open} onOpenChange={handleReset}>
      <DialogContent className="sm:max-w-lg glass-card border-primary/20">
        {step === 'success' ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-success/20 border-2 border-success flex items-center justify-center animate-success-glow mb-6">
              <Check className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-success text-glow-emerald">Оплачено!</h2>
            <p className="text-muted-foreground mt-2">{formatCurrency(totalAmount)}</p>
          </div>
        ) : step === 'payment' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-3">
                <Coffee className="w-6 h-6 text-primary" />
                Оплата напитков
              </DialogTitle>
            </DialogHeader>

            <div className="py-6">
              <div className="text-center mb-8">
                <div className="text-sm text-muted-foreground mb-2">К оплате</div>
                <div className="font-gaming text-5xl font-bold text-primary text-glow-cyan">
                  {formatCurrency(totalAmount)}
                </div>
              </div>

              {/* Payment Mode Toggle */}
              <div className="flex gap-2 p-1 bg-muted/30 rounded-xl mb-6">
                <button
                  onClick={() => setPaymentMode('cash')}
                  className={cn(
                    'flex-1 py-3 px-4 rounded-lg font-medium transition-all',
                    paymentMode === 'cash'
                      ? 'bg-success text-success-foreground shadow-lg'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Одним способом
                </button>
                <button
                  onClick={() => setPaymentMode('split')}
                  className={cn(
                    'flex-1 py-3 px-4 rounded-lg font-medium transition-all',
                    paymentMode === 'split'
                      ? 'bg-success text-success-foreground shadow-lg'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Разделить
                </button>
              </div>

              {paymentMode === 'split' ? (
                <div className="space-y-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-success" />
                      Наличные
                    </label>
                    <Input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="0"
                      className="text-lg h-14 bg-muted/30 border-border/50 text-center font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-kaspi" />
                      Kaspi QR
                    </label>
                    <Input
                      type="number"
                      value={kaspiAmount}
                      onChange={(e) => setKaspiAmount(e.target.value)}
                      placeholder="0"
                      className="text-lg h-14 bg-muted/30 border-border/50 text-center font-mono"
                    />
                  </div>
                  
                  <div className={cn(
                    'text-center py-3 rounded-lg border',
                    isSplitValid 
                      ? 'bg-success/10 border-success/30 text-success' 
                      : 'bg-destructive/10 border-destructive/30 text-destructive'
                  )}>
                    {isSplitValid 
                      ? '✓ Сумма верна' 
                      : `Осталось: ${formatCurrency(totalAmount - splitSum)}`}
                  </div>

                  <Button
                    onClick={handleSplitPayment}
                    disabled={!isSplitValid || isProcessing}
                    className="w-full h-14 text-lg bg-gradient-to-r from-success to-primary hover:opacity-90 btn-press"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <ArrowLeftRight className="w-5 h-5 mr-2" />
                    )}
                    Подтвердить разделённый платёж
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => handlePayment('cash')}
                    disabled={isProcessing}
                    className="h-20 text-lg bg-gradient-to-br from-success to-emerald-600 hover:opacity-90 flex flex-col gap-2 btn-press glow-emerald"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Banknote className="w-8 h-8" />
                        <span>Наличные</span>
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handlePayment('kaspi')}
                    disabled={isProcessing}
                    className="h-20 text-lg bg-gradient-to-br from-kaspi to-pink-600 hover:opacity-90 flex flex-col gap-2 btn-press"
                    style={{ boxShadow: '0 0 20px hsl(330 100% 60% / 0.3)' }}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-8 h-8" />
                        <span>Kaspi QR</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            <Button 
              variant="ghost" 
              onClick={() => setStep('select')}
              className="w-full"
            >
              ← Назад к выбору
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-3">
                <Coffee className="w-6 h-6 text-primary" />
                Продажа напитков
              </DialogTitle>
            </DialogHeader>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 py-4">
                {drinks.map(drink => {
                  const qty = quantities[drink.id] || 0;
                  return (
                    <button
                      key={drink.id}
                      onClick={() => handleAddDrink(drink.id)}
                      className={cn(
                        'relative p-4 rounded-xl transition-all duration-200 btn-press',
                        'bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50',
                        'hover:border-primary/40 hover:bg-muted/60',
                        qty > 0 && 'border-primary/50 bg-primary/10'
                      )}
                    >
                      {qty > 0 && (
                        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg">
                          {qty}
                        </div>
                      )}
                      <div className="text-left">
                        <div className="font-medium text-foreground mb-1">{drink.name}</div>
                        <div className="text-lg font-bold text-primary">{formatCurrency(drink.price)}</div>
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <Plus className="w-6 h-6 text-primary opacity-50" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {hasItems && (
              <div className="flex items-center justify-between py-4 border-t border-border/50">
                <span className="text-muted-foreground">Итого:</span>
                <span className="font-gaming text-2xl font-bold text-primary text-glow-cyan">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12" onClick={handleReset}>
                Отмена
              </Button>
              <Button 
                className="flex-1 h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90 btn-press"
                onClick={handleProceedToPayment}
                disabled={!hasItems}
              >
                К оплате
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
