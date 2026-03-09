import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Receipt,
  BarChart3,
  LogOut,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/platform' },
  { label: 'Clubs', icon: Building2, to: '/platform/clubs' },
  { label: 'Subscriptions', icon: CreditCard, to: '/platform/subscriptions' },
  { label: 'Payments', icon: Receipt, to: '/platform/payments' },
  { label: 'Analytics', icon: BarChart3, to: '/platform/analytics' },
];

export function PlatformLayout({ children }: { children: ReactNode }) {
  const { user, logout } = usePlatformAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/platform/login');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-card transition-all duration-300',
          sidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            L
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-foreground tracking-tight">Lavé Platform</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/platform'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-3">
          {sidebarOpen && user && (
            <p className="text-xs text-muted-foreground mb-2 truncate">{user.name}</p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {sidebarOpen && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          'flex-1 transition-all duration-300',
          sidebarOpen ? 'ml-60' : 'ml-16'
        )}
      >
        {/* Top bar */}
        <header className="h-14 flex items-center border-b border-border px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
