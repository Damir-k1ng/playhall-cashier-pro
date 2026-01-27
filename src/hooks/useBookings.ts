import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
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

export function useBookings() {
  const [bookings, setBookings] = useState<BookingWithStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    try {
      const data = await apiClient.getBookings();
      setBookings((data || []) as BookingWithStation[]);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const createBooking = async (
    stationId: string,
    startTime: string,
    comment?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiClient.createBooking({
        station_id: stationId,
        start_time: startTime,
        comment: comment || undefined,
      });

      toast.success('Бронь создана');
      await fetchBookings();
      return { success: true };
    } catch (err: any) {
      console.error('Error creating booking:', err);
      return { success: false, error: err.message };
    }
  };

  const cancelBooking = async (bookingId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiClient.updateBooking(bookingId, { status: 'cancelled' });
      toast.success('Бронь снята');
      await fetchBookings();
      return { success: true };
    } catch (err: any) {
      console.error('Error canceling booking:', err);
      return { success: false, error: err.message };
    }
  };

  const completeBooking = async (bookingId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiClient.updateBooking(bookingId, { status: 'completed' });
      await fetchBookings();
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
