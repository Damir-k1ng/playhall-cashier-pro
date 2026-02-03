// Type definitions for the POS system

export type TariffType = 'hourly' | 'package';
export type SessionStatus = 'active' | 'completed';
export type PaymentMethod = 'cash' | 'kaspi' | 'split';
export type AppRole = 'admin' | 'cashier';

export interface Station {
  id: string;
  name: string;
  zone: 'vip' | 'hall';
  station_number: number;
  hourly_rate: number;
  package_rate: number;
  created_at?: string;
}

export interface Cashier {
  id: string;
  name: string;
  pin: string;
  created_at?: string;
}

export interface Shift {
  id: string;
  cashier_id: string;
  started_at: string;
  ended_at?: string;
  total_cash: number;
  total_kaspi: number;
  total_games: number;
  total_controllers: number;
  total_drinks: number;
  is_active: boolean;
  cashier?: Cashier;
}

export interface Session {
  id: string;
  station_id: string;
  shift_id: string;
  tariff_type: TariffType;
  started_at: string;
  ended_at?: string;
  status: SessionStatus;
  game_cost: number;
  controller_cost: number;
  drink_cost: number;
  total_cost: number;
  created_at: string;
  station?: Station;
  package_count?: number; // Number of 2+1 packages purchased (default 1 for package sessions)
}

export interface ControllerUsage {
  id: string;
  session_id: string;
  taken_at: string;
  returned_at?: string;
  cost: number;
}

export interface Drink {
  id: string;
  name: string;
  price: number;
  created_at?: string;
}

export interface SessionDrink {
  id: string;
  session_id: string;
  drink_id: string;
  quantity: number;
  total_price: number;
  created_at: string;
  drink?: Drink;
}

export interface DrinkSale {
  id: string;
  shift_id: string;
  drink_id: string;
  quantity: number;
  total_price: number;
  payment_method: PaymentMethod;
  cash_amount: number;
  kaspi_amount: number;
  created_at: string;
  drink?: Drink;
}

export interface Payment {
  id: string;
  session_id: string;
  shift_id: string;
  payment_method: PaymentMethod;
  cash_amount: number;
  kaspi_amount: number;
  total_amount: number;
  created_at: string;
}

export interface Reservation {
  id: string;
  station_id: string;
  shift_id: string;
  reserved_for: string;
  customer_name?: string;
  phone?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  station?: Station;
}

export type BookingStatus = 'booked' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  station_id: string;
  booking_date: string;
  start_time: string;
  comment: string | null;
  status: BookingStatus;
  created_at: string;
}

// Extended types for UI
export interface StationWithSession extends Station {
  activeSession?: Session;
  controllers?: ControllerUsage[];
  drinks?: SessionDrink[];
  reservation?: Reservation;
  booking?: Booking;
  // Flag indicating if the current cashier owns this session (null if no active session)
  isOwnSession?: boolean | null;
}

export interface PreCheckData {
  session: Session;
  station: Station;
  controllers: ControllerUsage[];
  drinks: SessionDrink[];
  elapsedMinutes: number;
  gameCost: number;
  controllerCost: number;
  drinkCost: number;
  totalCost: number;
}

export interface ShiftReport {
  shift: Shift;
  cashier: Cashier;
  sessions: Session[];
  totalGames: number;
  totalControllers: number;
  totalDrinks: number;
  totalCash: number;
  totalKaspi: number;
  grandTotal: number;
}