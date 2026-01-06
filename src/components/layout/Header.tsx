import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LogOut, User, Wallet, Coffee, Receipt, RefreshCw } from 'lucide-react';
import { CLUB_NAME } from '@/lib/constants';
import logoImage from '@/assets/logo.jpg';
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
  onOpenHistory?: () => void;
  isRefreshing?: boolean;
}

export function Header({ onOpenCashDesk, onOpenShiftReport, onOpenDrinkSales, onOpenHistory, isRefreshing }: HeaderProps) {
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
    <header className="shrink-0 z-50 glass-card border-b border-primary/10">
      <div className="flex items-center justify-between h-12 sm:h-14 lg:h-16 px-3 sm:px-4 lg:px-6">
        {/* Logo and club name */}
        <button 
          onClick={handleLogoClick}
          className="flex items-center gap-2 lg:gap-3 group transition-all duration-300 hover:opacity-80"
        >
          <div className="relative">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-lg lg:rounded-xl overflow-hidden glow-cyan transition-all duration-300 group-hover:glow-cyan-strong">
              <img src={logoImage} alt={CLUB_NAME} className="w-full h-full object-cover" />
            </div>
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-lg lg:rounded-xl bg-primary/20 blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
          </div>
          <div className="hidden sm:flex items-center gap-2 lg:gap-3">
            <h1 className="font-brand text-sm lg:text-base tracking-wide bg-gradient-to-r from-primary via-cyan-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_hsl(185_100%_50%_/_0.4)]">
              {CLUB_NAME}
            </h1>
            {isRefreshing && (
              <RefreshCw className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary animate-spin" />
            )}
          </div>
          {/* Mobile refresh indicator */}
          {isRefreshing && (
            <RefreshCw className="sm:hidden w-3.5 h-3.5 text-primary animate-spin ml-1.5" />
          )}
        </button>

        {/* Center: Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* History Button */}
          <Button
            onClick={onOpenHistory}
            className="hidden md:flex items-center gap-2 lg:gap-3 h-9 lg:h-10 px-3 lg:px-4 rounded-lg lg:rounded-xl bg-gradient-to-r from-purple-500/20 to-primary/20 border border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/20 transition-all duration-300 btn-press"
            variant="ghost"
          >
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-md lg:rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-foreground font-medium text-sm">История</span>
          </Button>

          {/* Drink Sales Button */}
          <Button
            onClick={onOpenDrinkSales}
            className="hidden md:flex items-center gap-2 lg:gap-3 h-9 lg:h-10 px-3 lg:px-4 rounded-lg lg:rounded-xl bg-gradient-to-r from-secondary/20 to-primary/20 border border-primary/30 hover:border-primary/50 hover:bg-primary/20 transition-all duration-300 btn-press"
            variant="ghost"
          >
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-md lg:rounded-lg bg-primary/20 flex items-center justify-center">
              <Coffee className="w-4 h-4 text-primary" />
            </div>
            <span className="text-foreground font-medium text-sm">Напитки</span>
          </Button>

          {/* Mobile history button */}
          <Button
            onClick={onOpenHistory}
            className="md:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-r from-purple-500/20 to-primary/20 border border-purple-500/30 p-0"
            variant="ghost"
          >
            <Receipt className="w-4 h-4 text-purple-400" />
          </Button>

          {/* Mobile drink button */}
          <Button
            onClick={onOpenDrinkSales}
            className="md:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-r from-secondary/20 to-primary/20 border border-primary/30 p-0"
            variant="ghost"
          >
            <Coffee className="w-4 h-4 text-primary" />
          </Button>
        </div>

        {/* Right side: Cash desk + User */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Cash desk summary */}
          <Button
            variant="ghost"
            className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-10 lg:h-10 px-2 sm:px-3 lg:px-4 rounded-lg lg:rounded-xl glass-card border border-success/20 hover:border-success/40 hover:glow-emerald transition-all duration-300 btn-press"
            onClick={onOpenCashDesk}
          >
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-md lg:rounded-lg bg-success/15 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success" />
            </div>
            <div className="text-right">
              <div className="hidden lg:block text-[9px] text-muted-foreground uppercase tracking-wider">
                Касса
              </div>
              <div className="font-gaming text-xs sm:text-sm font-bold text-success text-glow-emerald">
                {formatCurrency(totalShift)}
              </div>
            </div>
          </Button>

          {/* Cashier menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="gap-1.5 h-9 sm:h-10 lg:h-10 px-2 sm:px-3 rounded-lg lg:rounded-xl glass-card border border-primary/20 hover:border-primary/40 hover:glow-cyan transition-all duration-300 btn-press"
              >
                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-md lg:rounded-lg bg-primary/15 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                </div>
                <span className="hidden lg:inline text-sm font-medium">{cashier?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 glass-card border-primary/20">
              <div className="px-3 py-2">
                <p className="font-medium text-foreground text-sm">{cashier?.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Кассир</p>
              </div>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem 
                onClick={onOpenShiftReport} 
                className="cursor-pointer py-2 px-3 text-sm"
              >
                Отчёт смены
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-destructive focus:text-destructive cursor-pointer py-2 px-3 text-sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Завершить смену
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
