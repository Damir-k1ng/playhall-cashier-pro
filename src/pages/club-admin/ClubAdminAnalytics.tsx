import React, { useState, useEffect } from 'react';
import { useClubAdminAuth } from '@/contexts/ClubAdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, DollarSign, Monitor, Clock, Users } from 'lucide-react';

export default function ClubAdminAnalytics() {
  const { user } = useClubAdminAuth();
  const [stats, setStats] = useState({ totalRevenue: 0, totalSessions: 0, activeStations: 0, totalCashiers: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setIsLoading(true);

      const [paymentsRes, sessionsRes, stationsRes, cashiersRes] = await Promise.all([
        supabase.from('payments').select('total_amount').eq('tenant_id', user.tenant_id),
        supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('tenant_id', user.tenant_id),
        supabase.from('stations').select('id', { count: 'exact', head: true }).eq('tenant_id', user.tenant_id),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('tenant_id', user.tenant_id).eq('role', 'cashier'),
      ]);

      const totalRevenue = (paymentsRes.data || []).reduce((sum, p) => sum + (p.total_amount || 0), 0);

      setStats({
        totalRevenue,
        totalSessions: sessionsRes.count || 0,
        activeStations: stationsRes.count || 0,
        totalCashiers: cashiersRes.count || 0,
      });
      setIsLoading(false);
    };
    load();
  }, [user]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const cards = [
    { title: 'Общая выручка', value: `${stats.totalRevenue.toLocaleString()} ₸`, icon: DollarSign },
    { title: 'Всего сессий', value: String(stats.totalSessions), icon: Clock },
    { title: 'Станций', value: String(stats.activeStations), icon: Monitor },
    { title: 'Кассиров', value: String(stats.totalCashiers), icon: Users },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Аналитика</h2>
        <p className="text-muted-foreground text-sm">Общая статистика клуба</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
