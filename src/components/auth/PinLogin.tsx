import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Delete, Loader2 } from 'lucide-react';
import { DualSenseIcon } from '@/components/icons/DualSenseIcon';

export function PinLogin() {
  const { login } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
      setError('');
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Logo and club name */}
      <div className="mb-12 text-center">
        <div className="relative">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center glow-cyan">
            <DualSenseIcon size={56} className="text-primary-foreground" />
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-2xl bg-primary/30 blur-2xl" />
        </div>
        <h1 className="font-gaming font-bold text-3xl text-primary tracking-wide text-glow-cyan">
          SVOY
        </h1>
        <p className="text-sm text-muted-foreground uppercase tracking-widest mt-1">
          PlayStation club
        </p>
        <p className="text-muted-foreground mt-6">Введите PIN для входа</p>
      </div>

      {/* PIN display */}
      <div className="flex gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all ${
              i < pin.length ? 'bg-primary scale-110' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-destructive text-sm mb-4 animate-in fade-in">{error}</p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 mb-4 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Вход...</span>
        </div>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 max-w-[280px]">
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
                className="h-16 w-20 text-xl rounded-2xl"
                onClick={handleDelete}
                disabled={isLoading || pin.length === 0}
              >
                <Delete className="w-6 h-6" />
              </Button>
            );
          }
          return (
            <Button
              key={i}
              variant="secondary"
              size="lg"
              className="h-16 w-20 text-2xl font-medium rounded-2xl hover:bg-accent"
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
        className="mt-6 text-muted-foreground"
        onClick={handleClear}
        disabled={isLoading || pin.length === 0}
      >
        Очистить
      </Button>
    </div>
  );
}