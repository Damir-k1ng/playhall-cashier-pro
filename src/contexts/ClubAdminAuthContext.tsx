import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClubAdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_id: string;
  tenant_slug: string;
  club_name: string;
}

interface ClubAdminAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: ClubAdminUser | null;
  login: (email: string, password: string, slug: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const ClubAdminAuthContext = createContext<ClubAdminAuthContextType | undefined>(undefined);

export function ClubAdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<ClubAdminUser | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchClubAdmin(session.user.id);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
      }
    });

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchClubAdmin(session.user.id);
    } else {
      setIsLoading(false);
    }
  }

  async function fetchClubAdmin(authUserId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, tenant_id')
        .eq('auth_user_id', authUserId)
        .eq('role', 'club_admin')
        .maybeSingle();

      if (error) throw error;

      if (data && data.tenant_id) {
        // Fetch tenant info
        const { data: tenant } = await supabase
          .from('tenants')
          .select('slug, club_name')
          .eq('id', data.tenant_id)
          .single();

        if (tenant) {
          setUser({
            id: data.id,
            name: data.name,
            email: data.email || '',
            role: data.role,
            tenant_id: data.tenant_id,
            tenant_slug: tenant.slug,
            club_name: tenant.club_name,
          });
          setIsAuthenticated(true);
        } else {
          await supabase.auth.signOut();
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        // Not a club_admin — don't sign out (might be platform_owner)
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);
  }

  async function login(email: string, password: string, slug: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    // After sign in, verify the user is club_admin for this slug
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { success: false, error: 'Ошибка авторизации' };

    const { data } = await supabase
      .from('users')
      .select('id, name, email, role, tenant_id')
      .eq('auth_user_id', session.user.id)
      .eq('role', 'club_admin')
      .maybeSingle();

    if (!data || !data.tenant_id) {
      await supabase.auth.signOut();
      return { success: false, error: 'У вас нет прав администратора клуба' };
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug, club_name')
      .eq('id', data.tenant_id)
      .single();

    if (!tenant || tenant.slug !== slug) {
      await supabase.auth.signOut();
      return { success: false, error: 'Этот аккаунт не привязан к данному клубу' };
    }

    setUser({
      id: data.id,
      name: data.name,
      email: data.email || '',
      role: data.role,
      tenant_id: data.tenant_id,
      tenant_slug: tenant.slug,
      club_name: tenant.club_name,
    });
    setIsAuthenticated(true);
    return { success: true };
  }

  async function logout() {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUser(null);
  }

  return (
    <ClubAdminAuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
      {children}
    </ClubAdminAuthContext.Provider>
  );
}

export function useClubAdminAuth() {
  const context = useContext(ClubAdminAuthContext);
  if (!context) throw new Error('useClubAdminAuth must be used within ClubAdminAuthProvider');
  return context;
}
