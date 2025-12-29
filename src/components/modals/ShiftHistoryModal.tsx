import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatTime, formatDuration } from '@/lib/utils';
import { 
  Receipt, 
  Clock, 
  Coffee, 
  Gamepad2, 
  Banknote, 
  Smartphone, 
  CreditCard,
  MonitorPlay
} from 'lucide-react';
import type { Session, DrinkSale, Station, Drink, ControllerUsage } from '@/types/database';

interface ShiftHistoryModalProps {
  open: boolean;
  onClose: () => void;
}

interface PaidSession {
  id: string;
  station_id: string;
  shift_id: string;
  tariff_type: 'hourly' | 'package';
  started_at: string;
  ended_at?: string | null;
  status: 'active' | 'completed';
  game_cost: number | null;
  controller_cost: number | null;
  drink_cost: number | null;
  total_cost: number | null;
  created_at: string;
  station?: {
    id: string;
    name: string;
    zone: string;
    station_number: number;
    hourly_rate: number;
    package_rate: number;
  };
  controllers?: ControllerUsage[];
  drinks_count?: number;
  payment_method?: 'cash' | 'kaspi' | 'split';
  cash_amount?: number;
  kaspi_amount?: number;
}

interface PaidDrinkSale extends DrinkSale {
  drink?: Drink;
}

type FilterTab = 'all' | 'sessions' | 'drinks';

