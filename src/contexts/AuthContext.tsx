import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Cashier, Shift, AppRole } from '@/types/database';
import { authPinLogin, authPinValidate, authPinLogout, apiClient } from '@/lib/api';

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

const SESSION_TOKEN_KEY = 'svoy_session_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    cashier: null,
    shift: null,
    role: 'cashier',
  });

  // Check for active session on mount
  const checkActiveSession = useCallback(async () => {
    try {
      const storedToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
      
      if (!storedToken) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const result = await authPinValidate(storedToken);

      if (result.valid && result.cashier && result.shift) {
        apiClient.setSessionToken(storedToken);
        
        setState({
          isAuthenticated: true,
          isLoading: false,
          cashier: result.cashier,
          shift: result.shift,
          role: result.role || 'cashier',
        });
      } else {
        // Invalid token, clear it
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        apiClient.setSessionToken(null);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      console.error('Error in checkActiveSession:', err);
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      apiClient.setSessionToken(null);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    checkActiveSession();
  }, [checkActiveSession]);

  const refreshShift = async () => {
    try {
      const shift = await apiClient.getShift();
      if (shift) {
        setState(prev => ({
          ...prev,
          shift,
        }));
      }
    } catch (err) {
      console.error('Error refreshing shift:', err);
    }
  };

  const login = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await authPinLogin(pin);

      if (result.cashier && result.shift && result.session_token) {
        // Store session token
        sessionStorage.setItem(SESSION_TOKEN_KEY, result.session_token);
        apiClient.setSessionToken(result.session_token);

        setState({
          isAuthenticated: true,
          isLoading: false,
          cashier: result.cashier,
          shift: result.shift,
          role: result.role || 'cashier',
        });

        return { success: true };
      }

      return { success: false, error: 'Неизвестная ошибка' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Ошибка входа' };
    }
  };

  const logout = async () => {
    try {
      const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
      if (token) {
        await authPinLogout(token);
      }
    } catch (err) {
      console.error('Error during logout:', err);
    }

    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    apiClient.setSessionToken(null);
    
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
