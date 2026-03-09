import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
        fetchPlatformUser(session.user.id);
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
      await fetchPlatformUser(session.user.id);
    } else {
      setIsLoading(false);
    }
  }

  async function fetchPlatformUser(authUserId: string) {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('auth_user_id', authUserId)
        .eq('role', 'platform_owner')
        .single();

      if (data) {
        setUser({ id: data.id, name: data.name, email: data.email || '', role: data.role });
        setIsAuthenticated(true);
      } else {
        // Not a platform_owner
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch {
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
