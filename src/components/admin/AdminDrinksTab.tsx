import React, { useState } from 'react';
import { apiClient } from '@/lib/api';
import { useDrinks } from '@/hooks/useDrinks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2, Coffee } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import type { Drink } from '@/types/database';

export function AdminDrinksTab() {
  const { drinks, isLoading, refetch } = useDrinks();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formError, setFormError] = useState('');

  const openCreateModal = () => {
    setSelectedDrink(null);
    setFormName('');
    setFormPrice('');
    setFormError('');
    setEditModalOpen(true);
  };

  const openEditModal = (drink: Drink) => {
    setSelectedDrink(drink);
    setFormName(drink.name);
    setFormPrice(String(drink.price));
    setFormError('');
    setEditModalOpen(true);
  };

  const openDeleteDialog = (drink: Drink) => {
    setSelectedDrink(drink);
    setDeleteDialogOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formName.trim()) { setFormError('Введите название'); return false; }
    if (formName.trim().length > 100) { setFormError('Название слишком длинное'); return false; }
    const price = Number(formPrice);
    if (isNaN(price) || price < 0) { setFormError('Укажите корректную цену'); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    setFormError('');
    try {
      if (selectedDrink) {
        await apiClient.updateDrink(selectedDrink.id, {
          name: formName.trim(),
          price: Number(formPrice),
        });
        toast.success('Напиток обновлён');
      } else {
        await apiClient.createDrink({
          name: formName.trim(),
          price: Number(formPrice),
        });
        toast.success('Напиток добавлен');
      }
      setEditModalOpen(false);
      refetch();
    } catch (error: any) {
      setFormError(error.message || 'Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDrink) return;
    setIsSaving(true);
    try {
      await apiClient.deleteDrink(selectedDrink.id);
      toast.success('Напиток удалён');
      setDeleteDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка удаления');
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
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Coffee className="w-5 h-5 text-primary" />
          Каталог напитков
        </h2>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="w-4 h-4" />
          Добавить
        </Button>
      </div>

      {drinks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Coffee className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Нет напитков в каталоге</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {drinks.map((drink) => (
            <Card key={drink.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Coffee className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{drink.name}</h3>
                  <p className="text-sm text-muted-foreground">{formatCurrency(drink.price)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => openEditModal(drink)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => openDeleteDialog(drink)}>
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
            <DialogTitle>{selectedDrink ? 'Редактировать напиток' : 'Новый напиток'}</DialogTitle>
            <DialogDescription>
              {selectedDrink ? 'Измените данные напитка' : 'Добавьте новый напиток в каталог'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="drink-name">Название</Label>
              <Input
                id="drink-name"
                value={formName}
                onChange={(e) => { setFormName(e.target.value); setFormError(''); }}
                placeholder="Coca-Cola 0.5"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drink-price">Цена (₸)</Label>
              <Input
                id="drink-price"
                type="number"
                min="0"
                value={formPrice}
                onChange={(e) => { setFormPrice(e.target.value); setFormError(''); }}
                placeholder="500"
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={isSaving}>Отмена</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить напиток?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить «{selectedDrink?.name}»? Будут также удалены данные склада для этого напитка.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSaving} className="bg-destructive hover:bg-destructive/90">
              {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Удаление...</> : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
