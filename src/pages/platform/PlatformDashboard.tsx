import { useEffect, useState } from 'react';
import { platformApi } from '@/lib/platform-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, CheckCircle, Clock, XCircle, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TenantSummary {
  total: number;
  active: number;
  trial: number;
  expired: number;
  pending: number;
}

export default function PlatformDashboard() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [t, s] = await Promise.all([
        platformApi.getTenants(),
        platformApi.getSubscriptions(),
      ]);
      setTenants(t);
      setSubscriptions(s);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const summary: TenantSummary = {
    total: tenants.length,
    active: tenants.filter((t: any) => t.status === 'active').length,
    trial: tenants.filter((t: any) => t.status === 'trial').length,
    expired: tenants.filter((t: any) => t.status === 'expired').length,
    pending: tenants.filter((t: any) => t.status === 'pending').length,
  };

  // MRR: sum of active subscriptions' monthly value
  const mrr = subscriptions
    .filter((s: any) => s.status === 'active')
    .reduce((sum: number, s: any) => {
      const monthly = s.plan?.price_monthly || 0;
      return sum + monthly;
    }, 0);

  const cards = [
    { label: 'Total Clubs', value: summary.total, icon: Building2, color: 'text-foreground' },
    { label: 'Active', value: summary.active, icon: CheckCircle, color: 'text-secondary' },
    { label: 'Trial', value: summary.trial, icon: Clock, color: 'text-primary' },
    { label: 'Expired', value: summary.expired, icon: XCircle, color: 'text-destructive' },
    { label: 'MRR', value: `${mrr.toLocaleString()} ₸`, icon: DollarSign, color: 'text-secondary' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending clubs */}
      {summary.pending > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Pending Approval ({summary.pending})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tenants
                .filter((t: any) => t.status === 'pending')
                .map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{t.club_name}</p>
                      <p className="text-xs text-muted-foreground">{t.city || '—'} · {t.signup_email || t.signup_phone || '—'}</p>
                    </div>
                    <span className="text-xs text-yellow-500 font-medium">Pending</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
