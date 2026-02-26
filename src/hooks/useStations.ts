import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { isNetworkError } from '@/lib/offline-cache';
import { enqueue } from '@/lib/offline-queue';
import { toast } from '@/hooks/use-toast';
import { CONTROLLER_RATE } from '@/lib/constants';
import type { StationWithSession } from '@/types/database';

// Query key constants
export const STATIONS_QUERY_KEY = ['stations'] as const;
export const stationQueryKey = (id: string) => ['station', id] as const;

function mapStationData(station: any): StationWithSession {
  return {
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
      package_count: station.activeSession.package_count || 0,
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
    isOwnSession: station.isOwnSession,
  };
}

// Hook for all stations (Dashboard) — polls every 15s, shared cache
export function useStations() {
  const { shift } = useAuth();
  const queryClient = useQueryClient();

  const { data: stations = [], isLoading, isFetching: isRefreshing } = useQuery({
    queryKey: STATIONS_QUERY_KEY,
    queryFn: async () => {
      const data = await apiClient.getStations();
      return (data || []).map(mapStationData);
    },
    enabled: !!shift?.id,
    staleTime: 5_000,        // Data considered fresh for 5s
    gcTime: 60_000,           // Keep in cache 60s after unmount
    refetchInterval: 15_000,  // Poll every 15s
    refetchIntervalInBackground: false,
  });

  const invalidateAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: STATIONS_QUERY_KEY });
  }, [queryClient]);

  const startSession = useCallback(async (stationId: string, tariffType: 'hourly' | 'package') => {
    if (!shift?.id) return { error: 'Нет активной смены' };

    try {
      const data = await apiClient.createSession({ station_id: stationId, tariff_type: tariffType });
      playSound('start');
      if (navigator.vibrate) navigator.vibrate(50);
      await invalidateAll();
      return { data };
    } catch (err: any) {
      if (isNetworkError(err)) {
        enqueue('create_session', { station_id: stationId, tariff_type: tariffType });
        playSound('start');
        if (navigator.vibrate) navigator.vibrate(50);
        toast({ title: '⚡ Сессия поставлена в очередь', description: 'Будет запущена при восстановлении связи' });
        return { data: null, queued: true };
      }
      return { error: err.message || 'Ошибка запуска сессии' };
    }
  }, [shift?.id, invalidateAll]);

  const endSession = useCallback(async (sessionId: string, gameCost: number, controllerCost: number, drinkCost: number) => {
    try {
      await apiClient.updateSession(sessionId, {
        status: 'completed',
        ended_at: new Date().toISOString(),
        game_cost: gameCost,
        controller_cost: controllerCost,
        drink_cost: drinkCost,
        total_cost: gameCost + controllerCost + drinkCost,
      });
      await invalidateAll();
      return { success: true };
    } catch (err: any) {
      return { error: err.message || 'Ошибка завершения сессии' };
    }
  }, [invalidateAll]);

  const addController = useCallback(async (sessionId: string) => {
    try {
      await apiClient.createControllerUsage({ session_id: sessionId });
      if (navigator.vibrate) navigator.vibrate(30);
      await invalidateAll();
      return { success: true };
    } catch (err: any) {
      return { error: err.message || 'Ошибка добавления джойстика' };
    }
  }, [invalidateAll]);

  const returnController = useCallback(async (controllerId: string, cost: number) => {
    try {
      await apiClient.updateControllerUsage(controllerId, { returned_at: new Date().toISOString(), cost });
      await invalidateAll();
      return { success: true };
    } catch (err: any) {
      return { error: err.message || 'Ошибка возврата джойстика' };
    }
  }, [invalidateAll]);

  const extendPackage = useCallback(async (sessionId: string) => {
    try {
      const result = await apiClient.extendPackage(sessionId);
      playSound('success');
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      await invalidateAll();
      return { success: true, package_count: result.package_count };
    } catch (err: any) {
      return { error: err.message || 'Ошибка продления пакета' };
    }
  }, [invalidateAll]);

  return {
    stations,
    isLoading,
    isRefreshing,
    error: null,
    refetch: invalidateAll,
    startSession,
    endSession,
    addController,
    returnController,
    extendPackage,
  };
}

// Hook for a single station — uses cached data from Dashboard + fetches fresh
export function useStation(stationId: string | undefined) {
  const { shift } = useAuth();
  const queryClient = useQueryClient();

  const { data: station, isLoading } = useQuery({
    queryKey: stationQueryKey(stationId || ''),
    queryFn: async () => {
      const data = await apiClient.getStation(stationId!);
      return mapStationData(data);
    },
    enabled: !!shift?.id && !!stationId,
    staleTime: 3_000,
    gcTime: 30_000,
    refetchInterval: 10_000,  // Faster polling for active station view
    // Seed from Dashboard cache for instant display
    initialData: () => {
      const allStations = queryClient.getQueryData<StationWithSession[]>(STATIONS_QUERY_KEY);
      return allStations?.find(s => s.id === stationId);
    },
    initialDataUpdatedAt: () => {
      return queryClient.getQueryState(STATIONS_QUERY_KEY)?.dataUpdatedAt;
    },
  });

  return { station, isLoading };
}

// Hook to find station by session ID — for PreCheck/Payment screens
export function useStationBySession(sessionId: string | undefined) {
  const { shift } = useAuth();
  const queryClient = useQueryClient();

  // First try to find from cached stations data
  const cachedStations = queryClient.getQueryData<StationWithSession[]>(STATIONS_QUERY_KEY);
  const cachedStation = cachedStations?.find(s => s.activeSession?.id === sessionId);

  const { data: station, isLoading } = useQuery({
    queryKey: ['station-by-session', sessionId],
    queryFn: async () => {
      // If we already found it in cache, use that station ID to fetch fresh
      if (cachedStation) {
        const data = await apiClient.getStation(cachedStation.id);
        return mapStationData(data);
      }
      // Otherwise return cached data (shouldn't happen in normal flow)
      return cachedStation || null;
    },
    enabled: !!shift?.id && !!sessionId && !!cachedStation,
    staleTime: 3_000,
    gcTime: 30_000,
    initialData: cachedStation || undefined,
  });

  return { station: station || cachedStation || null, isLoading: !cachedStation && isLoading };
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
      case 'start': oscillator.frequency.value = 523.25; gainNode.gain.value = 0.1; oscillator.start(); oscillator.stop(audioContext.currentTime + 0.15); break;
      case 'warning': oscillator.frequency.value = 440; gainNode.gain.value = 0.1; oscillator.start(); oscillator.stop(audioContext.currentTime + 0.3); break;
      case 'success': oscillator.frequency.value = 659.25; gainNode.gain.value = 0.1; oscillator.start(); oscillator.stop(audioContext.currentTime + 0.1); break;
    }
  } catch (err) { /* Audio not supported */ }
}
