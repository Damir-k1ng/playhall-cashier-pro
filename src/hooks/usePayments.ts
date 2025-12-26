import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function usePayments() {
  const { shift, refreshShift } = useAuth();

  const processPayment = async (
    sessionId: string,
    gameCost: number,
    controllerCost: number,
    drinkCost: number,
    paymentMethod: 'cash' | 'kaspi' | 'split',
    cashAmount: number,
    kaspiAmount: number
  ) => {
    if (!shift?.id) return { error: 'Нет активной смены' };

    const totalAmount = gameCost + controllerCost + drinkCost;

    try {
      // 1. Update session with final costs
      const { error: sessionError } = await supabase
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          game_cost: gameCost,
          controller_cost: controllerCost,
          drink_cost: drinkCost,
          total_cost: totalAmount,
        })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      // 2. Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          session_id: sessionId,
          shift_id: shift.id,
          payment_method: paymentMethod,
          cash_amount: cashAmount,
          kaspi_amount: kaspiAmount,
          total_amount: totalAmount,
        });

      if (paymentError) throw paymentError;

      // 3. Update shift totals
      const { error: shiftError } = await supabase
        .from('shifts')
        .update({
          total_cash: (shift.total_cash || 0) + cashAmount,
          total_kaspi: (shift.total_kaspi || 0) + kaspiAmount,
          total_games: (shift.total_games || 0) + gameCost,
          total_controllers: (shift.total_controllers || 0) + controllerCost,
          total_drinks: (shift.total_drinks || 0) + drinkCost,
        })
        .eq('id', shift.id);

      if (shiftError) throw shiftError;

      // Play success sound
      playSuccessSound();

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }

      // Refresh shift data
      await refreshShift();

      return { success: true };
    } catch (err: any) {
      console.error('Error processing payment:', err);
      return { error: err.message || 'Ошибка обработки платежа' };
    }
  };

  const processDrinkSale = async (
    drinkId: string,
    quantity: number,
    totalPrice: number,
    paymentMethod: 'cash' | 'kaspi' | 'split',
    cashAmount: number,
    kaspiAmount: number
  ) => {
    if (!shift?.id) return { error: 'Нет активной смены' };

    try {
      // 1. Create drink sale record
      const { error: saleError } = await supabase
        .from('drink_sales')
        .insert({
          shift_id: shift.id,
          drink_id: drinkId,
          quantity,
          total_price: totalPrice,
          payment_method: paymentMethod,
          cash_amount: cashAmount,
          kaspi_amount: kaspiAmount,
        });

      if (saleError) throw saleError;

      // 2. Update shift totals
      const { error: shiftError } = await supabase
        .from('shifts')
        .update({
          total_cash: (shift.total_cash || 0) + cashAmount,
          total_kaspi: (shift.total_kaspi || 0) + kaspiAmount,
          total_drinks: (shift.total_drinks || 0) + totalPrice,
        })
        .eq('id', shift.id);

      if (shiftError) throw shiftError;

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }

      // Refresh shift data
      await refreshShift();

      return { success: true };
    } catch (err: any) {
      console.error('Error processing drink sale:', err);
      return { error: err.message || 'Ошибка продажи напитка' };
    }
  };

  return {
    processPayment,
    processDrinkSale,
  };
}

function playSuccessSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 880; // A5
    gainNode.gain.value = 0.1;
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
    
    // Second note
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 1318.51; // E6
      gain2.gain.value = 0.1;
      osc2.start();
      osc2.stop(audioContext.currentTime + 0.15);
    }, 100);
  } catch (err) {
    // Audio not supported
  }
}
