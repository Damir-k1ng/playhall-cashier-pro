import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Cashier, Shift, AppRole } from '@/types/database';

// Local cashiers data
const CASHIERS: Cashier[] = [
  { id: '1', name: 'Damir', pin: '1111', created_at: new Date().toISOString() },
  { id: '2', name: 'Sultan', pin: '2222', created_at: new Date().toISOString() },
  { id: '3', name: 'Aboka', pin: '3333', created_at: new Date().toISOString() },
  { id: '4', name: 'Adi', pin: '4444', created_at: new Date().toISOString() },
];

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
  updateShiftTotals: (updates: Partial<Shift>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CASHIER: 'svoy_cashier',
  SHIFT: 'svoy_shift',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    cashier: null,
    shift: null,
    role: 'cashier',
  });

  // Restore session on mount
  useEffect(() => {
    const storedCashier = localStorage.getItem(STORAGE_KEYS.CASHIER);
    const storedShift = localStorage.getItem(STORAGE_KEYS.SHIFT);

    if (storedCashier && storedShift) {
      try {
        const cashier = JSON.parse(storedCashier) as Cashier;
        const shift = JSON.parse(storedShift) as Shift;
        
        if (shift.is_active) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            cashier,
            shift,
            role: 'cashier',
          });
          return;
        }
      } catch (e) {
        console.error('Failed to restore session:', e);
      }
    }

    // Clear invalid session
    localStorage.removeItem(STORAGE_KEYS.CASHIER);
    localStorage.removeItem(STORAGE_KEYS.SHIFT);
    setState(prev => ({ ...prev, isLoading: false }));
  }, []);

  const login = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    // Find cashier by PIN
    const cashier = CASHIERS.find(c => c.pin === pin);
    
    if (!cashier) {
      return { success: false, error: 'Неверный PIN-код' };
    }

    // Create new shift
    const newShift: Shift = {
      id: generateId(),
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

    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.CASHIER, JSON.stringify(cashier));
    localStorage.setItem(STORAGE_KEYS.SHIFT, JSON.stringify(newShift));

    setState({
      isAuthenticated: true,
      isLoading: false,
      cashier,
      shift: newShift,
      role: 'cashier',
    });

    return { success: true };
  };

  const logout = async () => {
    // Update shift as ended
    if (state.shift) {
      const endedShift = {
        ...state.shift,
        is_active: false,
        ended_at: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.SHIFT, JSON.stringify(endedShift));
    }

    // Clear session
    localStorage.removeItem(STORAGE_KEYS.CASHIER);
    localStorage.removeItem(STORAGE_KEYS.SHIFT);
    
    setState({
      isAuthenticated: false,
      isLoading: false,
      cashier: null,
      shift: null,
      role: 'cashier',
    });
  };

  const updateShiftTotals = (updates: Partial<Shift>) => {
    if (!state.shift) return;

    const updatedShift = { ...state.shift, ...updates };
    localStorage.setItem(STORAGE_KEYS.SHIFT, JSON.stringify(updatedShift));
    setState(prev => ({ ...prev, shift: updatedShift }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateShiftTotals }}>
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
