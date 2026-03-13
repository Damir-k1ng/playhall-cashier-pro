import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { platformApi } from '@/lib/platform-api';

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface PlatformAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: PlatformUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const PlatformAuthContext = createContext<PlatformAuthContextType | undefined>(undefined);

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<PlatformUser | null>(null);

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchPlatformUser();
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchPlatformUser();
    } else {
      setIsLoading(false);
    }
  }

  async function fetchPlatformUser() {
    try {
      const data = await platformApi.getMe();

      if (data && data.id) {
        setUser({ id: data.id, name: data.name, email: data.email || '', role: data.role });
        setIsAuthenticated(true);
      } else {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (err: any) {
      const message = err?.message || '';
      if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
        await supabase.auth.signOut();
      }
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);
  }

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async function logout() {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUser(null);
  }

  return (
    <PlatformAuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
      {children}
    </PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth() {
  const context = useContext(PlatformAuthContext);
  if (!context) throw new Error('usePlatformAuth must be used within PlatformAuthProvider');
  return context;
}
