import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

class PlatformApiClient {
  private async getAuthToken(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('Not authenticated');
    return token;
  }

  private async request(path: string, options: RequestInit = {}) {
    const token = await this.getAuthToken();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'API Error');
    return data;
  }

  // Tenants
  async getTenants() {
    return this.request('/platform/tenants');
  }

  async createTenant(data: { club_name: string; city?: string; signup_email?: string; signup_phone?: string }) {
    return this.request('/platform/tenants', { method: 'POST', body: JSON.stringify(data) });
  }

  async approveTenant(tenantId: string, trialDays: number = 14) {
    return this.request(`/platform/tenants/${tenantId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ trial_days: trialDays }),
    });
  }

  async rejectTenant(tenantId: string) {
    return this.request(`/platform/tenants/${tenantId}/reject`, { method: 'PATCH' });
  }

  async suspendTenant(tenantId: string) {
    return this.request(`/platform/tenants/${tenantId}/suspend`, { method: 'PATCH' });
  }

  async blockTenant(tenantId: string) {
    return this.request(`/platform/tenants/${tenantId}/block`, { method: 'PATCH' });
  }

  async extendTrial(tenantId: string, days: number) {
    return this.request(`/platform/tenants/${tenantId}/extend-trial`, {
      method: 'PATCH',
      body: JSON.stringify({ days }),
    });
  }

  // Billing
  async getPlans() {
    return this.request('/platform/plans');
  }

  async getSubscriptions() {
    return this.request('/platform/subscriptions');
  }

  async createSubscription(data: {
    tenant_id: string;
    plan_id: string;
    billing_cycle_id: string;
    mark_paid?: boolean;
    payment_method?: string;
  }) {
    return this.request('/platform/subscriptions', { method: 'POST', body: JSON.stringify(data) });
  }

  async getSubscriptionPayments() {
    return this.request('/platform/subscription-payments');
  }
}

export const platformApi = new PlatformApiClient();
