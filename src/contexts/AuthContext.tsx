import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Cashier, Shift, AppRole } from '@/types/database';
import { CASHIERS } from '@/lib/constants';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    cashier: null,
    shift: null,
    role: 'cashier',
  });

  // Check for active shift on mount and restore session
  const checkActiveShift = useCallback(async () => {
    try {
      // First check if we have a stored cashier ID in sessionStorage (survives page refresh but not browser close)
      const storedCashierId = sessionStorage.getItem('svoy_cashier_id');
      
      // Try to find an active shift
      const { data: activeShift, error } = await supabase
        .from('shifts')
        .select('*, cashiers(*)')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking active shift:', error);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (activeShift) {
        // There's an active shift - connect to it
        const cashier = activeShift.cashiers as unknown as Cashier;
        
        setState({
          isAuthenticated: true,
          isLoading: false,
          cashier: {
            id: cashier.id,
            name: cashier.name,
            pin: cashier.pin,
            created_at: cashier.created_at,
          },
          shift: {
            id: activeShift.id,
            cashier_id: activeShift.cashier_id,
            started_at: activeShift.started_at,
            ended_at: activeShift.ended_at,
            is_active: activeShift.is_active,
            total_cash: activeShift.total_cash,
            total_kaspi: activeShift.total_kaspi,
            total_games: activeShift.total_games,
            total_controllers: activeShift.total_controllers,
            total_drinks: activeShift.total_drinks,
          },
          role: 'cashier',
        });
        
        if (cashier) {
          sessionStorage.setItem('svoy_cashier_id', cashier.id);
        }
      } else {
        // No active shift
        sessionStorage.removeItem('svoy_cashier_id');
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      console.error('Error in checkActiveShift:', err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    checkActiveShift();
  }, [checkActiveShift]);

  // Set up real-time subscription for shift updates
  useEffect(() => {
    if (!state.shift?.id) return;

    const channel = supabase
      .channel('shift-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shifts',
          filter: `id=eq.${state.shift.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setState(prev => ({
            ...prev,
            shift: prev.shift ? {
              ...prev.shift,
              total_cash: updated.total_cash,
              total_kaspi: updated.total_kaspi,
              total_games: updated.total_games,
              total_controllers: updated.total_controllers,
              total_drinks: updated.total_drinks,
              is_active: updated.is_active,
              ended_at: updated.ended_at,
            } : null,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.shift?.id]);

  const refreshShift = async () => {
    if (!state.shift?.id) return;
    
    const { data: shift } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', state.shift.id)
      .single();
    
    if (shift) {
      setState(prev => ({
        ...prev,
        shift: {
          id: shift.id,
          cashier_id: shift.cashier_id,
          started_at: shift.started_at,
          ended_at: shift.ended_at,
          is_active: shift.is_active,
          total_cash: shift.total_cash,
          total_kaspi: shift.total_kaspi,
          total_games: shift.total_games,
          total_controllers: shift.total_controllers,
          total_drinks: shift.total_drinks,
        },
      }));
    }
  };

  const login = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    // First find the cashier by PIN from the database
    const { data: cashierData, error: cashierError } = await supabase
      .from('cashiers')
      .select('*')
      .eq('pin', pin)
      .maybeSingle();

    if (cashierError || !cashierData) {
      return { success: false, error: 'Неверный PIN-код' };
    }

    const cashier: Cashier = {
      id: cashierData.id,
      name: cashierData.name,
      pin: cashierData.pin,
      created_at: cashierData.created_at,
    };

    // Check if there's already an active shift (from any cashier)
    const { data: existingShift } = await supabase
      .from('shifts')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (existingShift) {
      // Connect to existing active shift
      setState({
        isAuthenticated: true,
        isLoading: false,
        cashier,
        shift: {
          id: existingShift.id,
          cashier_id: existingShift.cashier_id,
          started_at: existingShift.started_at,
          ended_at: existingShift.ended_at,
          is_active: existingShift.is_active,
          total_cash: existingShift.total_cash,
          total_kaspi: existingShift.total_kaspi,
          total_games: existingShift.total_games,
          total_controllers: existingShift.total_controllers,
          total_drinks: existingShift.total_drinks,
        },
        role: 'cashier',
      });
      
      sessionStorage.setItem('svoy_cashier_id', cashier.id);
      return { success: true };
    }

    // Create new shift
    const { data: newShift, error: shiftError } = await supabase
      .from('shifts')
      .insert({
        cashier_id: cashier.id,
        is_active: true,
        total_cash: 0,
        total_kaspi: 0,
        total_games: 0,
        total_controllers: 0,
        total_drinks: 0,
      })
      .select()
      .single();

    if (shiftError || !newShift) {
      console.error('Error creating shift:', shiftError);
      return { success: false, error: 'Ошибка создания смены' };
    }

    setState({
      isAuthenticated: true,
      isLoading: false,
      cashier,
      shift: {
        id: newShift.id,
        cashier_id: newShift.cashier_id,
        started_at: newShift.started_at,
        ended_at: newShift.ended_at,
        is_active: newShift.is_active,
        total_cash: newShift.total_cash,
        total_kaspi: newShift.total_kaspi,
        total_games: newShift.total_games,
        total_controllers: newShift.total_controllers,
        total_drinks: newShift.total_drinks,
      },
      role: 'cashier',
    });

    sessionStorage.setItem('svoy_cashier_id', cashier.id);
    return { success: true };
  };

  const logout = async () => {
    if (state.shift?.id) {
      // End the shift
      await supabase
        .from('shifts')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
        })
        .eq('id', state.shift.id);
    }

    sessionStorage.removeItem('svoy_cashier_id');
    
    setState({
      isAuthenticated: false,
      isLoading: false,
      cashier: null,
      shift: null,
      role: 'cashier',
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshShift }}>
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
