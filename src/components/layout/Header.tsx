import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LogOut, User, Wallet, Coffee, Receipt, RefreshCw, Shield, BarChart3 } from 'lucide-react';
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
  const { cashier, shift, role, logout } = useAuth();

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
      <div className="flex items-center justify-between h-18 px-4 md:px-6">
        {/* Logo and club name */}
        <button 
          onClick={handleLogoClick}
          className="flex items-center gap-3 group transition-all duration-300 hover:opacity-80"
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-xl overflow-hidden glow-cyan transition-all duration-300 group-hover:glow-cyan-strong">
              <img src={logoImage} alt={CLUB_NAME} className="w-full h-full object-cover" />
            </div>
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-xl bg-primary/20 blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <h1 className="font-brand text-base tracking-wide bg-gradient-to-r from-primary via-cyan-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_hsl(185_100%_50%_/_0.4)]">
              {CLUB_NAME}
            </h1>
            {isRefreshing && (
              <RefreshCw className="w-4 h-4 text-primary animate-spin" />
            )}
          </div>
          {/* Mobile refresh indicator */}
          {isRefreshing && (
            <RefreshCw className="sm:hidden w-4 h-4 text-primary animate-spin ml-2" />
          )}
        </button>

        {/* Center: Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Analytics Button (Admin only) */}
          {role === 'admin' && (
            <>
              <Button
                onClick={() => navigate('/admin/cashiers?tab=analytics')}
                className="hidden md:flex items-center gap-3 h-12 px-5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/20 transition-all duration-300 btn-press"
                variant="ghost"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-foreground font-medium">Аналитика</span>
              </Button>
              {/* Mobile analytics button */}
              <Button
                onClick={() => navigate('/admin/cashiers?tab=analytics')}
                className="md:hidden w-11 h-11 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 p-0"
                variant="ghost"
              >
                <BarChart3 className="w-5 h-5 text-amber-400" />
              </Button>
            </>
          )}

          {/* History Button */}
          <Button
            onClick={onOpenHistory}
            className="hidden md:flex items-center gap-3 h-12 px-5 rounded-xl bg-gradient-to-r from-purple-500/20 to-primary/20 border border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/20 transition-all duration-300 btn-press"
            variant="ghost"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-foreground font-medium">История</span>
          </Button>

          {/* Drink Sales Button */}
          <Button
            onClick={onOpenDrinkSales}
            className="hidden md:flex items-center gap-3 h-12 px-5 rounded-xl bg-gradient-to-r from-secondary/20 to-primary/20 border border-primary/30 hover:border-primary/50 hover:bg-primary/20 transition-all duration-300 btn-press"
            variant="ghost"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Coffee className="w-5 h-5 text-primary" />
            </div>
            <span className="text-foreground font-medium">Напитки</span>
          </Button>

          {/* Mobile history button */}
          <Button
            onClick={onOpenHistory}
            className="md:hidden w-11 h-11 rounded-xl bg-gradient-to-r from-purple-500/20 to-primary/20 border border-purple-500/30 p-0"
            variant="ghost"
          >
            <Receipt className="w-5 h-5 text-purple-400" />
          </Button>

          {/* Mobile drink button */}
          <Button
            onClick={onOpenDrinkSales}
            className="md:hidden w-11 h-11 rounded-xl bg-gradient-to-r from-secondary/20 to-primary/20 border border-primary/30 p-0"
            variant="ghost"
          >
            <Coffee className="w-5 h-5 text-primary" />
          </Button>
        </div>

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
                <p className="text-xs text-muted-foreground mt-0.5">
                  {role === 'admin' ? 'Администратор' : 'Кассир'}
                </p>
              </div>
              <DropdownMenuSeparator className="bg-border/50" />
              {role === 'admin' && (
                <>
                  <DropdownMenuItem 
                    onClick={() => navigate('/admin/cashiers')} 
                    className="cursor-pointer py-3 px-4"
                  >
                    <Shield className="w-4 h-4 mr-3 text-primary" />
                    Управление кассирами
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/50" />
                </>
              )}
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
