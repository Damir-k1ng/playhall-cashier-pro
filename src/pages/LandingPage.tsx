import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Gamepad2, Shield, BarChart3, ArrowRight } from 'lucide-react';
import logoImage from '@/assets/logo.jpg';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background effects */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,hsl(185_100%_50%_/_0.05)_0%,transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(155_100%_45%_/_0.03)_0%,transparent_50%)] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden">
            <img src={logoImage} alt="Lavé" className="w-full h-full object-cover" />
          </div>
          <span className="font-brand text-xl bg-gradient-to-r from-primary via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
            Lavé
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Вход
          </Button>
          <Button variant="ghost" onClick={() => navigate('/platform/login')}>
            Platform
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-32 text-center">
        <h1 className="text-4xl sm:text-6xl font-brand font-bold mb-6 bg-gradient-to-r from-primary via-cyan-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_hsl(185_100%_50%_/_0.3)]">
          POS-система для<br />PlayStation клубов
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Управляйте станциями, сменами, оплатой и аналитикой — всё в одном месте. 
          Быстрый вход по PIN, работа офлайн, мультиклуб.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 rounded-xl"
            onClick={() => navigate('/signup')}
          >
            Подключить клуб <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="text-lg px-8 py-6 rounded-xl"
            onClick={() => navigate('/login')}
          >
            Войти
          </Button>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-3 gap-8 mt-24 text-left">
          {[
            { icon: Gamepad2, title: 'Управление станциями', desc: 'Почасовой и пакетный тариф, контроллеры, напитки — всё автоматизировано' },
            { icon: Shield, title: 'Изоляция данных', desc: 'Каждый клуб — отдельный тенант с полной изоляцией и безопасностью' },
            { icon: BarChart3, title: 'Аналитика смен', desc: 'Отчёты по сменам, кассирам и выручке в реальном времени' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-2xl border border-border bg-card/50 backdrop-blur-sm">
              <Icon className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
