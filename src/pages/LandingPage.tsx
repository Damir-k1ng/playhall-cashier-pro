import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Gamepad2, Shield, BarChart3, ArrowRight, Zap, Clock, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';
import logoImage from '@/assets/logo.jpg';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

const features = [
  { icon: Gamepad2, title: 'Управление станциями', desc: 'Почасовой и пакетный тариф, контроллеры, напитки — всё автоматизировано' },
  { icon: Shield, title: 'Изоляция данных', desc: 'Каждый клуб — отдельный тенант с полной изоляцией и безопасностью' },
  { icon: BarChart3, title: 'Аналитика смен', desc: 'Отчёты по сменам, кассирам и выручке в реальном времени' },
  { icon: Zap, title: 'Быстрый вход по PIN', desc: 'Кассиры входят за 2 секунды — никаких паролей и email' },
  { icon: Clock, title: 'Таймеры в реальном времени', desc: 'Живой отсчёт времени с автоматическим расчётом стоимости' },
  { icon: Wifi, title: 'Работа офлайн', desc: 'Система работает без интернета и синхронизирует данные при восстановлении связи' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-y-auto">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(185_100%_50%_/_0.08)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(155_100%_45%_/_0.05)_0%,transparent_70%)]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,hsl(270_85%_55%_/_0.04)_0%,transparent_70%)]" />
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(hsl(185_100%_50%_/_0.02)_1px,transparent_1px),linear-gradient(90deg,hsl(185_100%_50%_/_0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-primary/20">
            <img src={logoImage} alt="Lavé" className="w-full h-full object-cover" />
          </div>
          <span className="font-brand text-xl font-bold bg-gradient-to-r from-primary via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
            Lavé
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="text-muted-foreground hover:text-foreground">
            Вход
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/platform/login')} className="text-muted-foreground hover:text-foreground">
            Platform
          </Button>
        </div>
      </motion.header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6">
        <section className="pt-16 sm:pt-24 pb-20 sm:pb-32 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            POS-система нового поколения
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-5xl sm:text-7xl font-brand font-bold mb-6 leading-[1.1]"
          >
            <span className="bg-gradient-to-r from-primary via-cyan-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_hsl(185_100%_50%_/_0.3)]">
              Управляйте
            </span>
            <br />
            <span className="text-foreground">PlayStation клубом</span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-primary to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_hsl(155_100%_45%_/_0.3)]">
              как профи
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Станции, смены, оплата и аналитика — всё в одном месте.
            <br className="hidden sm:block" />
            Быстрый вход по PIN, работа офлайн, мультиклуб.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              className="text-lg px-10 py-7 rounded-2xl glow-cyan font-semibold group"
              onClick={() => navigate('/signup')}
            >
              Подключить клуб
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-10 py-7 rounded-2xl border-border/50 hover:border-primary/30"
              onClick={() => navigate('/login')}
            >
              Войти
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex items-center justify-center gap-8 sm:gap-16 mt-16 pt-8 border-t border-border/30"
          >
            {[
              { value: '24/7', label: 'Доступность' },
              { value: '< 2с', label: 'Вход по PIN' },
              { value: '100%', label: 'Офлайн' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl sm:text-3xl font-brand font-bold text-primary">{value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="pb-24 sm:pb-32">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-brand font-bold mb-4">
              Всё что нужно для{' '}
              <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                вашего клуба
              </span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Полный набор инструментов для управления PlayStation клубом любого размера
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="group relative p-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-primary/30 hover:bg-card/60 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="pb-24 sm:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-emerald-500/5 p-10 sm:p-16 text-center"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(185_100%_50%_/_0.08)_0%,transparent_60%)]" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-brand font-bold mb-4 text-foreground">
                Готовы начать?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Подключите свой клуб за 2 минуты и получите пробный период бесплатно
              </p>
              <Button
                size="lg"
                className="text-lg px-10 py-7 rounded-2xl glow-cyan font-semibold group"
                onClick={() => navigate('/signup')}
              >
                Оставить заявку
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="pb-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Lavé · POS для PlayStation клубов
          </p>
        </footer>
      </main>
    </div>
  );
}
