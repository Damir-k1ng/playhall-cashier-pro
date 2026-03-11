import { useEffect, useState } from 'react';
import { platformApi } from '@/lib/platform-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Building2, CreditCard, TrendingUp, Users, Activity, DollarSign } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  summary: {
    total_clubs: number;
    active_clubs: number;
    trial_clubs: number;
    pending_clubs: number;
    suspended_clubs: number;
    blocked_clubs: number;
    expired_clubs: number;
    total_subscriptions: number;
    active_subscriptions: number;
    mrr: number;
    total_revenue: number;
    total_stations: number;
  };
  clubs_by_month: { month: string; count: number }[];
  revenue_by_month: { month: string; amount: number }[];
  clubs_by_city: { city: string; count: number }[];
}

const COLORS = [
  'hsl(185, 100%, 50%)',   // primary/cyan
  'hsl(155, 100%, 45%)',   // secondary/emerald
  'hsl(42, 100%, 55%)',    // gold
  'hsl(270, 85%, 55%)',    // purple
  'hsl(330, 100%, 60%)',   // pink
  'hsl(35, 100%, 55%)',    // orange
];

export default function PlatformAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const result = await platformApi.getAnalytics();
      setData(result);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="border-border animate-pulse">
              <CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { summary } = data;

  const statusDistribution = [
    { name: 'Active', value: summary.active_clubs, color: COLORS[1] },
    { name: 'Trial', value: summary.trial_clubs, color: COLORS[0] },
    { name: 'Pending', value: summary.pending_clubs, color: COLORS[2] },
    { name: 'Suspended', value: summary.suspended_clubs, color: COLORS[5] },
    { name: 'Expired', value: summary.expired_clubs, color: COLORS[3] },
    { name: 'Blocked', value: summary.blocked_clubs, color: COLORS[4] },
  ].filter(s => s.value > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Building2} label="Total Clubs" value={summary.total_clubs} accent="text-primary" />
        <KpiCard icon={Activity} label="Active Clubs" value={summary.active_clubs + summary.trial_clubs} accent="text-secondary" />
        <KpiCard icon={DollarSign} label="MRR" value={`₸${summary.mrr.toLocaleString()}`} accent="text-primary" />
        <KpiCard icon={CreditCard} label="Total Revenue" value={`₸${summary.total_revenue.toLocaleString()}`} accent="text-secondary" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Active Subscriptions" value={summary.active_subscriptions} accent="text-primary" />
        <KpiCard icon={TrendingUp} label="Total Stations" value={summary.total_stations} accent="text-secondary" />
        <KpiCard icon={Building2} label="Pending Approval" value={summary.pending_clubs} accent="text-yellow-400" />
        <KpiCard icon={Building2} label="On Trial" value={summary.trial_clubs} accent="text-primary" />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Clubs Growth */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Clubs Growth</CardTitle>
          </CardHeader>
          <CardContent>
            {data.clubs_by_month.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.clubs_by_month}>
                  <defs>
                    <linearGradient id="colorClubs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(185, 100%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(185, 100%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 15%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(220, 10%, 50%)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(220, 10%, 50%)' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'hsl(220, 25%, 10%)', border: '1px solid hsl(220, 20%, 15%)', borderRadius: '8px', color: '#fff' }} />
                  <Area type="monotone" dataKey="count" stroke="hsl(185, 100%, 50%)" fill="url(#colorClubs)" strokeWidth={2} name="New Clubs" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {data.revenue_by_month.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.revenue_by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 15%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(220, 10%, 50%)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(220, 10%, 50%)' }} />
                  <Tooltip contentStyle={{ background: 'hsl(220, 25%, 10%)', border: '1px solid hsl(220, 20%, 15%)', borderRadius: '8px', color: '#fff' }} formatter={(value: number) => [`₸${value.toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="amount" fill="hsl(155, 100%, 45%)" radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No revenue data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Club Status Distribution */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Club Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                    {statusDistribution.map((entry, i) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(220, 25%, 10%)', border: '1px solid hsl(220, 20%, 15%)', borderRadius: '8px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No clubs yet</div>
            )}
          </CardContent>
        </Card>

        {/* Clubs by City */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Clubs by City</CardTitle>
          </CardHeader>
          <CardContent>
            {data.clubs_by_city.length > 0 ? (
              <div className="space-y-3 pt-2">
                {data.clubs_by_city.map((c, i) => (
                  <div key={c.city} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-sm">{c.city}</span>
                    </div>
                    <Badge variant="outline" className="font-mono">{c.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No city data</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent: string }) {
  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`${accent} opacity-70`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold font-gaming">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
