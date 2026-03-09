import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import type { Cashier, Shift, AppRole, Tenant } from '@/types/database';
import { authPinLogin, authPinValidate, authPinLogout, apiClient } from '@/lib/api';
import { toast } from 'sonner';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  cashier: Cashier | null;
  shift: Shift | null;
  role: AppRole;
  tenant: Tenant | null;
}

interface AuthContextType extends AuthState {
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshShift: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TOKEN_KEY = 'svoy_session_token';
const CACHED_SESSION_KEY = 'svoy_cached_session';

// Migration: move token from sessionStorage to localStorage (one-time)
const migratedToken = sessionStorage.getItem('svoy_session_token');
if (migratedToken && !localStorage.getItem(SESSION_TOKEN_KEY)) {
  localStorage.setItem(SESSION_TOKEN_KEY, migratedToken);
  sessionStorage.removeItem('svoy_session_token');
}

// Save session data to localStorage for offline restoration
function cacheSessionData(cashier: Cashier, shift: Shift, role: AppRole, tenant: Tenant | null) {
  try {
    localStorage.setItem(CACHED_SESSION_KEY, JSON.stringify({ cashier, shift, role, tenant, cachedAt: Date.now() }));
  } catch (e) {
    // Ignore storage errors
  }
}

function getCachedSession(): { cashier: Cashier; shift: Shift; role: AppRole; tenant: Tenant | null } | null {
  try {
    const raw = localStorage.getItem(CACHED_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Cache valid for 24 hours
    if (Date.now() - parsed.cachedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(CACHED_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    cashier: null,
    shift: null,
    role: 'cashier',
    tenant: null,
  });

  // Check for active session on mount
  const checkActiveSession = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
      
      if (!storedToken) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const result = await authPinValidate(storedToken);

      if (result.valid && result.cashier && result.shift) {
        apiClient.setSessionToken(storedToken);
        
        const role = result.role || 'cashier';
        const tenant = result.tenant || null;
        // Cache session for offline use
        cacheSessionData(result.cashier, result.shift, role, tenant);
        
        setState({
          isAuthenticated: true,
          isLoading: false,
          cashier: result.cashier,
          shift: result.shift,
          role,
          tenant,
        });
      } else if (result.valid === false) {
        // Server explicitly says token is invalid — clear everything
        localStorage.removeItem(SESSION_TOKEN_KEY);
        localStorage.removeItem(CACHED_SESSION_KEY);
        apiClient.setSessionToken(null);
        setState(prev => ({ ...prev, isLoading: false }));
      } else {
        // Ambiguous response — keep token, let user retry
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      // Network error or edge function unavailable — restore from cache!
      console.warn('Session validation failed (network issue), trying cached session:', err);
      
      const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
      if (storedToken) {
        apiClient.setSessionToken(storedToken);
        
        // Restore full session from cache so cashier can keep working
        const cached = getCachedSession();
        if (cached) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            cashier: cached.cashier,
            shift: cached.shift,
            role: cached.role,
            tenant: cached.tenant,
          });
          return;
        }
      }
      
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    checkActiveSession();
  }, [checkActiveSession]);

  // Auto-reconnect: re-validate session when network comes back online
  const wasOffline = useRef(false);

  useEffect(() => {
    const handleOffline = () => {
      wasOffline.current = true;
    };

    const handleOnline = async () => {
      if (!wasOffline.current) return;
      wasOffline.current = false;

      const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
      if (!storedToken) return;

      try {
        const result = await authPinValidate(storedToken);

        if (result.valid && result.cashier && result.shift) {
          apiClient.setSessionToken(storedToken);
          const role = result.role || 'cashier';
          cacheSessionData(result.cashier, result.shift, role);

          setState({
            isAuthenticated: true,
            isLoading: false,
            cashier: result.cashier,
            shift: result.shift,
            role,
          });
          toast.success('Соединение восстановлено', {
            description: 'Данные смены обновлены',
            duration: 3000,
          });
        } else if (result.valid === false) {
          // Shift was closed while offline
          localStorage.removeItem(SESSION_TOKEN_KEY);
          localStorage.removeItem(CACHED_SESSION_KEY);
          apiClient.setSessionToken(null);
          setState({
            isAuthenticated: false,
            isLoading: false,
            cashier: null,
            shift: null,
            role: 'cashier',
          });
          toast.warning('Смена была закрыта', {
            description: 'Необходимо войти заново',
            duration: 5000,
          });
        }
      } catch {
        // Still no connection — will retry on next online event
        toast.error('Не удалось восстановить соединение', {
          description: 'Попробуйте обновить страницу',
          duration: 4000,
        });
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const refreshShift = async () => {
    try {
      const shift = await apiClient.getShift();
      if (shift) {
        setState(prev => {
          // Update cache with fresh shift data
          if (prev.cashier) {
            cacheSessionData(prev.cashier, shift, prev.role);
          }
          return { ...prev, shift };
        });
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
        localStorage.setItem(SESSION_TOKEN_KEY, result.session_token);
        apiClient.setSessionToken(result.session_token);

        const role = result.role || 'cashier';
        // Cache session for offline restoration
        cacheSessionData(result.cashier, result.shift, role);

        setState({
          isAuthenticated: true,
          isLoading: false,
          cashier: result.cashier,
          shift: result.shift,
          role,
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
      const token = localStorage.getItem(SESSION_TOKEN_KEY);
      if (token) {
        await authPinLogout(token);
      }
    } catch (err) {
      console.error('Error during logout:', err);
    }

    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(CACHED_SESSION_KEY);
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
