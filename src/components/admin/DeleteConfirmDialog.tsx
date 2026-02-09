import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description: string;
}

export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description
}: DeleteConfirmDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim().length >= 5) {
      onConfirm(reason.trim());
      setReason('');
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {description}
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              ⚠️ Это действие необратимо! Сумма будет вычтена из кассы соответствующей смены.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-2 py-2">
          <Label className="text-sm font-medium">
            📝 Причина удаления <span className="text-destructive">*</span>
          </Label>
          <Textarea
            placeholder="Опишите причину удаления (минимум 5 символов)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={reason.trim().length < 5}
            className="bg-destructive hover:bg-destructive/90"
          >
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
