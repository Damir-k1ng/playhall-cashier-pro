import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import type { Drink } from '@/types/database';

export function useDrinks() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDrinks = useCallback(async () => {
    try {
      const data = await apiClient.getDrinks();
      setDrinks(data.map((d: any) => ({
        id: d.id,
        name: d.name,
        price: d.price,
        created_at: d.created_at,
      })));
    } catch (err) {
      console.error('Error fetching drinks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrinks();
  }, [fetchDrinks]);

  const addDrinkToSession = async (sessionId: string, drinkId: string, quantity: number, price: number) => {
    try {
      await apiClient.addSessionDrink({
        session_id: sessionId,
        drink_id: drinkId,
        quantity,
        total_price: price * quantity,
      });

      return { success: true };
    } catch (err: any) {
      console.error('Error adding drink to session:', err);
      return { error: err.message || 'Ошибка добавления напитка' };
    }
  };

  return {
    drinks,
    isLoading,
    addDrinkToSession,
    refetch: fetchDrinks,
  };
}
