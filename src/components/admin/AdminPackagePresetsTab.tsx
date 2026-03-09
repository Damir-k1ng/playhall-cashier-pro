import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, Clock, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface PackagePreset {
  id: string;
  name: string;
  duration_hours: number;
  price: number;
  is_active: boolean;
  created_at: string;
}

export function AdminPackagePresetsTab() {
  const [presets, setPresets] = useState<PackagePreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<PackagePreset | null>(null);

  const [formName, setFormName] = useState('');
  const [formDuration, setFormDuration] = useState('3');
  const [formPrice, setFormPrice] = useState('');
  const [formError, setFormError] = useState('');

  const fetchPresets = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getPackagePresets();
      setPresets(data || []);
    } catch (e: any) {
      toast.error(e.message || 'Ошибка загрузки');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPresets(); }, []);

  const openCreate = () => {
    setSelected(null);
    setFormName('');
    setFormDuration('3');
    setFormPrice('');
    setFormError('');
    setEditModalOpen(true);
  };

  const openEdit = (p: PackagePreset) => {
    setSelected(p);
    setFormName(p.name);
    setFormDuration(String(p.duration_hours));
    setFormPrice(String(p.price));
    setFormError('');
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { setFormError('Введите название'); return; }
    const dur = parseInt(formDuration);
    if (isNaN(dur) || dur < 1) { setFormError('Длительность ≥ 1 час'); return; }
    const price = parseInt(formPrice);
    if (isNaN(price) || price < 0) { setFormError('Укажите цену'); return; }

    setIsSaving(true);
    try {
      if (selected) {
        await apiClient.updatePackagePreset(selected.id, { name: formName.trim(), duration_hours: dur, price });
        toast.success('Пакет обновлён');
      } else {
        await apiClient.createPackagePreset({ name: formName.trim(), duration_hours: dur, price });
        toast.success('Пакет создан');
      }
      setEditModalOpen(false);
      fetchPresets();
    } catch (e: any) {
      setFormError(e.message || 'Ошибка');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (p: PackagePreset) => {
    try {
      await apiClient.updatePackagePreset(p.id, { is_active: !p.is_active });
      setPresets(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
    } catch (e: any) {
      toast.error(e.message || 'Ошибка');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await apiClient.deletePackagePreset(selected.id);
      toast.success('Пакет удалён');
      setDeleteDialogOpen(false);
      fetchPresets();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка удаления');
    } finally {
      setIsSaving(false);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Пакетные пресеты</h2>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Добавить
        </Button>
      </div>

      {presets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Timer className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">Нет пакетных пресетов</p>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              Создать первый пакет
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {presets.map((p) => (
            <Card key={p.id} className={`transition-colors ${p.is_active ? 'hover:border-primary/30' : 'opacity-60'}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{p.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {p.duration_hours} ч · {p.price.toLocaleString()} ₸
                  </p>
                </div>
                <Switch checked={p.is_active} onCheckedChange={() => handleToggleActive(p)} />
                <Button variant="outline" size="icon" onClick={() => openEdit(p)} className="h-9 w-9">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => { setSelected(p); setDeleteDialogOpen(true); }}
                  className="h-9 w-9 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selected ? 'Редактировать пакет' : 'Новый пакет'}</DialogTitle>
            <DialogDescription>
              {selected ? 'Измените параметры пакета' : 'Укажите название, длительность и цену'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={formName} onChange={(e) => { setFormName(e.target.value); setFormError(''); }} placeholder="Напр. 2+1" />
            </div>
            <div className="space-y-2">
              <Label>Длительность (часов)</Label>
              <Input type="number" min="1" value={formDuration} onChange={(e) => { setFormDuration(e.target.value); setFormError(''); }} />
            </div>
            <div className="space-y-2">
              <Label>Цена (₸)</Label>
              <Input type="number" min="0" value={formPrice} onChange={(e) => { setFormPrice(e.target.value); setFormError(''); }} placeholder="5000" />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={isSaving}>Отмена</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Сохранение...</> : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пакет?</AlertDialogTitle>
            <AlertDialogDescription>
              Удалить пакет "{selected?.name}"? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSaving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
