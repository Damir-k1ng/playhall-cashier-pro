import { ReactNode, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useClubAdminAuth } from '@/contexts/ClubAdminAuthContext';
import {
  Users,
  Monitor,
  Coffee,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ClubAdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useClubAdminAuth();
  const navigate = useNavigate();
  const { slug } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { label: 'Кассиры', icon: Users, to: `/club/${slug}/admin` },
    { label: 'Станции', icon: Monitor, to: `/club/${slug}/admin/stations` },
    { label: 'Напитки', icon: Coffee, to: `/club/${slug}/admin/drinks` },
    { label: 'Аналитика', icon: BarChart3, to: `/club/${slug}/admin/analytics` },
    { label: 'Настройки', icon: Settings, to: `/club/${slug}/admin/settings` },
  ];

  const handleLogout = async () => {
    await logout();
    navigate(`/club/${slug}/login`);
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-card transition-all duration-300',
          sidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <span className="font-semibold text-foreground tracking-tight text-sm block truncate">
                {user?.club_name || 'Клуб'}
              </span>
              <span className="text-xs text-muted-foreground">Админ-панель</span>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === `/club/${slug}/admin`}
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

        <div className="border-t border-border p-3">
          {sidebarOpen && user && (
            <div className="mb-2">
              <p className="text-xs text-muted-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground/70 truncate">{user.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {sidebarOpen && <span>Выйти</span>}
          </Button>
        </div>
      </aside>

      <main
        className={cn(
          'flex-1 transition-all duration-300',
          sidebarOpen ? 'ml-60' : 'ml-16'
        )}
      >
        <header className="h-14 flex items-center border-b border-border px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-medium text-muted-foreground">
            {user?.club_name}
          </h1>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
