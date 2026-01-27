import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePayments } from '@/hooks/usePayments';
import { useStations } from '@/hooks/useStations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Banknote, Smartphone, Split, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CLUB_NAME } from '@/lib/constants';
import { apiClient } from '@/lib/api';

interface SessionData {
  stationId: string;
  stationName: string;
  gameCost: number;
  controllerCost: number;
  drinkCost: number;
  totalCost: number;
}

export function PaymentScreen() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { processPayment } = usePayments();
  const { refetch } = useStations();
  
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [paymentMode, setPaymentMode] = useState<'single' | 'split'>('single');
  const [cashAmount, setCashAmount] = useState('');
  const [kaspiAmount, setKaspiAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Use location.state if available, otherwise fetch from API
  useEffect(() => {
    if (location.state?.totalCost) {
      setSessionData({
        stationId: location.state.stationId,
        stationName: location.state.stationName,
        gameCost: location.state.gameCost,
        controllerCost: location.state.controllerCost,
        drinkCost: location.state.drinkCost,
        totalCost: location.state.totalCost,
      });
    } else if (sessionId) {
      // Fetch session data from API
      setIsLoading(true);
      setLoadError(null);
      
      apiClient.getSession(sessionId)
        .then((data) => {
          setSessionData({
            stationId: data.station?.id || '',
            stationName: data.station?.name || 'Станция',
            gameCost: data.gameCost,
            controllerCost: data.controllerCost,
            drinkCost: data.drinkCost,
            totalCost: data.totalCost,
          });
        })
        .catch((err) => {
          console.error('Error loading session:', err);
          setLoadError('Не удалось загрузить данные сессии');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [sessionId, location.state]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Сессия не найдена</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError || !sessionData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{loadError || 'Данные не найдены'}</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          На главную
        </Button>
      </div>
    );
  }

  const { stationName, gameCost, controllerCost, drinkCost, totalCost } = sessionData;

  const handleSinglePayment = async (method: 'cash' | 'kaspi') => {
    setIsProcessing(true);
    
    const result = await processPayment(
      sessionId,
      gameCost,
      controllerCost,
      drinkCost,
      method,
      method === 'cash' ? totalCost : 0,
      method === 'kaspi' ? totalCost : 0
    );

    if (result.error) {
      toast.error(result.error);
      setIsProcessing(false);
    } else {
      toast.success('Оплата принята');
      await refetch();
      navigate('/');
    }
  };

  const handleSplitPayment = async () => {
    const cash = parseFloat(cashAmount) || 0;
    const kaspi = parseFloat(kaspiAmount) || 0;

    if (cash + kaspi !== totalCost) {
      toast.error(`Сумма должна равняться ${formatCurrency(totalCost)}`);
      return;
    }

    setIsProcessing(true);
    
    const result = await processPayment(
      sessionId,
      gameCost,
      controllerCost,
      drinkCost,
      'split',
      cash,
      kaspi
    );

    if (result.error) {
      toast.error(result.error);
      setIsProcessing(false);
    } else {
      toast.success('Оплата принята');
      await refetch();
      navigate('/');
    }
  };

  const splitSum = (parseFloat(cashAmount) || 0) + (parseFloat(kaspiAmount) || 0);
  const splitValid = splitSum === totalCost;
  const splitDifference = totalCost - splitSum;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header - Fixed */}
      <header className="shrink-0 glass-card border-b border-primary/10 px-6 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground rounded-xl border border-transparent hover:border-primary/20 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <span className="text-xs text-muted-foreground tracking-wider font-brand">{CLUB_NAME}</span>
          <div className="w-16" />
        </div>
      </header>

      {/* Content - Scrollable */}
      <main className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Оплата</h1>
          <p className="text-muted-foreground">{stationName}</p>
        </div>

        {/* Total */}
        <div className="glass-card rounded-2xl border-2 border-primary/30 p-10 mb-8 text-center shadow-glow-md">
          <div className="text-sm text-muted-foreground uppercase tracking-widest mb-4">
            К оплате
          </div>
          <div className="text-7xl font-bold text-primary text-glow-cyan animate-pulse-glow">
            {formatCurrency(totalCost)}
          </div>
        </div>

        {/* Payment Mode Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-muted/30 rounded-xl mb-8">
          <Button
            variant={paymentMode === 'single' ? 'default' : 'ghost'}
            size="lg"
            className={cn(
              'rounded-lg h-12',
              paymentMode === 'single' && 'bg-primary shadow-glow-sm'
            )}
            onClick={() => setPaymentMode('single')}
          >
            Один способ
          </Button>
          <Button
            variant={paymentMode === 'split' ? 'default' : 'ghost'}
            size="lg"
            className={cn(
              'rounded-lg h-12',
              paymentMode === 'split' && 'bg-primary shadow-glow-sm'
            )}
            onClick={() => setPaymentMode('split')}
          >
            <Split className="w-4 h-4 mr-2" />
            Разделить
          </Button>
        </div>

        {paymentMode === 'single' ? (
          /* Single Payment */
          <div className="space-y-4">
            <Button
              size="lg"
              variant="outline"
              className={cn(
                'w-full h-24 justify-start gap-5 rounded-2xl border-2',
                'border-success/30 hover:border-success hover:bg-success/10 hover:shadow-glow-emerald',
                'transition-all duration-200'
              )}
              onClick={() => handleSinglePayment('cash')}
              disabled={isProcessing}
            >
              <div className="w-14 h-14 rounded-xl bg-success/10 border border-success/30 flex items-center justify-center">
                <Banknote className="w-7 h-7 text-success" />
              </div>
              <span className="text-xl font-semibold">Наличные</span>
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              className={cn(
                'w-full h-24 justify-start gap-5 rounded-2xl border-2',
                'border-kaspi/30 hover:border-kaspi hover:bg-kaspi/10',
                'transition-all duration-200'
              )}
              onClick={() => handleSinglePayment('kaspi')}
              disabled={isProcessing}
            >
              <div className="w-14 h-14 rounded-xl bg-kaspi/10 border border-kaspi/30 flex items-center justify-center">
                <Smartphone className="w-7 h-7 text-kaspi" />
              </div>
              <span className="text-xl font-semibold">Kaspi QR</span>
            </Button>
          </div>
        ) : (
          /* Split Payment */
          <div className="space-y-6">
            <div className="glass-card rounded-xl border border-success/20 p-5">
              <label className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                <Banknote className="w-4 h-4 text-success" />
                <span className="uppercase tracking-wider font-medium">Наличные</span>
              </label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="text-3xl h-16 font-mono pr-12 bg-transparent border-border/50 focus:border-success rounded-xl"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xl">₸</span>
              </div>
            </div>
            
            <div className="glass-card rounded-xl border border-kaspi/20 p-5">
              <label className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                <Smartphone className="w-4 h-4 text-kaspi" />
                <span className="uppercase tracking-wider font-medium">Kaspi QR</span>
              </label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0"
                  value={kaspiAmount}
                  onChange={(e) => setKaspiAmount(e.target.value)}
                  className="text-3xl h-16 font-mono pr-12 bg-transparent border-border/50 focus:border-kaspi rounded-xl"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xl">₸</span>
              </div>
            </div>

            <div className={cn(
              'p-5 rounded-xl text-center font-semibold text-lg',
              splitValid 
                ? 'bg-success/10 text-success border border-success/30' 
                : 'bg-muted/30 text-muted-foreground border border-border/50'
            )}>
              {splitValid ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  Сумма сходится
                </span>
              ) : splitDifference > 0 
                ? `Осталось: ${formatCurrency(splitDifference)}`
                : `Превышено: ${formatCurrency(Math.abs(splitDifference))}`
              }
            </div>

            <Button
              size="lg"
              className={cn(
                'w-full h-20 text-xl font-bold rounded-2xl',
                'bg-gradient-to-r from-primary to-secondary',
                'hover:shadow-glow-lg hover:scale-[1.01] transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              onClick={handleSplitPayment}
              disabled={!splitValid || isProcessing}
            >
              Подтвердить оплату
            </Button>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