export function ShiftHistoryModal({ open, onClose }: ShiftHistoryModalProps) {
  const { shift } = useAuth();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sessions, setSessions] = useState<PaidSession[]>([]);
  const [drinkSales, setDrinkSales] = useState<PaidDrinkSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open && shift) {
      fetchHistory();
    }
  }, [open, shift]);

  const fetchHistory = async () => {
    if (!shift) return;
    setIsLoading(true);

    try {
      // Fetch paid sessions with station info
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select(`
          *,
          station:stations(*)
        `)
        .eq('shift_id', shift.id)
        .eq('status', 'completed')
        .order('ended_at', { ascending: false });

      // Fetch session details (controllers, drinks, payment)
      const sessionsWithDetails = await Promise.all(
        (sessionsData || []).map(async (session) => {
          // Get controllers
          const { data: controllers } = await supabase
            .from('controller_usage')
            .select('*')
            .eq('session_id', session.id);

          // Get drinks count
          const { count: drinksCount } = await supabase
            .from('session_drinks')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

          // Get payment info
          const { data: payment } = await supabase
            .from('payments')
            .select('payment_method, cash_amount, kaspi_amount')
            .eq('session_id', session.id)
            .maybeSingle();
          
          return {
            ...session,
            controllers: controllers || [],
            drinks_count: drinksCount || 0,
            payment_method: payment?.payment_method || 'cash',
            cash_amount: payment?.cash_amount || 0,
            kaspi_amount: payment?.kaspi_amount || 0
          } as PaidSession;
        })
      );

      // Fetch standalone drink sales
      const { data: drinkSalesData } = await supabase
        .from('drink_sales')
        .select(`
          *,
          drink:drinks(*)
        `)
        .eq('shift_id', shift.id)
        .order('created_at', { ascending: false });

      setSessions(sessionsWithDetails || []);
      setDrinkSales(drinkSalesData || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="w-4 h-4 text-cash" />;
      case 'kaspi':
        return <Smartphone className="w-4 h-4 text-kaspi" />;
      case 'split':
        return <CreditCard className="w-4 h-4 text-primary" />;
      default:
        return null;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Наличные';
      case 'kaspi':
        return 'Kaspi';
      case 'split':
        return 'Сплит';
      default:
        return method;
    }
  };

  const getTariffLabel = (tariff: string) => {
    return tariff === 'package' ? 'Пакет 2+1' : 'Почасовой';
  };

  // Combine and sort items for "all" tab
  const getAllItems = () => {
    const sessionItems = sessions.map(s => ({
      type: 'session' as const,
      data: s,
      timestamp: new Date(s.ended_at || s.created_at)
    }));

    const drinkItems = drinkSales.map(d => ({
      type: 'drink' as const,
      data: d,
      timestamp: new Date(d.created_at)
    }));

    return [...sessionItems, ...drinkItems].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  };

  const renderSessionCard = (session: PaidSession) => {
    const station = session.station;
    const startTime = new Date(session.started_at);
    const endTime = session.ended_at ? new Date(session.ended_at) : new Date();
    const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
    const controllerCount = session.controllers?.length || 0;

    return (
      <div 
        key={session.id}
        className="glass-card rounded-xl p-4 border border-primary/20 space-y-3 animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <MonitorPlay className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {station?.name || 'Станция'}
              </p>
              <p className="text-xs text-muted-foreground">
                {station?.zone === 'vip' ? '👑 VIP' : '🎮 Зал'} • {getTariffLabel(session.tariff_type)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary text-glow-cyan">
              {formatCurrency(session.total_cost || 0)}
            </p>
          </div>
        </div>

        {/* Time info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{formatTime(startTime)} — {formatTime(endTime)}</span>
          <span className="text-primary">({formatDuration(durationMinutes)})</span>
        </div>

        {/* Details */}
        <div className="flex flex-wrap gap-3 text-sm">
          {controllerCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/20 border border-secondary/30">
              <Gamepad2 className="w-3.5 h-3.5 text-secondary" />
              <span className="text-foreground">{controllerCount} джойстик(а)</span>
            </div>
          )}
          {(session.drinks_count || 0) > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30">
              <Coffee className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-foreground">{session.drinks_count} напиток(ов)</span>
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            {getPaymentMethodIcon(session.payment_method || 'cash')}
            <span className="text-sm text-muted-foreground">
              {getPaymentMethodLabel(session.payment_method || 'cash')}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Игра: {formatCurrency(session.game_cost || 0)} • 
            Джойстики: {formatCurrency(session.controller_cost || 0)} • 
            Напитки: {formatCurrency(session.drink_cost || 0)}
          </div>
        </div>
      </div>
    );
  };

  const renderDrinkCard = (sale: PaidDrinkSale) => {
    const saleTime = new Date(sale.created_at);

    return (
      <div 
        key={sale.id}
        className="glass-card rounded-xl p-4 border border-amber-500/20 space-y-3 animate-fade-in"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Coffee className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {sale.drink?.name || 'Напиток'}
              </p>
              <p className="text-xs text-muted-foreground">
                Количество: {sale.quantity}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-amber-500">
              {formatCurrency(sale.total_price)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            {getPaymentMethodIcon(sale.payment_method)}
            <span className="text-sm text-muted-foreground">
              {getPaymentMethodLabel(sale.payment_method)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(saleTime)}</span>
          </div>
        </div>
      </div>
    );
  };

  // Calculate totals from shift data
  const totals = {
    games: shift?.total_games || 0,
    controllers: shift?.total_controllers || 0,
    drinks: shift?.total_drinks || 0,
    cash: shift?.total_cash || 0,
    kaspi: shift?.total_kaspi || 0,
    total: (shift?.total_cash || 0) + (shift?.total_kaspi || 0)
  };

  const allItems = getAllItems();
  const hasNoData = sessions.length === 0 && drinkSales.length === 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col glass-card border-primary/20 p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Receipt className="w-5 h-5 text-primary" />
            История смены
          </DialogTitle>
        </DialogHeader>

        {/* Filter Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-4 glass-card border border-primary/20 shrink-0">
            <TabsTrigger value="all" className="flex-1 data-[state=active]:bg-primary/20">
              Все
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex-1 data-[state=active]:bg-primary/20">
              Сессии
            </TabsTrigger>
            <TabsTrigger value="drinks" className="flex-1 data-[state=active]:bg-primary/20">
              Напитки
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : hasNoData ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Receipt className="w-12 h-12 mb-3 opacity-50" />
                <p>Нет оплаченных операций</p>
              </div>
            ) : (
              <>
                <TabsContent value="all" className="mt-0 space-y-3">
                  {allItems.map((item, idx) => (
                    item.type === 'session' 
                      ? renderSessionCard(item.data as PaidSession)
                      : renderDrinkCard(item.data as PaidDrinkSale)
                  ))}
                </TabsContent>

                <TabsContent value="sessions" className="mt-0 space-y-3">
                  {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <MonitorPlay className="w-12 h-12 mb-3 opacity-50" />
                      <p>Нет завершённых сессий</p>
                    </div>
                  ) : (
                    sessions.map(renderSessionCard)
                  )}
                </TabsContent>

                <TabsContent value="drinks" className="mt-0 space-y-3">
                  {drinkSales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Coffee className="w-12 h-12 mb-3 opacity-50" />
                      <p>Нет продаж напитков</p>
                    </div>
                  ) : (
                    drinkSales.map(renderDrinkCard)
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        {/* Sticky Totals Footer */}
        <div className="border-t border-primary/20 bg-background/80 backdrop-blur-xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground">Игры</p>
              <p className="font-semibold text-primary">{formatCurrency(totals.games)}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-secondary/10 border border-secondary/20">
              <p className="text-xs text-muted-foreground">Джойстики</p>
              <p className="font-semibold text-secondary">{formatCurrency(totals.controllers)}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-muted-foreground">Напитки</p>
              <p className="font-semibold text-amber-500">{formatCurrency(totals.drinks)}</p>
            </div>
          </div>

          <Separator className="bg-border/50" />

          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-cash" />
                <span className="font-semibold text-cash">{formatCurrency(totals.cash)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-kaspi" />
                <span className="font-semibold text-kaspi">{formatCurrency(totals.kaspi)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">ИТОГО</p>
              <p className="text-2xl font-bold text-primary text-glow-cyan">{formatCurrency(totals.total)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
