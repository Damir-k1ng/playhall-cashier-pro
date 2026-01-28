import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Users, Shield, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { CLUB_NAME } from '@/lib/constants';
import logoImage from '@/assets/logo.jpg';
import { ShiftAnalyticsDashboard } from '@/components/admin/ShiftAnalyticsDashboard';

interface Cashier {
  id: string;
  name: string;
  pin: string;
  created_at: string;
}

export function AdminCashiers() {
  const { role, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get initial tab from URL params
  const initialTab = searchParams.get('tab') === 'analytics' ? 'analytics' : 'cashiers';
  const [activeTab, setActiveTab] = useState<'cashiers' | 'analytics'>(initialTab);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formError, setFormError] = useState('');

  // Check admin access
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || role !== 'admin')) {
      toast.error('Доступ запрещён');
      navigate('/');
    }
  }, [authLoading, isAuthenticated, role, navigate]);

  // Fetch cashiers
  const fetchCashiers = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getCashiers();
      setCashiers(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка загрузки кассиров');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && role === 'admin') {
      fetchCashiers();
    }
  }, [isAuthenticated, role]);

  const openCreateModal = () => {
    setSelectedCashier(null);
    setFormName('');
    setFormPin('');
    setFormError('');
    setEditModalOpen(true);
  };

  const openEditModal = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setFormName(cashier.name);
    setFormPin(cashier.pin);
    setFormError('');
    setEditModalOpen(true);
  };

  const openDeleteDialog = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setDeleteDialogOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formName.trim()) {
      setFormError('Введите имя кассира');
      return false;
    }
    if (formName.trim().length > 50) {
      setFormError('Имя слишком длинное (макс. 50 символов)');
      return false;
    }
    if (!/^\d{4}$/.test(formPin)) {
      setFormError('PIN должен содержать ровно 4 цифры');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsSaving(true);
    setFormError('');
    
    try {
      if (selectedCashier) {
        // Update existing cashier
        await apiClient.updateCashier(selectedCashier.id, {
          name: formName.trim(),
          pin: formPin,
        });
        toast.success('Кассир обновлён');
      } else {
        // Create new cashier
        await apiClient.createCashier({
          name: formName.trim(),
          pin: formPin,
        });
        toast.success('Кассир создан');
      }
      
      setEditModalOpen(false);
      fetchCashiers();
    } catch (error: any) {
      const message = error.message || 'Ошибка сохранения';
      if (message.includes('unique') || message.includes('duplicate') || message.includes('уже существует')) {
        setFormError('Этот PIN-код уже используется');
      } else {
        setFormError(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCashier) return;
    
    setIsSaving(true);
    try {
      await apiClient.deleteCashier(selectedCashier.id);
      toast.success('Кассир удалён');
      setDeleteDialogOpen(false);
      fetchCashiers();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка удаления');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || (isAuthenticated && role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,hsl(185_100%_50%_/_0.03)_0%,transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(155_100%_45%_/_0.02)_0%,transparent_50%)] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="w-10 h-10 rounded-lg overflow-hidden glow-cyan">
              <img src={logoImage} alt={CLUB_NAME} className="w-full h-full object-cover" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Администрирование
              </h1>
              <p className="text-sm text-muted-foreground">Кассиры и аналитика</p>
            </div>
            
            {activeTab === 'cashiers' && (
              <Button onClick={openCreateModal} className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Добавить</span>
              </Button>
            )}
          </div>
          
          {/* Tabs */}
          <div className="max-w-4xl mx-auto px-4 pb-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'cashiers' | 'analytics')}>
              <TabsList className="glass-card border border-primary/20 w-full">
                <TabsTrigger value="cashiers" className="flex-1 gap-2 data-[state=active]:bg-primary/20">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Кассиры</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex-1 gap-2 data-[state=active]:bg-primary/20">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Аналитика</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </header>
        
        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 pb-8">
            {activeTab === 'cashiers' ? (
              // Cashiers List
              isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : cashiers.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-4">Нет кассиров</p>
                    <Button onClick={openCreateModal} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Добавить первого кассира
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {cashiers.map((cashier) => (
                    <Card key={cashier.id} className="hover:border-primary/30 transition-colors">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xl font-bold text-primary">
                            {cashier.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{cashier.name}</h3>
                          <p className="text-sm text-muted-foreground font-mono">
                            PIN: {cashier.pin}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEditModal(cashier)}
                            className="h-9 w-9"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openDeleteDialog(cashier)}
                            className="h-9 w-9 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              // Analytics Dashboard
              <ShiftAnalyticsDashboard />
            )}
          </div>
        </main>
      </div>

      {/* Edit/Create Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCashier ? 'Редактировать кассира' : 'Новый кассир'}
            </DialogTitle>
            <DialogDescription>
              {selectedCashier 
                ? 'Измените данные кассира' 
                : 'Заполните данные для нового кассира'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  setFormError('');
                }}
                placeholder="Введите имя кассира"
                maxLength={50}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pin">PIN-код (4 цифры)</Label>
              <Input
                id="pin"
                value={formPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setFormPin(value);
                  setFormError('');
                }}
                placeholder="0000"
                maxLength={4}
                className="font-mono text-lg tracking-widest"
              />
            </div>
            
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={isSaving}
            >
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                'Сохранить'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить кассира?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить кассира "{selectedCashier?.name}"?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSaving}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Удаление...
                </>
              ) : (
                'Удалить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
