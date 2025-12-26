import { useState, useEffect } from 'react';
import { FALLBACK_DRINKS } from '@/lib/constants';
import type { Drink, SessionDrink } from '@/types/database';

const STORAGE_KEY = 'svoy_session_drinks';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getStoredDrinks(): SessionDrink[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setStoredDrinks(data: SessionDrink[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useDrinks() {
  const [drinks] = useState<Drink[]>(FALLBACK_DRINKS as unknown as Drink[]);
  const [isLoading] = useState(false);

  const addDrinkToSession = async (sessionId: string, drinkId: string, quantity: number, price: number) => {
    const sessionDrinks = getStoredDrinks();
    
    // Check if drink already exists in session
    const existingIndex = sessionDrinks.findIndex(
      d => d.session_id === sessionId && d.drink_id === drinkId
    );

    if (existingIndex >= 0) {
      // Update quantity
      const existing = sessionDrinks[existingIndex];
      sessionDrinks[existingIndex] = {
        ...existing,
        quantity: existing.quantity + quantity,
        total_price: (existing.quantity + quantity) * price,
      };
    } else {
      // Insert new
      const newDrink: SessionDrink = {
        id: generateId(),
        session_id: sessionId,
        drink_id: drinkId,
        quantity,
        total_price: price * quantity,
        created_at: new Date().toISOString(),
      };
      sessionDrinks.push(newDrink);
    }

    setStoredDrinks(sessionDrinks);
    
    // Trigger storage event for cross-component sync
    window.dispatchEvent(new Event('storage'));

    return { success: true };
  };

  return {
    drinks,
    isLoading,
    addDrinkToSession,
  };
}
