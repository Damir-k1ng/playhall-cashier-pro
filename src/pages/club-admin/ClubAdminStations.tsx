import React, { useState, useEffect } from 'react';
import { useClubAdminAuth } from '@/contexts/ClubAdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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

interface Station {
  id: string;
  name: string;
  station_number: number;
  zone: string;
  hourly_rate: number;
  package_rate: number;
}

export default function ClubAdminStations() {
  const { user } = useClubAdminAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Station | null>(null);
  const [form, setForm] = useState({ name: '', station_number: '', zone: 'general', hourly_rate: '', package_rate: '' });
  const [formError, setFormError] = useState('');

  const fetch = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('stations')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .order('station_number');
    if (error) toast.error(error.message);
    else setStations(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetch(); }, [user]);

  const openCreate = () => {
    setSelected(null);
    setForm({ name: '', station_number: '', zone: 'general', hourly_rate: '', package_rate: '' });
    setFormError(''); setEditOpen(true);
  };

  const openEdit = (s: Station) => {
    setSelected(s);
    setForm({ name: s.name, station_number: String(s.station_number), zone: s.zone, hourly_rate: String(s.hourly_rate), package_rate: String(s.package_rate) });
    setFormError(''); setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.station_number || !form.hourly_rate || !form.package_rate) {
      setFormError('Заполните все поля'); return;
    }
    if (!user) return;
    setIsSaving(true); setFormError('');

    const payload = {
      name: form.name.trim(),
      station_number: parseInt(form.station_number),
      zone: form.zone,
      hourly_rate: parseInt(form.hourly_rate),
      package_rate: parseInt(form.package_rate),
      tenant_id: user.tenant_id,
    };

    if (selected) {
      const { error } = await supabase.from('stations').update(payload).eq('id', selected.id).eq('tenant_id', user.tenant_id);
      if (error) setFormError(error.message);
      else { toast.success('Обновлено'); setEditOpen(false); fetch(); }
    } else {
      const { error } = await supabase.from('stations').insert(payload);
      if (error) setFormError(error.message);
      else { toast.success('Создано'); setEditOpen(false); fetch(); }
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!selected || !user) return;
    setIsSaving(true);
    const { error } = await supabase.from('stations').delete().eq('id', selected.id).eq('tenant_id', user.tenant_id);
    if (error) toast.error(error.message);
    else { toast.success('Удалено'); setDeleteOpen(false); fetch(); }
    setIsSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Станции</h2>
          <p className="text-muted-foreground text-sm">Управление игровыми станциями</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Добавить</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : stations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Monitor className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">Нет станций</p>
            <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Добавить</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stations.map((s) => (
            <Card key={s.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{s.name}</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="h-8 w-8"><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { setSelected(s); setDeleteOpen(true); }} className="h-8 w-8 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">№{s.station_number} · {s.zone === 'vip' ? 'VIP' : 'Общий'}</p>
                <p className="text-sm text-muted-foreground">{s.hourly_rate} ₸/час · {s.package_rate} ₸/пакет</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected ? 'Редактировать станцию' : 'Новая станция'}</DialogTitle>
            <DialogDescription>Заполните параметры станции</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="PS5 #1" />
              </div>
              <div className="space-y-2">
                <Label>Номер</Label>
                <Input type="number" value={form.station_number} onChange={(e) => setForm({ ...form, station_number: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Зона</Label>
              <Select value={form.zone} onValueChange={(v) => setForm({ ...form, zone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Общий зал</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>₸/час</Label>
                <Input type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>₸/пакет</Label>
                <Input type="number" value={form.package_rate} onChange={(e) => setForm({ ...form, package_rate: e.target.value })} />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSaving}>Отмена</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Сохранение...' : 'Сохранить'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить станцию?</AlertDialogTitle>
            <AlertDialogDescription>Удалить "{selected?.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSaving} className="bg-destructive hover:bg-destructive/90">Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
