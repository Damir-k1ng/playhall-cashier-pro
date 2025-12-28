import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

  const fetchReservations = useCallback(async () => {
    if (!shift?.id) {
      setReservations([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          station:stations(id, name, zone)
        `)
        .eq('is_active', true)
        .gte('reserved_for', new Date().toISOString())
        .order('reserved_for', { ascending: true });

      if (error) throw error;

      setReservations(data || []);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [shift?.id]);

  useEffect(() => {
    fetchReservations();

    // Real-time subscription
    const channel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => fetchReservations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      const { error } = await supabase.from('reservations').insert({
        station_id: stationId,
        shift_id: shift.id,
        reserved_for: reservedFor.toISOString(),
        customer_name: customerName || null,
        phone: phone || null,
        notes: notes || null,
        is_active: true,
      });

      if (error) throw error;

      toast.success('Бронь создана');
      return { success: true };
    } catch (err: any) {
      console.error('Error creating reservation:', err);
      return { success: false, error: err.message };
    }
  };

  const cancelReservation = async (reservationId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ is_active: false })
        .eq('id', reservationId);

      if (error) throw error;

      toast.success('Бронь отменена');
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
