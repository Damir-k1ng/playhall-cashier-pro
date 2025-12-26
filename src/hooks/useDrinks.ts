import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Drink, SessionDrink } from '@/types/database';

export function useDrinks() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDrinks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('drinks')
        .select('*')
        .order('name');

      if (error) throw error;

      setDrinks(data.map(d => ({
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
      // Check if drink already exists for this session
      const { data: existing } = await supabase
        .from('session_drinks')
        .select('*')
        .eq('session_id', sessionId)
        .eq('drink_id', drinkId)
        .maybeSingle();

      if (existing) {
        // Update quantity
        const newQuantity = existing.quantity + quantity;
        const { error } = await supabase
          .from('session_drinks')
          .update({
            quantity: newQuantity,
            total_price: newQuantity * price,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('session_drinks')
          .insert({
            session_id: sessionId,
            drink_id: drinkId,
            quantity,
            total_price: price * quantity,
          });

        if (error) throw error;
      }

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
