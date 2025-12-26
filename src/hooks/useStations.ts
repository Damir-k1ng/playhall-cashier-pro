import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FALLBACK_STATIONS, CONTROLLER_RATE } from '@/lib/constants';
import type { Station, Session, ControllerUsage, SessionDrink, StationWithSession } from '@/types/database';

const STORAGE_KEYS = {
  SESSIONS: 'svoy_sessions',
  CONTROLLERS: 'svoy_controllers',
  SESSION_DRINKS: 'svoy_session_drinks',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getStoredData<T>(key: string, defaultValue: T[]): T[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStoredData<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useStations() {
  const { shift } = useAuth();
  const [stations, setStations] = useState<StationWithSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const buildStations = useCallback(() => {
    const sessions = getStoredData<Session>(STORAGE_KEYS.SESSIONS, []);
    const controllers = getStoredData<ControllerUsage>(STORAGE_KEYS.CONTROLLERS, []);
    const sessionDrinks = getStoredData<SessionDrink>(STORAGE_KEYS.SESSION_DRINKS, []);

    const stationsWithSessions: StationWithSession[] = FALLBACK_STATIONS.map(station => {
      const activeSession = sessions.find(
        s => s.station_id === station.id && s.status === 'active'
      );

      const stationControllers = activeSession
        ? controllers.filter(c => c.session_id === activeSession.id)
        : [];

      const stationDrinks = activeSession
        ? sessionDrinks.filter(d => d.session_id === activeSession.id)
        : [];

      return {
        ...station,
        id: station.id,
        zone: station.zone as 'vip' | 'hall',
        created_at: new Date().toISOString(),
        activeSession,
        controllers: stationControllers,
        drinks: stationDrinks,
        reservation: undefined,
      };
    });

    setStations(stationsWithSessions);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    buildStations();

    // Listen for storage changes (cross-tab sync)
    const handleStorage = () => buildStations();
    window.addEventListener('storage', handleStorage);
    
    // Refresh every second for live timers
    const interval = setInterval(buildStations, 1000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [buildStations]);

  const startSession = async (stationId: string, tariffType: 'hourly' | 'package') => {
    if (!shift) return { error: 'Нет активной смены' };

    const sessions = getStoredData<Session>(STORAGE_KEYS.SESSIONS, []);
    
    const newSession: Session = {
      id: generateId(),
      station_id: stationId,
      shift_id: shift.id,
      tariff_type: tariffType,
      status: 'active',
      started_at: new Date().toISOString(),
      ended_at: null,
      game_cost: null,
      controller_cost: null,
      drink_cost: null,
      total_cost: null,
      created_at: new Date().toISOString(),
    };

    sessions.push(newSession);
    setStoredData(STORAGE_KEYS.SESSIONS, sessions);
    buildStations();

    return { data: newSession };
  };

  const endSession = async (
    sessionId: string,
    gameCost: number,
    controllerCost: number,
    drinkCost: number
  ) => {
    const sessions = getStoredData<Session>(STORAGE_KEYS.SESSIONS, []);
    const totalCost = gameCost + controllerCost + drinkCost;

    const updatedSessions = sessions.map(s =>
      s.id === sessionId
        ? {
            ...s,
            status: 'completed' as const,
            ended_at: new Date().toISOString(),
            game_cost: gameCost,
            controller_cost: controllerCost,
            drink_cost: drinkCost,
            total_cost: totalCost,
          }
        : s
    );

    setStoredData(STORAGE_KEYS.SESSIONS, updatedSessions);
    buildStations();

    return { success: true };
  };

  const addController = async (sessionId: string): Promise<{ success?: boolean; error?: string }> => {
    const controllers = getStoredData<ControllerUsage>(STORAGE_KEYS.CONTROLLERS, []);

    const newController: ControllerUsage = {
      id: generateId(),
      session_id: sessionId,
      taken_at: new Date().toISOString(),
      returned_at: null,
      cost: null,
    };

    controllers.push(newController);
    setStoredData(STORAGE_KEYS.CONTROLLERS, controllers);
    buildStations();

    return { success: true };
  };

  const returnController = async (controllerId: string, cost: number): Promise<{ success?: boolean; error?: string }> => {
    const controllers = getStoredData<ControllerUsage>(STORAGE_KEYS.CONTROLLERS, []);

    const updatedControllers = controllers.map(c =>
      c.id === controllerId
        ? {
            ...c,
            returned_at: new Date().toISOString(),
            cost,
          }
        : c
    );

    setStoredData(STORAGE_KEYS.CONTROLLERS, updatedControllers);
    buildStations();

    return { success: true };
  };

  return {
    stations,
    isLoading,
    error: null,
    refetch: buildStations,
    startSession,
    endSession,
    addController,
    returnController,
  };
}
