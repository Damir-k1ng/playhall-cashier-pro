import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Cashier, Shift, AppRole } from '@/types/database';
import { CASHIERS } from '@/lib/constants';

// Storage keys
const STORAGE_KEYS = {
  CASHIER: 'svoy_cashier',
  SHIFT: 'svoy_shift',
} as const;

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  cashier: Cashier | null;
  shift: Shift | null;
  role: AppRole;
}

interface AuthContextType extends AuthState {
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshShift: () => Promise<void>;
  updateShiftTotals: (updates: Partial<Pick<Shift, 'total_cash' | 'total_kaspi' | 'total_games' | 'total_controllers' | 'total_drinks'>>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper functions for localStorage
function getStoredCashier(): Cashier | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CASHIER);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getStoredShift(): Shift | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SHIFT);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function storeCashier(cashier: Cashier | null) {
  if (cashier) {
    localStorage.setItem(STORAGE_KEYS.CASHIER, JSON.stringify(cashier));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CASHIER);
  }
}

function storeShift(shift: Shift | null) {
  if (shift) {
    localStorage.setItem(STORAGE_KEYS.SHIFT, JSON.stringify(shift));
  } else {
    localStorage.removeItem(STORAGE_KEYS.SHIFT);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    cashier: null,
    shift: null,
    role: 'cashier',
  });

  // Check for active shift on mount and restore session from localStorage
  const checkActiveShift = useCallback(async () => {
    try {
      const storedCashier = getStoredCashier();
      const storedShift = getStoredShift();
      
      // If we have stored data and shift is active, restore session
      if (storedCashier && storedShift && storedShift.is_active) {
        setState({
          isAuthenticated: true,
          isLoading: false,
          cashier: storedCashier,
          shift: storedShift,
          role: 'cashier',
        });
      } else {
        // Clear any stale data
        storeCashier(null);
        storeShift(null);
        setState(prev => ({ ...prev, isLoading: false }));
      }
      
      // TODO: When cloud backend is ready, check for active shifts there
      // and sync with localStorage
    } catch (err) {
      console.error('Error in checkActiveShift:', err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    checkActiveShift();
  }, [checkActiveShift]);

  // Listen for localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.SHIFT && e.newValue) {
        try {
          const updatedShift = JSON.parse(e.newValue) as Shift;
          setState(prev => ({
            ...prev,
            shift: updatedShift,
          }));
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const refreshShift = async () => {
    const storedShift = getStoredShift();
    if (storedShift) {
      setState(prev => ({
        ...prev,
        shift: storedShift,
      }));
    }
  };

  const updateShiftTotals = (updates: Partial<Pick<Shift, 'total_cash' | 'total_kaspi' | 'total_games' | 'total_controllers' | 'total_drinks'>>) => {
    setState(prev => {
      if (!prev.shift) return prev;
      
      const updatedShift = {
        ...prev.shift,
        ...updates,
      };
      
      // Persist to localStorage
      storeShift(updatedShift);
      
      return {
        ...prev,
        shift: updatedShift,
      };
    });
  };

  const login = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    // Find the cashier by PIN from constants
    const cashierConfig = CASHIERS.find(c => c.pin === pin);

    if (!cashierConfig) {
      return { success: false, error: 'Неверный PIN-код' };
    }

    const cashier: Cashier = {
      id: cashierConfig.id,
      name: cashierConfig.name,
      pin: cashierConfig.pin,
      created_at: new Date().toISOString(),
    };

    // Check if there's already an active shift in localStorage
    const existingShift = getStoredShift();

    if (existingShift && existingShift.is_active) {
      // Connect to existing active shift
      setState({
        isAuthenticated: true,
        isLoading: false,
        cashier,
        shift: existingShift,
        role: 'cashier',
      });
      
      storeCashier(cashier);
      return { success: true };
    }

    // Create new shift
    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      cashier_id: cashier.id,
      started_at: new Date().toISOString(),
      ended_at: null,
      is_active: true,
      total_cash: 0,
      total_kaspi: 0,
      total_games: 0,
      total_controllers: 0,
      total_drinks: 0,
    };

    setState({
      isAuthenticated: true,
      isLoading: false,
      cashier,
      shift: newShift,
      role: 'cashier',
    });

    storeCashier(cashier);
    storeShift(newShift);
    
    return { success: true };
  };

  const logout = async () => {
    if (state.shift) {
      // End the shift
      const endedShift: Shift = {
        ...state.shift,
        is_active: false,
        ended_at: new Date().toISOString(),
      };
      storeShift(endedShift);
    }

    storeCashier(null);
    storeShift(null);
    
    setState({
      isAuthenticated: false,
      isLoading: false,
      cashier: null,
      shift: null,
      role: 'cashier',
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshShift, updateShiftTotals }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
