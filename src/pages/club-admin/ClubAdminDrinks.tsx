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
import { Plus, Pencil, Trash2, Loader2, Coffee } from 'lucide-react';
import { toast } from 'sonner';

interface Drink {
  id: string;
  name: string;
  price: number;
}

export default function ClubAdminDrinks() {
  const { user } = useClubAdminAuth();
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Drink | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formError, setFormError] = useState('');

  const fetchDrinks = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('drinks')
      .select('id, name, price')
      .eq('tenant_id', user.tenant_id)
      .order('name');
    if (error) toast.error(error.message);
    else setDrinks(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchDrinks(); }, [user]);

  const openCreate = () => {
    setSelected(null); setFormName(''); setFormPrice(''); setFormError(''); setEditOpen(true);
  };

  const openEdit = (d: Drink) => {
    setSelected(d); setFormName(d.name); setFormPrice(String(d.price)); setFormError(''); setEditOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { setFormError('Введите название'); return; }
    if (!formPrice || parseInt(formPrice) <= 0) { setFormError('Введите цену'); return; }
    if (!user) return;
    setIsSaving(true); setFormError('');

    if (selected) {
      const { error } = await supabase.from('drinks').update({ name: formName.trim(), price: parseInt(formPrice) }).eq('id', selected.id);
      if (error) setFormError(error.message);
      else { toast.success('Обновлено'); setEditOpen(false); fetchDrinks(); }
    } else {
      const { error } = await supabase.from('drinks').insert({ name: formName.trim(), price: parseInt(formPrice), tenant_id: user.tenant_id });
      if (error) setFormError(error.message);
      else { toast.success('Создано'); setEditOpen(false); fetchDrinks(); }
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setIsSaving(true);
    const { error } = await supabase.from('drinks').delete().eq('id', selected.id);
    if (error) toast.error(error.message);
    else { toast.success('Удалено'); setDeleteOpen(false); fetchDrinks(); }
    setIsSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Напитки</h2>
          <p className="text-muted-foreground text-sm">Меню напитков и цены</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Добавить</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : drinks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Coffee className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">Нет напитков</p>
            <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Добавить</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {drinks.map((d) => (
            <Card key={d.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{d.name}</h3>
                  <p className="text-sm text-primary font-medium">{d.price} ₸</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(d)} className="h-8 w-8"><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { setSelected(d); setDeleteOpen(true); }} className="h-8 w-8 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selected ? 'Редактировать' : 'Новый напиток'}</DialogTitle>
            <DialogDescription>Заполните данные</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={formName} onChange={(e) => { setFormName(e.target.value); setFormError(''); }} placeholder="Coca-Cola" />
            </div>
            <div className="space-y-2">
              <Label>Цена (₸)</Label>
              <Input type="number" value={formPrice} onChange={(e) => { setFormPrice(e.target.value); setFormError(''); }} placeholder="500" />
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
            <AlertDialogTitle>Удалить напиток?</AlertDialogTitle>
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
