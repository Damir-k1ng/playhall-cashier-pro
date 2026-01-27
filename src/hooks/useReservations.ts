import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

export interface Reservation {
  id: string;
  station_id: string;
  shift_id: string;
  reserved_for: string;
  customer_name: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  station?: {
    id: string;
    name: string;
    zone: string;
  };
}

export function useReservations() {
  const { shift } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<number | null>(null);

  const fetchReservations = useCallback(async () => {
    if (!shift?.id) {
      setReservations([]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiClient.getReservations();
      setReservations(data || []);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [shift?.id]);

  useEffect(() => {
    fetchReservations();

    // Refresh every 30 seconds
    intervalRef.current = window.setInterval(fetchReservations, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchReservations]);

  const createReservation = async (
    stationId: string,
    reservedFor: Date,
    customerName?: string,
    phone?: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!shift?.id) {
      return { success: false, error: 'Нет активной смены' };
    }

    try {
      await apiClient.createReservation({
        station_id: stationId,
        reserved_for: reservedFor.toISOString(),
        customer_name: customerName,
        phone: phone,
        notes: notes,
      });

      toast.success('Бронь создана');
      await fetchReservations();
      return { success: true };
    } catch (err: any) {
      console.error('Error creating reservation:', err);
      return { success: false, error: err.message };
    }
  };

  const cancelReservation = async (reservationId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiClient.updateReservation(reservationId, { is_active: false });

      toast.success('Бронь отменена');
      await fetchReservations();
      return { success: true };
    } catch (err: any) {
      console.error('Error canceling reservation:', err);
      return { success: false, error: err.message };
    }
  };

  const getStationReservations = (stationId: string) => {
    return reservations.filter(r => r.station_id === stationId);
  };

  return {
    reservations,
    isLoading,
    createReservation,
    cancelReservation,
    getStationReservations,
    refetch: fetchReservations,
  };
}
