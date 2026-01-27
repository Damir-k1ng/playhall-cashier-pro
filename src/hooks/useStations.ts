import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { CONTROLLER_RATE } from '@/lib/constants';
import type { StationWithSession } from '@/types/database';

export function useStations() {
  const { shift } = useAuth();
  const [stations, setStations] = useState<StationWithSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const fetchStations = useCallback(async (isBackgroundRefresh = false) => {
    if (!shift?.id) {
      setStations([]);
      setIsLoading(false);
      return;
    }

    if (isBackgroundRefresh) {
      setIsRefreshing(true);
    }

    try {
      const stationsData = await apiClient.getStations();

      const stationsWithSessions: StationWithSession[] = stationsData.map((station: any) => ({
        id: station.id,
        name: station.name,
        zone: station.zone as 'vip' | 'hall',
        station_number: station.station_number,
        hourly_rate: station.hourly_rate,
        package_rate: station.package_rate,
        created_at: station.created_at,
        activeSession: station.activeSession ? {
          id: station.activeSession.id,
          station_id: station.activeSession.station_id,
          shift_id: station.activeSession.shift_id,
          tariff_type: station.activeSession.tariff_type as 'hourly' | 'package',
          started_at: station.activeSession.started_at,
          ended_at: station.activeSession.ended_at,
          status: station.activeSession.status as 'active' | 'completed',
          game_cost: station.activeSession.game_cost || 0,
          controller_cost: station.activeSession.controller_cost || 0,
          drink_cost: station.activeSession.drink_cost || 0,
          total_cost: station.activeSession.total_cost || 0,
          created_at: station.activeSession.created_at,
        } : undefined,
        controllers: station.activeSession?.controller_usage?.map((c: any) => ({
          id: c.id,
          session_id: c.session_id,
          taken_at: c.taken_at,
          returned_at: c.returned_at,
          cost: c.cost || 0,
        })) || [],
        drinks: station.activeSession?.session_drinks?.map((d: any) => ({
          id: d.id,
          session_id: d.session_id,
          drink_id: d.drink_id,
          quantity: d.quantity,
          total_price: d.total_price,
          created_at: d.created_at,
          drink: d.drinks,
        })) || [],
      }));

      setStations(stationsWithSessions);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching stations:', err);
      setError(err.message || 'Ошибка загрузки станций');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [shift?.id]);

  useEffect(() => {
    fetchStations();

    // Refresh every 5 seconds for timer accuracy
    intervalRef.current = window.setInterval(() => fetchStations(true), 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchStations]);

  const startSession = async (stationId: string, tariffType: 'hourly' | 'package') => {
    if (!shift?.id) return { error: 'Нет активной смены' };

    try {
      const data = await apiClient.createSession({
        station_id: stationId,
        tariff_type: tariffType,
      });

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

      await apiClient.updateSession(sessionId, {
        status: 'completed',
        ended_at: new Date().toISOString(),
        game_cost: gameCost,
        controller_cost: controllerCost,
        drink_cost: drinkCost,
        total_cost: totalCost,
      });

      await fetchStations();
      return { success: true };
    } catch (err: any) {
      console.error('Error ending session:', err);
      return { error: err.message || 'Ошибка завершения сессии' };
    }
  };

  const addController = async (sessionId: string): Promise<{ success?: boolean; error?: string }> => {
    try {
      await apiClient.createControllerUsage({ session_id: sessionId });

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
      await apiClient.updateControllerUsage(controllerId, {
        returned_at: new Date().toISOString(),
        cost,
      });

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
    isRefreshing,
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
