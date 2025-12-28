import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReservations, Reservation } from '@/hooks/useReservations';
import { useStations } from '@/hooks/useStations';
import { formatCurrency } from '@/lib/utils';
import { generateTimeSlots } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Calendar, Clock, User, Phone, X, Plus, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface ReservationModalProps {
  open: boolean;
  onClose: () => void;
}

export function ReservationModal({ open, onClose }: ReservationModalProps) {
  const { stations } = useStations();
  const { reservations, createReservation, cancelReservation } = useReservations();
  
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const timeSlots = useMemo(() => generateTimeSlots(10, 4), []);

  const resetForm = () => {
    setSelectedStation('');
    setSelectedTime('');
    setCustomerName('');
    setPhone('');
    setShowForm(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    if (!selectedStation || !selectedTime) {
      toast.error('Выберите станцию и время');
      return;
    }

    setIsCreating(true);
    
    // Parse time and create date
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const reservedFor = new Date();
    reservedFor.setHours(hours, minutes, 0, 0);
    
    // If the time is before now, assume it's for tomorrow
    if (reservedFor < new Date()) {
      reservedFor.setDate(reservedFor.getDate() + 1);
    }

    const result = await createReservation(
      selectedStation,
      reservedFor,
      customerName.trim() || undefined,
      phone.trim() || undefined
    );

    setIsCreating(false);

    if (result.success) {
      resetForm();
    } else {
      toast.error(result.error || 'Ошибка создания брони');
    }
  };

  const handleCancel = async (reservation: Reservation) => {
    await cancelReservation(reservation.id);
  };

  const formatReservationTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatReservationDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Сегодня';
    if (date.toDateString() === tomorrow.toDateString()) return 'Завтра';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const getStationById = (stationId: string) => {
    return stations.find(s => s.id === stationId);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-card border-primary/20 p-0 gap-0 max-h-[90vh] overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            Бронирование
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-200px)]">
          <div className="p-6 space-y-6">
            {/* Toggle Form Button */}
            {!showForm && (
              <Button
                onClick={() => setShowForm(true)}
                className="w-full h-14 gap-3 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary font-bold text-base"
                variant="ghost"
              >
                <Plus className="w-5 h-5" />
                Новая бронь
              </Button>
            )}

            {/* Create Reservation Form */}
            {showForm && (
              <div className="glass-card rounded-xl border border-primary/30 p-5 space-y-5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">Новая бронь</h3>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowForm(false)}
                    className="h-8 w-8 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Station Selection */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Станция *</Label>
                  <Select value={selectedStation} onValueChange={setSelectedStation}>
                    <SelectTrigger className="h-12 rounded-xl border-border/50 bg-muted/30">
                      <SelectValue placeholder="Выберите станцию" />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map(station => (
                        <SelectItem key={station.id} value={station.id}>
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              'text-[10px] font-bold px-2 py-1 rounded uppercase',
                              station.zone === 'vip' ? 'bg-vip/20 text-vip' : 'bg-primary/20 text-primary'
                            )}>
                              {station.zone === 'vip' ? 'VIP' : 'Зал'}
                            </span>
                            <span>{station.name}</span>
                            <span className="text-muted-foreground text-sm">
                              {formatCurrency(station.hourly_rate)}/ч
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Time Selection */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Время *</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger className="h-12 rounded-xl border-border/50 bg-muted/30">
                      <SelectValue placeholder="Выберите время" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      {timeSlots.map(time => (
                        <SelectItem key={time} value={time}>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {time}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer Name */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Имя клиента</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Введите имя"
                      className="h-12 pl-11 rounded-xl border-border/50 bg-muted/30"
                      maxLength={50}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Телефон</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+7 (___) ___-__-__"
                      className="h-12 pl-11 rounded-xl border-border/50 bg-muted/30"
                      maxLength={20}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleCreate}
                  disabled={!selectedStation || !selectedTime || isCreating}
                  className="w-full h-12 rounded-xl font-bold text-base bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                >
                  {isCreating ? 'Создание...' : 'Забронировать'}
                </Button>
              </div>
            )}

            {/* Active Reservations */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Активные брони ({reservations.length})
              </h3>

              {reservations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/60">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Нет активных бронирований</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reservations.map(reservation => {
                    const station = getStationById(reservation.station_id);
                    return (
                      <div
                        key={reservation.id}
                        className="glass-card rounded-xl border border-border/50 p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg',
                              station?.zone === 'vip' 
                                ? 'bg-vip/15 text-vip border border-vip/30' 
                                : 'bg-primary/15 text-primary border border-primary/30'
                            )}>
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold">{station?.name || 'Станция'}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="font-medium text-primary">
                                  {formatReservationDate(reservation.reserved_for)}
                                </span>
                                <span>•</span>
                                <span className="font-mono text-lg text-foreground">
                                  {formatReservationTime(reservation.reserved_for)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancel(reservation)}
                            className="h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {(reservation.customer_name || reservation.phone) && (
                          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border/30">
                            {reservation.customer_name && (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>{reservation.customer_name}</span>
                              </div>
                            )}
                            {reservation.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                <span>{reservation.phone}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border/50">
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="w-full h-12 rounded-xl"
          >
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
