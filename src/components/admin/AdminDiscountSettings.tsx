import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Loader2, Percent, Users, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface DiscountPreset {
  id: string;
  percent: number;
  is_active: boolean;
}

interface CashierWithDiscount {
  id: string;
  name: string;
  pin: string;
  max_discount_percent: number;
}

export function AdminDiscountSettings() {
  const [presets, setPresets] = useState<DiscountPreset[]>([]);
  const [cashiers, setCashiers] = useState<CashierWithDiscount[]>([]);
  const [newPresetPercent, setNewPresetPercent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingCashierId, setSavingCashierId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [presetsData, cashiersData] = await Promise.all([
        apiClient.getAdminDiscountPresets(),
        apiClient.getCashiers(),
      ]);
      setPresets(presetsData || []);
      // Filter out admin accounts from cashier discount settings
      setCashiers(cashiersData || []);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddPreset = async () => {
    const percent = parseInt(newPresetPercent);
    if (isNaN(percent) || percent < 1 || percent > 100) {
      toast.error('Введите процент от 1 до 100');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.createDiscountPreset(percent);
      setNewPresetPercent('');
      toast.success(`Пресет ${percent}% добавлен`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка добавления пресета');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePreset = async (id: string, percent: number) => {
    try {
      await apiClient.deleteDiscountPreset(id);
      toast.success(`Пресет ${percent}% удалён`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка удаления');
    }
  };

  const handleUpdateCashierDiscount = async (cashierId: string, maxPercent: number) => {
    setSavingCashierId(cashierId);
    try {
      await apiClient.updateCashierDiscount(cashierId, maxPercent);
      setCashiers(prev =>
        prev.map(c => c.id === cashierId ? { ...c, max_discount_percent: maxPercent } : c)
      );
      toast.success('Лимит скидки обновлён');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка обновления');
    } finally {
      setSavingCashierId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Discount Presets Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="w-5 h-5 text-primary" />
            Кнопки скидок
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Определите предустановленные кнопки скидок, которые кассиры будут видеть на экране пре-чека
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing presets */}
          <div className="flex flex-wrap gap-2">
            {presets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет пресетов. Добавьте первый!</p>
            ) : (
              presets.map(preset => (
                <div
                  key={preset.id}
                  className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2"
                >
                  <Percent className="w-3.5 h-3.5 text-primary" />
                  <span className="font-semibold text-primary">{preset.percent}%</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-1 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeletePreset(preset.id, preset.percent)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Add new preset */}
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-[200px]">
              <Input
                type="number"
                min={1}
                max={100}
                placeholder="Процент"
                value={newPresetPercent}
                onChange={(e) => setNewPresetPercent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPreset()}
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            <Button onClick={handleAddPreset} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Добавить
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Per-Cashier Discount Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-primary" />
            Лимиты скидок для кассиров
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Установите максимальный процент скидки, который каждый кассир может применять.
            Кассир увидит только те кнопки скидок, которые не превышают его лимит.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {cashiers.map(cashier => (
            <div key={cashier.id} className="space-y-2 p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {cashier.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-medium">{cashier.name}</span>
                </div>
                <span className="text-lg font-bold text-primary tabular-nums">
                  {savingCashierId === cashier.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `${cashier.max_discount_percent}%`
                  )}
                </span>
              </div>
              <Slider
                value={[cashier.max_discount_percent]}
                onValueCommit={(value) => handleUpdateCashierDiscount(cashier.id, value[0])}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
