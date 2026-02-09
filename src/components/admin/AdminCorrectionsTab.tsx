import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Trash2, 
  Edit3, 
  Monitor, 
  Coffee, 
  Clock, 
  History,
  AlertTriangle,
  Banknote,
  Smartphone
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatTimeFromISO, formatDate } from '@/lib/utils';
import { EditSessionModal } from './EditSessionModal';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { useToast } from '@/hooks/use-toast';

interface CompletedSession {
  id: string;
  station_id: string;
  station_name: string;
  station_zone: string;
  shift_id: string;
  cashier_id: string;
  cashier_name: string;
  tariff_type: 'hourly' | 'package';
  package_count: number;
  started_at: string;
  ended_at: string;
  game_cost: number;
  controller_cost: number;
  drink_cost: number;
  total_cost: number;
  payment: {
    payment_method: 'cash' | 'kaspi' | 'split';
    cash_amount: number;
    kaspi_amount: number;
    total_amount: number;
  } | null;
  controllers: Array<{
    id: string;
    taken_at: string;
    returned_at: string;
    cost: number;
  }>;
}

interface DrinkSale {
  id: string;
  shift_id: string;
  cashier_name: string;
  drink_id: string;
  drink_name: string;
  quantity: number;
  total_price: number;
  payment_method: 'cash' | 'kaspi' | 'split';
  cash_amount: number;
  kaspi_amount: number;
  created_at: string;
}

interface AuditLogEntry {
  id: string;
  admin_id: string;
  admin_name: string;
  action_type: 'edit_session' | 'delete_session' | 'delete_drink_sale' | 'edit_controller';
  target_type: string;
  target_id: string;
  shift_id: string;
  cashier_name: string;
  station_name: string | null;
  old_values: Record<string, any>;
  new_values: Record<string, any> | null;
  reason: string;
  created_at: string;
}

