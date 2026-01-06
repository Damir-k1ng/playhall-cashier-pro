const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

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
      throw new Error(data.error || 'API Error');
    }

    return data;
  }

  // Stations
  async getStations() {
    return this.request('/stations');
  }

  // Drinks
  async getDrinks() {
    return this.request('/drinks');
  }

  // Sessions
  async createSession(data: any) {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSession(id: string, data: any) {
    return this.request(`/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Payments
  async createPayment(data: any) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Controller usage
  async createControllerUsage(data: any) {
    return this.request('/controller-usage', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateControllerUsage(id: string, data: any) {
    return this.request(`/controller-usage/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Session drinks
  async addSessionDrink(data: any) {
    return this.request('/session-drinks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Drink sales
  async createDrinkSale(data: any) {
    return this.request('/drink-sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Reservations
  async createReservation(data: any) {
    return this.request('/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateReservation(id: string, data: any) {
    return this.request(`/reservations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Bookings
  async createBooking(data: any) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBooking(id: string, data: any) {
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
}

export const apiClient = new ApiClient();
