import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Package, Plus, Minus, AlertTriangle, History, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface InventoryItem {
  id: string;
  drink_id: string;
  quantity: number;
  unit: 'piece' | 'liter';
  min_threshold: number;
  updated_at: string;
  drink: { id: string; name: string; price: number } | null;
}

interface Movement {
  id: string;
  drink_id: string;
  quantity_change: number;
  type: 'intake' | 'sale' | 'write_off' | 'correction';
  reason: string | null;
  created_at: string;
  drink: { name: string } | null;
  performer: { name: string } | null;
}

const UNIT_LABELS: Record<string, string> = { piece: 'шт', liter: 'л' };
const TYPE_LABELS: Record<string, string> = {
  intake: 'Приход',
  sale: 'Продажа',
  write_off: 'Списание',
  correction: 'Коррекция',
};
const TYPE_COLORS: Record<string, string> = {
  intake: 'bg-success/20 text-success border-success/30',
  sale: 'bg-primary/20 text-primary border-primary/30',
  write_off: 'bg-destructive/20 text-destructive border-destructive/30',
  correction: 'bg-warning/20 text-warning border-warning/30',
};

export function AdminInventoryTab() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subTab, setSubTab] = useState<'stock' | 'log'>('stock');

  // Movement modal
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'intake' | 'write_off'>('intake');
  const [selectedDrinkId, setSelectedDrinkId] = useState('');
  const [movementQty, setMovementQty] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Settings modal
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsItem, setSettingsItem] = useState<InventoryItem | null>(null);
  const [settingsThreshold, setSettingsThreshold] = useState('');
  const [settingsUnit, setSettingsUnit] = useState<'piece' | 'liter'>('piece');

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getInventory();
      setInventory(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка загрузки склада');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const data = await apiClient.getInventoryMovements();
      setMovements(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка загрузки журнала');
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchMovements();
  }, []);

  const openMovementModal = (type: 'intake' | 'write_off') => {
    setMovementType(type);
    setSelectedDrinkId('');
    setMovementQty('');
    setMovementReason('');
    setMovementModalOpen(true);
  };

  const handleMovement = async () => {
    if (!selectedDrinkId || !movementQty || Number(movementQty) <= 0) {
      toast.error('Заполните все поля');
      return;
    }
    if (movementType === 'write_off' && !movementReason.trim()) {
      toast.error('Укажите причину списания');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.createInventoryMovement({
        drink_id: selectedDrinkId,
        quantity: Number(movementQty),
        type: movementType,
        reason: movementReason.trim() || undefined,
      });
      toast.success(movementType === 'intake' ? '📦 Приход оформлен' : '📝 Списание оформлено');
      setMovementModalOpen(false);
      fetchInventory();
      fetchMovements();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка');
    } finally {
      setIsSaving(false);
    }
  };

  const openSettings = (item: InventoryItem) => {
    setSettingsItem(item);
    setSettingsThreshold(String(item.min_threshold));
    setSettingsUnit(item.unit);
    setSettingsModalOpen(true);
  };

  const handleSaveSettings = async () => {
    if (!settingsItem) return;
    setIsSaving(true);
    try {
      await apiClient.updateInventoryItem(settingsItem.id, {
        min_threshold: Number(settingsThreshold) || 0,
        unit: settingsUnit,
      });
      toast.success('Настройки обновлены');
      setSettingsModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка');
    } finally {
      setIsSaving(false);
    }
  };

  const lowStockCount = inventory.filter(i => i.quantity <= i.min_threshold && i.min_threshold > 0).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Склад
          </h2>
          {lowStockCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              {lowStockCount} мало
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gap-1" onClick={() => openMovementModal('intake')}>
            <Plus className="w-4 h-4" />
            Приход
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-destructive hover:bg-destructive/10" onClick={() => openMovementModal('write_off')}>
            <Minus className="w-4 h-4" />
            Списание
          </Button>
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as 'stock' | 'log')}>
        <TabsList className="w-full">
          <TabsTrigger value="stock" className="flex-1 gap-2">
            <Package className="w-4 h-4" />
            Остатки
          </TabsTrigger>
          <TabsTrigger value="log" className="flex-1 gap-2">
            <History className="w-4 h-4" />
            Журнал
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4">
          {inventory.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                Нет данных на складе
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {inventory.map((item) => {
                const isLow = item.min_threshold > 0 && item.quantity <= item.min_threshold;
                const isZero = item.quantity <= 0;
                return (
                  <Card
                    key={item.id}
                    className={`transition-colors ${isZero ? 'border-destructive/50 bg-destructive/5' : isLow ? 'border-warning/50 bg-warning/5' : 'hover:border-primary/30'}`}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{item.drink?.name || '—'}</h3>
                          {item.drink && (
                            <span className="text-xs text-muted-foreground">{formatCurrency(item.drink.price)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>Мин: {item.min_threshold} {UNIT_LABELS[item.unit]}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`text-2xl font-bold tabular-nums ${isZero ? 'text-destructive' : isLow ? 'text-warning' : 'text-foreground'}`}>
                          {Number(item.quantity)}
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            {UNIT_LABELS[item.unit]}
                          </span>
                        </div>

                        {(isLow || isZero) && (
                          <AlertTriangle className={`w-5 h-5 ${isZero ? 'text-destructive' : 'text-warning'}`} />
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openSettings(item)}
                        >
                          <Settings2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          {movements.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                Нет записей в журнале
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {movements.map((mov) => (
                <Card key={mov.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Badge variant="outline" className={TYPE_COLORS[mov.type]}>
                      {TYPE_LABELS[mov.type]}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{mov.drink?.name || '—'}</span>
                      {mov.reason && (
                        <p className="text-xs text-muted-foreground truncate">{mov.reason}</p>
                      )}
                    </div>
                    <span className={`font-bold tabular-nums ${mov.quantity_change > 0 ? 'text-success' : 'text-destructive'}`}>
                      {mov.quantity_change > 0 ? '+' : ''}{Number(mov.quantity_change)}
                    </span>
                    <div className="text-xs text-muted-foreground text-right min-w-[80px]">
                      <div>{new Date(mov.created_at).toLocaleDateString('ru')}</div>
                      <div>{new Date(mov.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</div>
                      {mov.performer?.name && <div className="text-primary/70">{mov.performer.name}</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Movement Modal */}
      <Dialog open={movementModalOpen} onOpenChange={setMovementModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {movementType === 'intake' ? '📦 Оприходование' : '📝 Списание'}
            </DialogTitle>
            <DialogDescription>
              {movementType === 'intake' ? 'Добавить товар на склад' : 'Списать товар со склада'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Напиток</Label>
              <Select value={selectedDrinkId} onValueChange={setSelectedDrinkId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите напиток" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.drink_id} value={item.drink_id}>
                      {item.drink?.name || '—'} (остаток: {Number(item.quantity)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Количество</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={movementQty}
                onChange={(e) => setMovementQty(e.target.value)}
                placeholder="0"
              />
            </div>

            {movementType === 'write_off' && (
              <div>
                <Label>Причина *</Label>
                <Textarea
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="Бой, просрочка, угощение..."
                  rows={2}
                />
              </div>
            )}

            {movementType === 'intake' && (
              <div>
                <Label>Комментарий</Label>
                <Textarea
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="Поставка от..."
                  rows={2}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleMovement} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {movementType === 'intake' ? 'Оприходовать' : 'Списать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>⚙ Настройки: {settingsItem?.drink?.name}</DialogTitle>
            <DialogDescription>Единица измерения и порог оповещения</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Единица измерения</Label>
              <Select value={settingsUnit} onValueChange={(v) => setSettingsUnit(v as 'piece' | 'liter')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece">Штуки (шт)</SelectItem>
                  <SelectItem value="liter">Литры (л)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Минимальный остаток (порог)</Label>
              <Input
                type="number"
                min="0"
                value={settingsThreshold}
                onChange={(e) => setSettingsThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                При достижении этого значения появится предупреждение
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
