import { setCacheEntry, getCacheEntry, isNetworkError } from './offline-cache';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Track consecutive 401 errors to avoid logout on transient failures
let consecutive401Count = 0;
const MAX_401_BEFORE_LOGOUT = 2;

export async function authPinLogin(pin: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', pin }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Ошибка входа');
  }
  
  return data;
}

export async function authPinValidate(sessionToken: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'validate', session_token: sessionToken }),
  });
  
  return response.json();
}

export async function authPinLogout(sessionToken: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'logout', session_token: sessionToken }),
  });
  
  return response.json();
}

// API Client for authenticated requests
class ApiClient {
  private sessionToken: string | null = null;

  setSessionToken(token: string | null) {
    this.sessionToken = token;
  }

  getSessionToken() {
    return this.sessionToken;
  }

  private async request(path: string, options: RequestInit = {}) {
    if (!this.sessionToken) {
      throw new Error('Not authenticated');
    }

    const isGet = !options.method || options.method === 'GET';

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/api${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': this.sessionToken,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          consecutive401Count++;
          if (consecutive401Count >= MAX_401_BEFORE_LOGOUT) {
            // Only force logout after multiple consecutive 401s
            localStorage.removeItem('svoy_session_token');
            localStorage.removeItem('svoy_cached_session');
            this.sessionToken = null;
            window.location.reload();
            throw new Error('Session expired');
          }
          // First 401 — might be transient, just throw without logout
          throw new Error('Authorization error');
        }
        throw new Error(data.error || 'API Error');
      }

      // Reset counter on any successful response
      consecutive401Count = 0;

      // Cache successful GET responses
      if (isGet) {
        setCacheEntry(path, data);
      }

