import { useAuth } from '@/contexts/AuthContext';
import type { Session, Payment } from '@/types/database';

const STORAGE_KEYS = {
  SESSIONS: 'svoy_sessions',
  PAYMENTS: 'svoy_payments',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getStoredData<T>(key: string, defaultValue: T[]): T[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStoredData<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function usePayments() {
  const { shift, updateShiftTotals } = useAuth();

  const processPayment = async (
    sessionId: string,
    gameCost: number,
    controllerCost: number,
    drinkCost: number,
    paymentMethod: 'cash' | 'kaspi' | 'split',
    cashAmount: number,
    kaspiAmount: number
  ) => {
    if (!shift) return { error: 'Нет активной смены' };

    const totalAmount = gameCost + controllerCost + drinkCost;

    // 1. Update session with final costs
    const sessions = getStoredData<Session>(STORAGE_KEYS.SESSIONS, []);
    const updatedSessions = sessions.map(s =>
      s.id === sessionId
        ? {
            ...s,
            status: 'completed' as const,
            ended_at: new Date().toISOString(),
            game_cost: gameCost,
            controller_cost: controllerCost,
            drink_cost: drinkCost,
            total_cost: totalAmount,
          }
        : s
    );
    setStoredData(STORAGE_KEYS.SESSIONS, updatedSessions);

    // 2. Create payment record
    const payments = getStoredData<Payment>(STORAGE_KEYS.PAYMENTS, []);
    const newPayment: Payment = {
      id: generateId(),
      session_id: sessionId,
      shift_id: shift.id,
      payment_method: paymentMethod,
      cash_amount: cashAmount,
      kaspi_amount: kaspiAmount,
      total_amount: totalAmount,
      created_at: new Date().toISOString(),
    };
    payments.push(newPayment);
    setStoredData(STORAGE_KEYS.PAYMENTS, payments);

    // 3. Update shift totals
    updateShiftTotals({
      total_cash: (shift.total_cash || 0) + cashAmount,
      total_kaspi: (shift.total_kaspi || 0) + kaspiAmount,
      total_games: (shift.total_games || 0) + gameCost,
      total_controllers: (shift.total_controllers || 0) + controllerCost,
      total_drinks: (shift.total_drinks || 0) + drinkCost,
    });

    return { success: true };
  };

  const processDrinkSale = async (
    drinkId: string,
    quantity: number,
    totalPrice: number,
    paymentMethod: 'cash' | 'kaspi' | 'split',
    cashAmount: number,
    kaspiAmount: number
  ) => {
    if (!shift) return { error: 'Нет активной смены' };

    // Update shift totals
    updateShiftTotals({
      total_cash: (shift.total_cash || 0) + cashAmount,
      total_kaspi: (shift.total_kaspi || 0) + kaspiAmount,
      total_drinks: (shift.total_drinks || 0) + totalPrice,
    });

    return { success: true };
  };

  return {
    processPayment,
    processDrinkSale,
  };
}
