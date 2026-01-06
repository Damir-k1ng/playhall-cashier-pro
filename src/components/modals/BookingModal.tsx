import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Calendar, Clock, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  stationId: string;
  stationName: string;
  stationZone: string;
  onCreateBooking: (stationId: string, startTime: string, comment?: string) => Promise<{ success: boolean; error?: string }>;
}

export function BookingModal({ open, onClose, stationId, stationName, stationZone, onCreateBooking }: BookingModalProps) {
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [comment, setComment] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Generate time slots: 30-minute steps, future times only, today only
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Round up to next 30-minute slot
    let startMinute = currentMinute < 30 ? 30 : 0;
    let startHour = currentMinute < 30 ? currentHour : currentHour + 1;
    
    // Generate slots from now until end of day (let's say 04:00 next day for gaming clubs)
    for (let hour = startHour; hour < 24; hour++) {
      for (let minute = (hour === startHour ? startMinute : 0); minute < 60; minute += 30) {
        slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    
    // Add late night hours (00:00 - 04:00)
    for (let hour = 0; hour <= 4; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 4 && minute > 0) break;
        slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    
    return slots;
  }, []);

  const resetForm = () => {
    setSelectedTime('');
    setComment('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    if (!selectedTime) {
      toast.error('Выберите время');
      return;
    }

    setIsCreating(true);
    
    const result = await onCreateBooking(
      stationId,
      selectedTime + ':00', // Add seconds for TIME format
      comment.trim() || undefined
    );

    setIsCreating(false);

    if (result.success) {
      handleClose();
    } else {
      toast.error(result.error || 'Ошибка создания брони');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-primary/20 p-0 gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-reserved/10 border border-reserved/30 flex items-center justify-center">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-reserved" />
            </div>
            <div>
              <div>🗓 Забронировать</div>
              <div className="text-xs sm:text-sm font-normal text-muted-foreground mt-0.5 sm:mt-1">
                <span className={cn(
                  'font-bold',
                  stationZone === 'vip' ? 'text-vip' : 'text-primary'
                )}>
                  {stationName}
                </span>
                <span> — бронь на сегодня</span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Time Selection */}
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Время начала *
            </Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger className="h-12 sm:h-14 rounded-xl border-border/50 bg-muted/30 text-base sm:text-lg font-mono">
                <SelectValue placeholder="Выберите время" />
              </SelectTrigger>
              <SelectContent className="max-h-[250px] sm:max-h-[300px]">
                {timeSlots.map(time => (
                  <SelectItem key={time} value={time} className="text-base sm:text-lg font-mono">
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comment (Client name + phone) */}
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Комментарий (имя, телефон)
            </Label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Иван +7 777 123 45 67"
              className="h-12 sm:h-14 rounded-xl border-border/50 bg-muted/30 text-sm sm:text-base"
              maxLength={100}
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 sm:p-6 pt-0 flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="flex-1 h-12 sm:h-12 rounded-xl text-sm sm:text-base"
          >
            Отмена
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedTime || isCreating}
            className="flex-1 h-12 sm:h-12 rounded-xl font-bold text-sm sm:text-base bg-reserved hover:bg-reserved/90"
          >
            {isCreating ? 'Создание...' : 'Забронировать'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