      return data;
    } catch (err) {
      // For GET requests, try to serve from cache when offline
      if (isGet && isNetworkError(err)) {
        const cached = getCacheEntry(path);
        if (cached !== null) {
          return cached;
        }
      }
      throw err;
    }
  }

  // Stations
  async getStations() {
    return this.request('/stations');
  }

  async getStation(id: string) {
    return this.request(`/stations/${id}`);
  }

  // Drinks
  async getDrinks() {
    return this.request('/drinks');
  }

  // Sessions
  async getSession(id: string) {
    return this.request(`/sessions/${id}`);
  }

  async createSession(data: { station_id: string; tariff_type: 'hourly' | 'package' }) {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSession(id: string, data: {
    status?: 'active' | 'completed';
    ended_at?: string;
    game_cost?: number;
    controller_cost?: number;
    drink_cost?: number;
    total_cost?: number;
  }) {
    return this.request(`/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Extend package session (add +3 hours)
  async extendPackage(sessionId: string) {
    return this.request(`/sessions/${sessionId}/extend-package`, {
      method: 'POST',
    });
  }

  // Payments
  async createPayment(data: {
    session_id: string;
    payment_method: 'cash' | 'kaspi' | 'split';
    cash_amount?: number;
    kaspi_amount?: number;
    total_amount: number;
    discount_percent?: number;
    discount_amount?: number;
  }) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Discount presets (for cashiers)
  async getDiscountPresets() {
    return this.request('/discount-presets');
  }

  // Controller usage
  async createControllerUsage(data: { session_id: string }) {
    return this.request('/controller-usage', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateControllerUsage(id: string, data: { returned_at?: string; cost?: number }) {
    return this.request(`/controller-usage/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Session drinks
  async addSessionDrink(data: {
    session_id: string;
    drink_id: string;
    quantity: number;
    total_price: number;
  }) {
    return this.request('/session-drinks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteSessionDrink(id: string) {
    return this.request(`/session-drinks/${id}`, {
      method: 'DELETE',
    });
  }

  // Drink sales
  async createDrinkSale(data: {
    drink_id: string;
    quantity: number;
    total_price: number;
    payment_method: 'cash' | 'kaspi' | 'split';
    cash_amount?: number;
    kaspi_amount?: number;
  }) {
    return this.request('/drink-sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Reservations
  async getReservations() {
    return this.request('/reservations');
  }

  async createReservation(data: {
    station_id: string;
    reserved_for: string;
    customer_name?: string;
    phone?: string;
    notes?: string;
  }) {
    return this.request('/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateReservation(id: string, data: { is_active?: boolean }) {
    return this.request(`/reservations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Bookings
  async getBookings() {
    return this.request('/bookings');
  }

  async createBooking(data: {
    station_id: string;
    start_time: string;
    comment?: string;
  }) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBooking(id: string, data: { status?: 'booked' | 'cancelled' | 'completed' }) {
    return this.request(`/bookings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Shift
  async getShift() {
    return this.request('/shift');
  }

  async getShiftReport() {
    return this.request('/shift/report');
  }

  async getShiftHistory() {
    return this.request('/shift/history');
  }

  // Admin: Shifts analytics
  async getShiftsAnalytics(params: { from: string; to: string; cashier_id?: string }) {
    const queryParams = new URLSearchParams({
      from: params.from,
      to: params.to,
    });
    if (params.cashier_id) {
      queryParams.set('cashier_id', params.cashier_id);
    }
    return this.request(`/admin/shifts-analytics?${queryParams.toString()}`);
  }

  // Admin: Cashiers management
  async getCashiers() {
    return this.request('/admin/cashiers');
  }

  async createCashier(data: { name: string; pin: string }) {
    return this.request('/admin/cashiers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCashier(id: string, data: { name?: string; pin?: string }) {
    return this.request(`/admin/cashiers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCashier(id: string) {
    return this.request(`/admin/cashiers/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin: Active sessions
  async getActiveSessions() {
    return this.request('/admin/active-sessions');
  }

  async forceCloseSession(data: {
    session_id: string;
    payment_method: 'cash' | 'kaspi' | 'split';
    cash_amount?: number;
    kaspi_amount?: number;
  }) {
    return this.request('/admin/force-close-session', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Admin: Completed sessions for corrections
  async getCompletedSessions() {
    return this.request('/admin/completed-sessions');
  }

  // Admin: Drink sales for corrections
  async getDrinkSales() {
    return this.request('/admin/drink-sales');
  }

  // Admin: Audit log
  async getAuditLog() {
    return this.request('/admin/audit-log');
  }

  // Admin: Edit completed session
  async editSession(sessionId: string, data: {
    game_cost?: number;
    controller_cost?: number;
    drink_cost?: number;
    cash_amount?: number;
    kaspi_amount?: number;
    controllers?: Array<{ id: string; taken_at?: string; returned_at?: string; cost?: number }>;
    reason: string;
  }) {
    return this.request(`/admin/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Admin: Delete completed session
  async deleteSession(sessionId: string, reason: string) {
    return this.request(`/admin/sessions/${sessionId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  // Admin: Delete drink sale
  async deleteDrinkSale(saleId: string, reason: string) {
    return this.request(`/admin/drink-sales/${saleId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  // Admin: Discount presets management
  async getAdminDiscountPresets() {
    return this.request('/admin/discount-presets');
  }

  async createDiscountPreset(percent: number) {
    return this.request('/admin/discount-presets', {
      method: 'POST',
      body: JSON.stringify({ percent }),
    });
  }

  async deleteDiscountPreset(id: string) {
    return this.request(`/admin/discount-presets/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin: Update cashier max discount
  async updateCashierDiscount(id: string, maxDiscountPercent: number) {
    return this.request(`/admin/cashiers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ max_discount_percent: maxDiscountPercent }),
    });
  }
  // Admin: Drinks management
  async createDrink(data: { name: string; price: number }) {
    return this.request('/admin/drinks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDrink(id: string, data: { name?: string; price?: number }) {
    return this.request(`/admin/drinks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteDrink(id: string) {
    return this.request(`/admin/drinks/${id}`, {
      method: 'DELETE',
    });
  }

  // Inventory
  async getInventory() {
    return this.request('/admin/inventory');
  }

  async updateInventoryItem(id: string, data: { min_threshold?: number; unit?: string }) {
    return this.request(`/admin/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async createInventoryMovement(data: { drink_id: string; quantity: number; type: string; reason?: string }) {
    return this.request('/admin/inventory/movement', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInventoryMovements(drinkId?: string) {
    const params = drinkId ? `?drink_id=${drinkId}` : '';
    return this.request(`/admin/inventory/movements${params}`);
  }
  // Setup wizard (first-time club configuration)
  async setupClub(data: { stations: any[]; drinks?: any[] }) {
    return this.request('/setup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
export const apiClient = new ApiClient();
