import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface Station {
  id: string;
  name: string;
  zone: string;
  station_number: number;
  hourly_rate: number;
  package_rate: number;
}

export function AdminStationsTab() {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Station | null>(null);

  // Form
  const [name, setName] = useState('');
  const [zone, setZone] = useState<string>('hall');
  const [stationNumber, setStationNumber] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [packageRate, setPackageRate] = useState('');
  const [formError, setFormError] = useState('');

  const fetchStations = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getAdminStations();
      setStations(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка загрузки станций');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchStations(); }, []);

  const openCreate = () => {
    setSelected(null);
    const nextNum = stations.length > 0 ? Math.max(...stations.map(s => s.station_number)) + 1 : 1;
    setName('');
    setZone('hall');
    setStationNumber(String(nextNum));
    setHourlyRate('1500');
    setPackageRate('3000');
    setFormError('');
    setEditModalOpen(true);
  };

  const openEdit = (s: Station) => {
    setSelected(s);
    setName(s.name);
    setZone(s.zone);
    setStationNumber(String(s.station_number));
    setHourlyRate(String(s.hourly_rate));
    setPackageRate(String(s.package_rate));
    setFormError('');
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    const num = parseInt(stationNumber);
    const hr = parseInt(hourlyRate);
    const pr = parseInt(packageRate);
    if (!name.trim()) { setFormError('Введите название'); return; }
    if (isNaN(num) || num < 1) { setFormError('Неверный номер станции'); return; }
    if (isNaN(hr) || hr < 0) { setFormError('Неверная почасовая ставка'); return; }
    if (isNaN(pr) || pr < 0) { setFormError('Неверная пакетная ставка'); return; }

    setIsSaving(true);
    setFormError('');
    try {
      if (selected) {
        await apiClient.updateStation(selected.id, { name: name.trim(), zone, station_number: num, hourly_rate: hr, package_rate: pr });
        toast.success('Станция обновлена');
      } else {
        await apiClient.createStation({ name: name.trim(), zone, station_number: num, hourly_rate: hr, package_rate: pr });
        toast.success('Станция создана');
      }
      setEditModalOpen(false);
      fetchStations();
    } catch (err: any) {
      setFormError(err.message || 'Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await apiClient.deleteStation(selected.id);
      toast.success('Станция удалена');
      setDeleteDialogOpen(false);
      fetchStations();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка удаления');
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
        <h2 className="text-lg font-semibold">Станции ({stations.length})</h2>
        <Button onClick={openCreate} className="gap-2" size="sm">
          <Plus className="w-4 h-4" /> Добавить
        </Button>
      </div>

      {stations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Monitor className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">Нет станций</p>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Добавить станцию
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {stations.map((s) => (
            <Card key={s.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{s.station_number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{s.name}</h3>
                    {s.zone === 'vip' ? (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">VIP</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Зал</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {s.hourly_rate.toLocaleString()} ₸/час · Пакет {s.package_rate.toLocaleString()} ₸
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => openEdit(s)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => { setSelected(s); setDeleteDialogOpen(true); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selected ? 'Редактировать станцию' : 'Новая станция'}</DialogTitle>
            <DialogDescription>{selected ? 'Измените параметры станции' : 'Заполните данные для новой станции'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); setFormError(''); }} placeholder="VIP 1" />
              </div>
              <div className="space-y-2">
                <Label>Номер</Label>
                <Input type="number" value={stationNumber} onChange={(e) => { setStationNumber(e.target.value); setFormError(''); }} min={1} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Зона</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="hall">Общий зал</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Почасовая (₸/час)</Label>
                <Input type="number" value={hourlyRate} onChange={(e) => { setHourlyRate(e.target.value); setFormError(''); }} min={0} />
              </div>
              <div className="space-y-2">
                <Label>Пакет (₸)</Label>
                <Input type="number" value={packageRate} onChange={(e) => { setPackageRate(e.target.value); setFormError(''); }} min={0} />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={isSaving}>Отмена</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение...</> : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить станцию?</AlertDialogTitle>
            <AlertDialogDescription>
              Удалить станцию «{selected?.name}»? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSaving} className="bg-destructive hover:bg-destructive/90">
              {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Удаление...</> : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
