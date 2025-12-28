import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type BookingStatus = 'booked' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  station_id: string;
  booking_date: string;
  start_time: string;
  comment: string | null;
  status: BookingStatus;
  created_at: string;
}

export interface BookingWithStation extends Booking {
  station?: {
    id: string;
    name: string;
    zone: string;
    hourly_rate: number;
  };
}

function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function useBookings() {
  const [bookings, setBookings] = useState<BookingWithStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    try {
      const today = getTodayDate();
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          station:stations(id, name, zone, hourly_rate)
        `)
        .eq('booking_date', today)
        .eq('status', 'booked')
        .order('start_time', { ascending: true });

      if (error) throw error;

      setBookings((data || []) as BookingWithStation[]);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();

    // Real-time subscription
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => fetchBookings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookings]);

  const createBooking = async (
    stationId: string,
    startTime: string,
    comment?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const today = getTodayDate();

      // Check if station already has an active booking for today
      const { data: existing } = await supabase
        .from('bookings')
        .select('id')
        .eq('station_id', stationId)
        .eq('booking_date', today)
        .eq('status', 'booked')
        .single();

      if (existing) {
        return { success: false, error: 'Станция уже забронирована на сегодня' };
      }

      const { error } = await supabase.from('bookings').insert({
        station_id: stationId,
        booking_date: today,
        start_time: startTime,
        comment: comment || null,
        status: 'booked' as BookingStatus,
      });

      if (error) throw error;

      toast.success('Бронь создана');
      return { success: true };
    } catch (err: any) {
      console.error('Error creating booking:', err);
      return { success: false, error: err.message };
    }
  };

  const cancelBooking = async (bookingId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' as BookingStatus })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Бронь снята');
      return { success: true };
    } catch (err: any) {
      console.error('Error canceling booking:', err);
      return { success: false, error: err.message };
    }
  };

  const completeBooking = async (bookingId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' as BookingStatus })
        .eq('id', bookingId);

      if (error) throw error;

      return { success: true };
    } catch (err: any) {
      console.error('Error completing booking:', err);
      return { success: false, error: err.message };
    }
  };

  const getStationBooking = (stationId: string): BookingWithStation | undefined => {
    return bookings.find(b => b.station_id === stationId && b.status === 'booked');
  };

  return {
    bookings,
    isLoading,
    createBooking,
    cancelBooking,
    completeBooking,
    getStationBooking,
    refetch: fetchBookings,
  };
}
