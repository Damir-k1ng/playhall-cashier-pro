import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LogOut, User, Wallet, Coffee } from 'lucide-react';
import { DualSenseIcon } from '@/components/icons/DualSenseIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onOpenCashDesk?: () => void;
  onOpenShiftReport?: () => void;
  onOpenDrinkSales?: () => void;
}

export function Header({ onOpenCashDesk, onOpenShiftReport, onOpenDrinkSales }: HeaderProps) {
  const navigate = useNavigate();
  const { cashier, shift, logout } = useAuth();

  const handleLogout = async () => {
    if (confirm('Вы уверены, что хотите завершить смену?')) {
      await logout();
    }
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  const totalShift = (shift?.total_cash || 0) + (shift?.total_kaspi || 0);

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-primary/10">
      <div className="flex items-center justify-between h-18 px-4 md:px-6">
        {/* Logo and club name */}
        <button 
          onClick={handleLogoClick}
          className="flex items-center gap-3 group transition-all duration-300 hover:opacity-80"
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center glow-cyan transition-all duration-300 group-hover:glow-cyan-strong">
              <DualSenseIcon size={28} className="text-primary-foreground" />
            </div>
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-xl bg-primary/20 blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-gaming font-bold text-lg text-primary tracking-wide text-glow-cyan">
              SVOY
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest -mt-0.5">
              PlayStation club
            </p>
          </div>
        </button>

        {/* Center: Drink Sales Button */}
        <Button
          onClick={onOpenDrinkSales}
          className="hidden md:flex items-center gap-3 h-12 px-6 rounded-xl bg-gradient-to-r from-secondary/20 to-primary/20 border border-primary/30 hover:border-primary/50 hover:bg-primary/20 transition-all duration-300 btn-press"
          variant="ghost"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <Coffee className="w-5 h-5 text-primary" />
          </div>
          <span className="text-foreground font-medium">Напитки</span>
        </Button>

        {/* Mobile drink button */}
        <Button
          onClick={onOpenDrinkSales}
          className="md:hidden w-11 h-11 rounded-xl bg-gradient-to-r from-secondary/20 to-primary/20 border border-primary/30 p-0"
          variant="ghost"
        >
          <Coffee className="w-5 h-5 text-primary" />
        </Button>

        {/* Right side: Cash desk + User */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Cash desk summary */}
          <Button
            variant="ghost"
            className="flex items-center gap-2 md:gap-3 h-11 md:h-12 px-3 md:px-5 rounded-xl glass-card border border-success/20 hover:border-success/40 hover:glow-emerald transition-all duration-300 btn-press"
            onClick={onOpenCashDesk}
          >
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-success/15 flex items-center justify-center">
              <Wallet className="w-4 h-4 md:w-5 md:h-5 text-success" />
            </div>
            <div className="text-right">
              <div className="hidden md:block text-[10px] text-muted-foreground uppercase tracking-wider">
                Касса
              </div>
              <div className="font-gaming text-sm md:text-base font-bold text-success text-glow-emerald">
                {formatCurrency(totalShift)}
              </div>
            </div>
          </Button>

          {/* Cashier menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="gap-2 h-11 md:h-12 px-3 md:px-4 rounded-xl glass-card border border-primary/20 hover:border-primary/40 hover:glow-cyan transition-all duration-300 btn-press"
              >
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <span className="hidden lg:inline text-sm font-medium">{cashier?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 glass-card border-primary/20">
              <div className="px-4 py-3">
                <p className="font-medium text-foreground">{cashier?.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Кассир</p>
              </div>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem 
                onClick={onOpenShiftReport} 
                className="cursor-pointer py-3 px-4"
              >
                Отчёт смены
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-destructive focus:text-destructive cursor-pointer py-3 px-4"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Завершить смену
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
