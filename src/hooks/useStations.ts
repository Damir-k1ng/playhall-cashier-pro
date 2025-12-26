import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CONTROLLER_RATE } from '@/lib/constants';
import type { StationWithSession, Session, ControllerUsage, SessionDrink } from '@/types/database';

export function useStations() {
  const { shift, refreshShift } = useAuth();
  const [stations, setStations] = useState<StationWithSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStations = useCallback(async () => {
    try {
      // Fetch all stations
      const { data: stationsData, error: stationsError } = await supabase
        .from('stations')
        .select('*')
        .order('station_number');

      if (stationsError) throw stationsError;

      // Fetch active sessions with their controllers and drinks
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          controller_usage(*),
          session_drinks(*, drinks(*))
        `)
        .eq('status', 'active');

      if (sessionsError) throw sessionsError;

      // Build station with session data
      const stationsWithSessions: StationWithSession[] = stationsData.map(station => {
        const activeSession = sessionsData?.find(s => s.station_id === station.id);
        
        return {
          id: station.id,
          name: station.name,
          zone: station.zone as 'vip' | 'hall',
          station_number: station.station_number,
          hourly_rate: station.hourly_rate,
          package_rate: station.package_rate,
          created_at: station.created_at,
          activeSession: activeSession ? {
            id: activeSession.id,
            station_id: activeSession.station_id,
            shift_id: activeSession.shift_id,
            tariff_type: activeSession.tariff_type as 'hourly' | 'package',
            started_at: activeSession.started_at,
            ended_at: activeSession.ended_at,
            status: activeSession.status as 'active' | 'completed',
            game_cost: activeSession.game_cost || 0,
            controller_cost: activeSession.controller_cost || 0,
            drink_cost: activeSession.drink_cost || 0,
            total_cost: activeSession.total_cost || 0,
            created_at: activeSession.created_at,
          } : undefined,
          controllers: activeSession?.controller_usage?.map((c: any) => ({
            id: c.id,
            session_id: c.session_id,
            taken_at: c.taken_at,
            returned_at: c.returned_at,
            cost: c.cost || 0,
          })) || [],
          drinks: activeSession?.session_drinks?.map((d: any) => ({
            id: d.id,
            session_id: d.session_id,
            drink_id: d.drink_id,
            quantity: d.quantity,
            total_price: d.total_price,
            created_at: d.created_at,
            drink: d.drinks,
          })) || [],
        };
      });

      setStations(stationsWithSessions);
      setError(null);
    } catch (err) {
      console.error('Error fetching stations:', err);
      setError('Ошибка загрузки станций');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStations();

    // Set up real-time subscriptions for live updates
    const sessionsChannel = supabase
      .channel('sessions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        fetchStations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'controller_usage' }, () => {
        fetchStations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_drinks' }, () => {
        fetchStations();
      })
      .subscribe();

    // Refresh every 5 seconds for timer accuracy across devices
    const interval = setInterval(fetchStations, 5000);

    return () => {
      supabase.removeChannel(sessionsChannel);
      clearInterval(interval);
    };
  }, [fetchStations]);

  const startSession = async (stationId: string, tariffType: 'hourly' | 'package') => {
    if (!shift?.id) return { error: 'Нет активной смены' };

    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          station_id: stationId,
          shift_id: shift.id,
          tariff_type: tariffType,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      // Play start sound
      playSound('start');
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      await fetchStations();
      return { data };
    } catch (err: any) {
      console.error('Error starting session:', err);
      return { error: err.message || 'Ошибка запуска сессии' };
    }
  };

  const endSession = async (
    sessionId: string,
    gameCost: number,
    controllerCost: number,
    drinkCost: number
  ) => {
    try {
      const totalCost = gameCost + controllerCost + drinkCost;

      const { error } = await supabase
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          game_cost: gameCost,
          controller_cost: controllerCost,
          drink_cost: drinkCost,
          total_cost: totalCost,
        })
        .eq('id', sessionId);

      if (error) throw error;

      await fetchStations();
      return { success: true };
    } catch (err: any) {
      console.error('Error ending session:', err);
      return { error: err.message || 'Ошибка завершения сессии' };
    }
  };

  const addController = async (sessionId: string): Promise<{ success?: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('controller_usage')
        .insert({
          session_id: sessionId,
        });

      if (error) throw error;

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }

      await fetchStations();
      return { success: true };
    } catch (err: any) {
      console.error('Error adding controller:', err);
      return { error: err.message || 'Ошибка добавления джойстика' };
    }
  };

  const returnController = async (controllerId: string, cost: number): Promise<{ success?: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('controller_usage')
        .update({
          returned_at: new Date().toISOString(),
          cost,
        })
        .eq('id', controllerId);

      if (error) throw error;

      await fetchStations();
      return { success: true };
    } catch (err: any) {
      console.error('Error returning controller:', err);
      return { error: err.message || 'Ошибка возврата джойстика' };
    }
  };

  return {
    stations,
    isLoading,
    error,
    refetch: fetchStations,
    startSession,
    endSession,
    addController,
    returnController,
  };
}

// Simple sound effects
function playSound(type: 'start' | 'warning' | 'success') {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch (type) {
      case 'start':
        oscillator.frequency.value = 523.25; // C5
        gainNode.gain.value = 0.1;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
        break;
      case 'warning':
        oscillator.frequency.value = 440; // A4
        gainNode.gain.value = 0.1;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
      case 'success':
        oscillator.frequency.value = 659.25; // E5
        gainNode.gain.value = 0.1;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
    }
  } catch (err) {
    // Audio not supported
  }
}
