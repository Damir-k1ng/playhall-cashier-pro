import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import logoImage from '@/assets/logo.jpg';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function SignupPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [clubName, setClubName] = useState('');

  const [form, setForm] = useState({
    club_name: '',
    contact_name: '',
    phone: '',
    email: '',
    city: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.club_name.trim() || !form.contact_name.trim() || !form.phone.trim()) {
      toast({ title: 'Заполните обязательные поля', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/api/public/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      setClubName(data.club_name);
      setIsSuccess(true);
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Заявка отправлена!</CardTitle>
            <CardDescription className="text-base mt-2">
              Клуб «{clubName}» зарегистрирован и ожидает подтверждения. Мы свяжемся с вами в ближайшее время.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              На главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,hsl(185_100%_50%_/_0.05)_0%,transparent_50%)] pointer-events-none" />

      <div className="relative z-10 max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <img src={logoImage} alt="Lavé" className="w-full h-full object-cover" />
            </div>
            <span className="font-brand text-lg bg-gradient-to-r from-primary via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
              Lavé
            </span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Регистрация клуба</CardTitle>
            <CardDescription>
              Заполните форму, и мы подключим ваш клуб к платформе Lavé
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="club_name">Название клуба *</Label>
                <Input
                  id="club_name"
                  name="club_name"
                  placeholder="PlayStation Club SVOY"
                  value={form.club_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_name">Контактное лицо *</Label>
                <Input
                  id="contact_name"
                  name="contact_name"
                  placeholder="Иван Иванов"
                  value={form.contact_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Телефон *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+7 777 123 4567"
                  value={form.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@club.kz"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Город</Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="Астана"
                  value={form.city}
                  onChange={handleChange}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  'Отправить заявку'
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                После подтверждения вы получите доступ к пробному периоду
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
