import React, { useState, useEffect } from 'react';
import { useClubAdminAuth } from '@/contexts/ClubAdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Cashier {
  id: string;
  name: string;
  pin_code: string | null;
  role: string;
}

export default function ClubAdminCashiers() {
  const { user } = useClubAdminAuth();
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [formName, setFormName] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formError, setFormError] = useState('');

  const fetchCashiers = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('id, name, pin_code, role')
      .eq('tenant_id', user.tenant_id)
      .in('role', ['cashier', 'club_admin'])
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Ошибка загрузки кассиров');
    } else {
      setCashiers(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchCashiers(); }, [user]);

  const openCreate = () => {
    setSelectedCashier(null);
    setFormName(''); setFormPin(''); setFormError('');
    setEditModalOpen(true);
  };

  const openEdit = (c: Cashier) => {
    setSelectedCashier(c);
    setFormName(c.name); setFormPin(c.pin_code || ''); setFormError('');
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { setFormError('Введите имя'); return; }
    if (!/^\d{4}$/.test(formPin)) { setFormError('PIN: ровно 4 цифры'); return; }
    if (!user) return;

    setIsSaving(true);
    setFormError('');

    if (selectedCashier) {
      const { error } = await supabase
        .from('users')
        .update({ name: formName.trim(), pin_code: formPin })
        .eq('id', selectedCashier.id)
        .eq('tenant_id', user.tenant_id);
      if (error) { setFormError(error.message); } else { toast.success('Обновлено'); setEditModalOpen(false); fetchCashiers(); }
    } else {
      const { error } = await supabase
        .from('users')
        .insert({ name: formName.trim(), pin_code: formPin, role: 'cashier', tenant_id: user.tenant_id });
      if (error) { setFormError(error.message); } else { toast.success('Кассир создан'); setEditModalOpen(false); fetchCashiers(); }
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedCashier || !user) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', selectedCashier.id)
      .eq('tenant_id', user.tenant_id)
      .eq('role', 'cashier');
    if (error) { toast.error(error.message); } else { toast.success('Удалён'); setDeleteDialogOpen(false); fetchCashiers(); }
    setIsSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Кассиры</h2>
          <p className="text-muted-foreground text-sm">Управление кассирами клуба</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Добавить
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : cashiers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">Нет кассиров</p>
            <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Добавить</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {cashiers.map((c) => (
            <Card key={c.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{c.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{c.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {c.role === 'club_admin' ? 'Администратор' : 'Кассир'} · PIN: {c.pin_code || '—'}
                  </p>
                </div>
                {c.role !== 'club_admin' && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => openEdit(c)} className="h-9 w-9">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => { setSelectedCashier(c); setDeleteDialogOpen(true); }} className="h-9 w-9 text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCashier ? 'Редактировать' : 'Новый кассир'}</DialogTitle>
            <DialogDescription>{selectedCashier ? 'Измените данные кассира' : 'Заполните данные'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Имя</Label>
              <Input value={formName} onChange={(e) => { setFormName(e.target.value); setFormError(''); }} placeholder="Имя кассира" maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label>PIN (4 цифры)</Label>
              <Input value={formPin} onChange={(e) => { setFormPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setFormError(''); }} placeholder="0000" maxLength={4} className="font-mono text-lg tracking-widest" />
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить кассира?</AlertDialogTitle>
            <AlertDialogDescription>Удалить "{selectedCashier?.name}"? Это действие нельзя отменить.</AlertDialogDescription>
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
