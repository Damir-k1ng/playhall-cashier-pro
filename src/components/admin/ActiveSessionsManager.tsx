import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Clock, GamepadIcon, Gamepad2, Coffee, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface ActiveSession {
  id: string;
  station_id: string;
  shift_id: string;
  tariff_type: 'hourly' | 'package';
  started_at: string;
  cashier_name: string;
  shift_is_active: boolean;
  elapsed_minutes: number;
  game_cost: number;
  controller_cost: number;
  drink_cost: number;
  total_cost: number;
  controllers_count: number;
  station?: {
    id: string;
    name: string;
    zone: string;
    station_number: number;
  };
}

export function ActiveSessionsManager() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Force close modal state
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'kaspi' | 'split'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [kaspiAmount, setKaspiAmount] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const fetchSessions = async (showRefreshState = false) => {
    try {
      if (showRefreshState) setIsRefreshing(true);
      else setIsLoading(true);
      
      const data = await apiClient.getActiveSessions();
      setSessions(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка загрузки сессий');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchSessions(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const openCloseModal = (session: ActiveSession) => {
    setSelectedSession(session);
    setPaymentMethod('cash');
    setCashAmount('');
    setKaspiAmount('');
    setCloseModalOpen(true);
  };

  const handleForceClose = async () => {
    if (!selectedSession) return;

    // Validate split payment
    if (paymentMethod === 'split') {
      const cash = parseInt(cashAmount) || 0;
      const kaspi = parseInt(kaspiAmount) || 0;
      if (cash + kaspi !== selectedSession.total_cost) {
        toast.error(`Сумма должна равняться ${selectedSession.total_cost.toLocaleString()} ₸`);
        return;
      }
    }

    setIsClosing(true);
    try {
      await apiClient.forceCloseSession({
        session_id: selectedSession.id,
        payment_method: paymentMethod,
        cash_amount: paymentMethod === 'split' ? parseInt(cashAmount) || 0 : undefined,
        kaspi_amount: paymentMethod === 'split' ? parseInt(kaspiAmount) || 0 : undefined,
      });

      toast.success('Сессия принудительно закрыта');
      setCloseModalOpen(false);
      fetchSessions();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка закрытия сессии');
    } finally {
      setIsClosing(false);
    }
  };


  // Separate orphaned sessions (shift ended) from active ones
  const orphanedSessions = sessions.filter(s => !s.shift_is_active);
  const activeSessions = sessions.filter(s => s.shift_is_active);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Активные сессии</h2>
          <p className="text-sm text-muted-foreground">
            Всего: {sessions.length} | Осиротевших: {orphanedSessions.length}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchSessions(true)}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Orphaned Sessions Warning */}
      {orphanedSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Осиротевшие сессии (смена завершена)</span>
          </div>
          
          <div className="grid gap-3">
            {orphanedSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isOrphaned
                onForceClose={() => openCloseModal(session)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="space-y-3">
          {orphanedSessions.length > 0 && (
            <h3 className="font-medium text-muted-foreground">Обычные активные сессии</h3>
          )}
          
          <div className="grid gap-3">
            {activeSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isOrphaned={false}
                onForceClose={() => openCloseModal(session)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {sessions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <GamepadIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Нет активных сессий</p>
          </CardContent>
        </Card>
      )}

      {/* Force Close Modal */}
      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Принудительное закрытие
            </DialogTitle>
            <DialogDescription>
              Закрыть сессию на {selectedSession?.station?.name} и записать оплату кассиру{' '}
              <strong>{selectedSession?.cashier_name}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-4 py-4">
              {/* Session Info */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Игра:</span>
                  <span>{selectedSession.game_cost.toLocaleString()} ₸</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Джойстики:</span>
                  <span>{selectedSession.controller_cost.toLocaleString()} ₸</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Напитки:</span>
                  <span>{selectedSession.drink_cost.toLocaleString()} ₸</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-border pt-2">
                  <span>Итого:</span>
                  <span className="text-primary">{selectedSession.total_cost.toLocaleString()} ₸</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Способ оплаты</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Наличные</SelectItem>
                    <SelectItem value="kaspi">Kaspi</SelectItem>
                    <SelectItem value="split">Разделить</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Split Payment Inputs */}
              {paymentMethod === 'split' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Наличные</Label>
                    <Input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kaspi</Label>
                    <Input
                      type="number"
                      value={kaspiAmount}
                      onChange={(e) => setKaspiAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseModalOpen(false)} disabled={isClosing}>
              Отмена
            </Button>
            <Button 
              onClick={handleForceClose} 
              disabled={isClosing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isClosing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Закрытие...
                </>
              ) : (
                'Закрыть сессию'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Session Card Component
function SessionCard({ 
  session, 
  isOrphaned, 
  onForceClose 
}: { 
  session: ActiveSession; 
  isOrphaned: boolean; 
  onForceClose: () => void;
}) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}ч ${mins}мин`;
    }
    return `${mins}мин`;
  };

  return (
    <Card className={`${isOrphaned ? 'border-warning/50 bg-warning/5' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Station Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{session.station?.name || 'Station'}</h3>
              <Badge variant={session.tariff_type === 'package' ? 'default' : 'secondary'}>
                {session.tariff_type === 'package' ? 'Пакет' : 'Почасовой'}
              </Badge>
              {isOrphaned && (
                <Badge variant="outline" className="text-warning border-warning/50">
                  Смена закрыта
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mt-1">
              Кассир: <strong>{session.cashier_name}</strong>
            </p>
            
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(session.elapsed_minutes)}
              </span>
              {session.controllers_count > 0 && (
                <span className="flex items-center gap-1">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  {session.controllers_count}
                </span>
              )}
              {session.drink_cost > 0 && (
                <span className="flex items-center gap-1">
                  <Coffee className="w-3.5 h-3.5" />
                  {session.drink_cost.toLocaleString()} ₸
                </span>
              )}
            </div>
          </div>

          {/* Cost & Action */}
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-primary">
              {session.total_cost.toLocaleString()} ₸
            </div>
            <Button
              size="sm"
              variant={isOrphaned ? 'destructive' : 'outline'}
              onClick={onForceClose}
              className="mt-2 gap-1"
            >
              <XCircle className="w-4 h-4" />
              Закрыть
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
