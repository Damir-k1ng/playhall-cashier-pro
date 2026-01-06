import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Delete, Loader2 } from 'lucide-react';
import { CLUB_NAME } from '@/lib/constants';
import logoImage from '@/assets/logo.jpg';

export function PinLogin() {
  const { login } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
      setError('');
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError('Введите 4-значный PIN');
      return;
    }

    setIsLoading(true);
    const result = await login(pin);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Ошибка входа');
      setPin('');
      
      // Error haptic
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    }
  };

  // Auto-submit when 4 digits entered
  React.useEffect(() => {
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="h-screen flex flex-col items-center justify-center overflow-hidden bg-background p-4">
      {/* Background effects */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,hsl(185_100%_50%_/_0.05)_0%,transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(155_100%_45%_/_0.03)_0%,transparent_50%)] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo and club name */}
        <div className="mb-6 sm:mb-12 text-center">
          <div className="relative">
            <div className="w-20 h-20 sm:w-28 sm:h-28 mx-auto mb-4 sm:mb-8 rounded-2xl overflow-hidden glow-cyan-strong">
              <img src={logoImage} alt={CLUB_NAME} className="w-full h-full object-cover" />
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 w-20 h-20 sm:w-28 sm:h-28 mx-auto rounded-2xl bg-primary/40 blur-3xl" />
          </div>
          <h1 className="font-brand text-2xl sm:text-4xl tracking-wide mb-2 bg-gradient-to-r from-primary via-cyan-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_hsl(185_100%_50%_/_0.5)]">
            {CLUB_NAME}
          </h1>
          <p className="text-muted-foreground mt-4 sm:mt-8 text-base sm:text-lg">Введите PIN для входа</p>
        </div>

        {/* PIN display */}
        <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full transition-all duration-200 ${
                i < pin.length 
                  ? 'bg-primary scale-125 shadow-[0_0_15px_hsl(185_100%_50%_/_0.8)]' 
                  : 'bg-muted/50 border border-border'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-destructive text-sm mb-4 animate-in fade-in font-medium">{error}</p>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Вход...</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-[260px] sm:max-w-[320px]">
          {digits.map((digit, i) => {
            if (digit === '') {
              return <div key={i} />;
            }
            if (digit === 'del') {
              return (
                <Button
                  key={i}
                  variant="ghost"
                  size="lg"
                  className="h-16 w-20 sm:h-20 sm:w-24 text-xl rounded-xl sm:rounded-2xl hover:bg-muted/50 transition-all duration-200 active:scale-95"
                  onClick={handleDelete}
                  disabled={isLoading || pin.length === 0}
                >
                  <Delete className="w-6 h-6 sm:w-7 sm:h-7" />
                </Button>
              );
            }
            return (
              <Button
                key={i}
                variant="secondary"
                size="lg"
                className="h-16 w-20 sm:h-20 sm:w-24 text-2xl sm:text-3xl font-medium rounded-xl sm:rounded-2xl hover:bg-accent hover:border-primary/30 border border-transparent transition-all duration-200 active:scale-95"
                onClick={() => handleDigit(digit)}
                disabled={isLoading}
              >
                {digit}
              </Button>
            );
          })}
        </div>

        {/* Clear button */}
        <Button
          variant="ghost"
          className="mt-4 sm:mt-8 text-muted-foreground hover:text-foreground text-sm sm:text-base"
          onClick={handleClear}
          disabled={isLoading || pin.length === 0}
        >
          Очистить
        </Button>
      </div>
    </div>
  );
}