export function AdminCorrectionsTab() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('sessions');
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [drinkSales, setDrinkSales] = useState<DrinkSale[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  // Modals
  const [editSession, setEditSession] = useState<CompletedSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'session' | 'drink_sale'; item: CompletedSession | DrinkSale } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [sessionsData, salesData, logsData] = await Promise.all([
        apiClient.getCompletedSessions(),
        apiClient.getDrinkSales(),
        apiClient.getAuditLog()
      ]);
      setSessions(sessionsData || []);
      setDrinkSales(salesData || []);
      setAuditLog(logsData || []);
    } catch (error) {
      console.error('Error fetching corrections data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, reason: string) => {
    try {
      await apiClient.deleteSession(sessionId, reason);
      toast({
        title: 'Сессия удалена',
        description: 'Данные кассы обновлены'
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить сессию',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteDrinkSale = async (saleId: string, reason: string) => {
    try {
      await apiClient.deleteDrinkSale(saleId, reason);
      toast({
        title: 'Продажа удалена',
        description: 'Данные кассы обновлены'
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить продажу',
        variant: 'destructive'
      });
    }
  };

  const handleEditSuccess = () => {
    toast({
      title: 'Сессия обновлена',
      description: 'Данные кассы обновлены'
    });
    fetchData();
    setEditSession(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 glass-card border border-primary/20">
          <TabsTrigger value="sessions" className="gap-2">
            <Monitor className="h-4 w-4" />
            Сессии
          </TabsTrigger>
          <TabsTrigger value="drinks" className="gap-2">
            <Coffee className="h-4 w-4" />
            Напитки
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-2">
            <History className="h-4 w-4" />
            Журнал
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-4">
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Закрытые сессии (последние 7 дней)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {sessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Нет закрытых сессий</p>
                ) : (
                  <div className="space-y-3">
                    {sessions.map(session => (
                      <div
                        key={session.id}
                        className="p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{session.station_name}</span>
                              <Badge variant="outline" className="text-xs">
                                {session.tariff_type === 'package' ? `Пакет ×${session.package_count}` : 'Почасовой'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-4 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTimeFromISO(session.started_at)} → {formatTimeFromISO(session.ended_at)}
                              </span>
                              <span>👤 {session.cashier_name}</span>
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-sm">
                              <span>🎮 {formatCurrency(session.game_cost)}</span>
                              {session.controller_cost > 0 && (
                                <span>🕹️ {formatCurrency(session.controller_cost)}</span>
                              )}
                              {session.drink_cost > 0 && (
                                <span>🥤 {formatCurrency(session.drink_cost)}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-lg">{formatCurrency(session.total_cost)}</div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {session.payment?.payment_method === 'cash' && (
                                <><Banknote className="h-3 w-3 text-cash" /> Cash</>
                              )}
                              {session.payment?.payment_method === 'kaspi' && (
                                <><Smartphone className="h-3 w-3 text-kaspi" /> Kaspi</>
                              )}
                              {session.payment?.payment_method === 'split' && (
                                <>Split</>
                              )}
                            </div>
                            <div className="flex gap-1 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2"
                                onClick={() => setEditSession(session)}
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget({ type: 'session', item: session })}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drinks" className="mt-4">
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Coffee className="h-4 w-4 text-amber-500" />
                Продажи напитков (последние 7 дней)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {drinkSales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Нет продаж напитков</p>
                ) : (
                  <div className="space-y-2">
                    {drinkSales.map(sale => (
                      <div
                        key={sale.id}
                        className="p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-amber-500/30 transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{sale.drink_name}</span>
                            {sale.quantity > 1 && (
                              <Badge variant="secondary" className="text-xs">×{sale.quantity}</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-4">
                            <span>{formatTimeFromISO(sale.created_at)}</span>
                            <span>👤 {sale.cashier_name}</span>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <div className="font-bold">{formatCurrency(sale.total_price)}</div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {sale.payment_method === 'cash' && <><Banknote className="h-3 w-3 text-cash" /> Cash</>}
                              {sale.payment_method === 'kaspi' && <><Smartphone className="h-3 w-3 text-kaspi" /> Kaspi</>}
                              {sale.payment_method === 'split' && <>Split</>}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget({ type: 'drink_sale', item: sale })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-purple-400" />
                Журнал корректировок (последние 30 дней)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {auditLog.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Нет записей</p>
                ) : (
                  <div className="space-y-4">
                    {auditLog.map(entry => (
                      <div
                        key={entry.id}
                        className="p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={entry.action_type.includes('delete') ? 'destructive' : 'default'}
                              className="text-xs"
                            >
                              {entry.action_type === 'edit_session' && '✏️ Редактирование'}
                              {entry.action_type === 'delete_session' && '🗑️ Удаление сессии'}
                              {entry.action_type === 'delete_drink_sale' && '🗑️ Удаление напитка'}
                              {entry.action_type === 'edit_controller' && '✏️ Джойстики'}
                            </Badge>
                            {entry.station_name && (
                              <span className="text-sm font-medium">{entry.station_name}</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(new Date(entry.created_at))} {formatTimeFromISO(entry.created_at)}
                          </span>
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-2">
                          👤 Админ: <span className="text-foreground">{entry.admin_name}</span>
                          {entry.cashier_name && (
                            <> • Кассир смены: <span className="text-foreground">{entry.cashier_name}</span></>
                          )}
                        </div>

                        {entry.old_values && (
                          <div className="text-xs bg-muted/50 rounded p-2 mb-2">
                            {entry.action_type === 'edit_session' && entry.new_values && (
                              <div className="grid grid-cols-3 gap-2">
                                <div className="text-muted-foreground">Поле</div>
                                <div className="text-muted-foreground">Было</div>
                                <div className="text-muted-foreground">Стало</div>
                                {Object.keys(entry.old_values).filter(k => 
                                  entry.old_values[k] !== entry.new_values?.[k]
                                ).map(key => (
                                  <React.Fragment key={key}>
                                    <div>{key}</div>
                                    <div className="text-red-400">{formatValue(entry.old_values[key])}</div>
                                    <div className="text-green-400">{formatValue(entry.new_values?.[key])}</div>
                                  </React.Fragment>
                                ))}
                              </div>
                            )}
                            {entry.action_type.includes('delete') && (
                              <div className="space-y-1">
                                {Object.entries(entry.old_values).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-muted-foreground">{key}:</span>
                                    <span>{formatValue(value)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="text-sm">
                          <span className="text-muted-foreground">Причина:</span>{' '}
                          <span className="italic">"{entry.reason}"</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Session Modal */}
      {editSession && (
        <EditSessionModal
          session={editSession}
          open={!!editSession}
          onClose={() => setEditSession(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <DeleteConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={(reason) => {
            if (deleteTarget.type === 'session') {
              handleDeleteSession((deleteTarget.item as CompletedSession).id, reason);
            } else {
              handleDeleteDrinkSale((deleteTarget.item as DrinkSale).id, reason);
            }
            setDeleteTarget(null);
          }}
          title={deleteTarget.type === 'session' ? 'Удаление сессии' : 'Удаление продажи напитка'}
          description={
            deleteTarget.type === 'session'
              ? `Сессия ${(deleteTarget.item as CompletedSession).station_name} на сумму ${formatCurrency((deleteTarget.item as CompletedSession).total_cost)} будет удалена. Сумма будет вычтена из кассы.`
              : `Продажа ${(deleteTarget.item as DrinkSale).drink_name} на сумму ${formatCurrency((deleteTarget.item as DrinkSale).total_price)} будет удалена. Сумма будет вычтена из кассы.`
          }
        />
      )}
    </div>
  );
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return formatCurrency(value);
  if (typeof value === 'string' && value.includes('T')) {
    try {
      return formatTimeFromISO(value);
    } catch {
      return value;
    }
  }
  return String(value);
}
