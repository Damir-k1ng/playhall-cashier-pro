import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';

export function usePayments() {
  const { shift, refreshShift } = useAuth();

  const processPayment = async (
    sessionId: string,
    gameCost: number,
    controllerCost: number,
    drinkCost: number,
    paymentMethod: 'cash' | 'kaspi' | 'split',
    cashAmount: number,
    kaspiAmount: number,
    discountPercent: number = 0,
    discountAmount: number = 0
  ) => {
    if (!shift?.id) return { error: 'Нет активной смены' };

    const totalAmount = gameCost + controllerCost + drinkCost - discountAmount;

    try {
      // 1. Update session with final costs
      await apiClient.updateSession(sessionId, {
        status: 'completed',
        ended_at: new Date().toISOString(),
        game_cost: gameCost,
        controller_cost: controllerCost,
        drink_cost: drinkCost,
        total_cost: totalAmount,
      });

      // 2. Create payment record
      await apiClient.createPayment({
        session_id: sessionId,
        payment_method: paymentMethod,
        cash_amount: cashAmount,
        kaspi_amount: kaspiAmount,
        total_amount: totalAmount,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
      });

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
      // Create drink sale record
      await apiClient.createDrinkSale({
        drink_id: drinkId,
        quantity,
        total_price: totalPrice,
        payment_method: paymentMethod,
        cash_amount: cashAmount,
        kaspi_amount: kaspiAmount,
      });

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
