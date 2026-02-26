import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays, parseISO, startOfWeek, startOfMonth, isSameDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Banknote,
  Smartphone,
  Gamepad2,
  Coffee,
  Clock,
  Users,
  BarChart3,
  Monitor,
  ChevronDown,
  ChevronRight,
  Receipt,
  Download,
  FileSpreadsheet,
  FileText,
  Wine
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportToExcel, exportToPDF } from '@/lib/export-utils';
import { Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';

// === Types ===

interface DrinkAnalytics {
  topDrinks: { name: string; totalQuantity: number; totalRevenue: number }[];
  drinksByDay: { date: string; revenue: number; quantity: number }[];
  drinksByCashier?: { cashier_id: string; cashier_name: string; totalRevenue: number; totalQuantity: number }[];
}

interface PrevChartDataPoint {
  date: string;
  revenue: number;
  cash: number;
  kaspi: number;
  sessions: number;
}

interface AnalyticsData {
  shifts: ShiftData[];
  cashiers: CashierInfo[];
  totals: TotalsSummary;
  previousPeriodTotals: TotalsSummary;
  drinkAnalytics: DrinkAnalytics;
  prevChartData: PrevChartDataPoint[];
}

interface ShiftData {
  id: string;
  cashier_id: string;
  cashier_name: string;
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
  total_cash: number;
  total_kaspi: number;
  total_games: number;
  total_controllers: number;
  total_drinks: number;
  sessions_count: number;
  duration_hours: number;
}

interface CashierInfo {
  id: string;
  name: string;
}

interface TotalsSummary {
  revenue: number;
  cash: number;
  kaspi: number;
  games: number;
  controllers: number;
  drinks: number;
  sessions: number;
  avgCheck: number;
  shiftsCount: number;
  totalHours: number;
  revenuePerHour: number;
}

type GroupBy = 'day' | 'week' | 'month';
type DateRange = { from: Date; to: Date };

const MIN_DATE = new Date(2025, 0, 27);

// === Helpers ===

function calcGrowth(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

function getWorkingDayKey(dateStr: string): string {
  const d = new Date(dateStr);
  const utcHour = d.getUTCHours();
  const astanaHour = (utcHour + 5) % 24;
  const workingDay = new Date(d);
  if (astanaHour >= 0 && astanaHour < 4) {
    workingDay.setUTCDate(workingDay.getUTCDate() - 1);
  }
  return workingDay.toISOString().split('T')[0];
}

function formatPeriodLabel(key: string, groupBy: GroupBy): string {
  switch (groupBy) {
    case 'week':
      return `Неделя ${format(parseISO(key), 'd MMM', { locale: ru })}`;
    case 'month': {
      const [year, month] = key.split('-');
      return format(new Date(parseInt(year), parseInt(month) - 1, 1), 'LLLL yyyy', { locale: ru });
    }
    default: {
      const dayDate = parseISO(key);
      const today = new Date();
      if (isSameDay(dayDate, today)) return 'Сегодня';
      if (isSameDay(dayDate, subDays(today, 1))) return 'Вчера';
      return format(dayDate, 'd MMMM', { locale: ru });
    }
  }
}

function calculateTotals(shifts: ShiftData[]): TotalsSummary {
  const totals = shifts.reduce((acc, shift) => ({
    revenue: acc.revenue + shift.total_cash + shift.total_kaspi,
    cash: acc.cash + shift.total_cash,
    kaspi: acc.kaspi + shift.total_kaspi,
    games: acc.games + shift.total_games,
    controllers: acc.controllers + shift.total_controllers,
    drinks: acc.drinks + shift.total_drinks,
    sessions: acc.sessions + shift.sessions_count,
    shiftsCount: acc.shiftsCount + 1,
    totalHours: acc.totalHours + shift.duration_hours
  }), { revenue: 0, cash: 0, kaspi: 0, games: 0, controllers: 0, drinks: 0, sessions: 0, shiftsCount: 0, totalHours: 0 });

  return {
    ...totals,
    avgCheck: totals.sessions > 0 ? Math.round(totals.revenue / totals.sessions) : 0,
    revenuePerHour: totals.totalHours > 0 ? Math.round(totals.revenue / totals.totalHours) : 0
  };
}

// === Main Component ===

export function ShiftAnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: subDays(new Date(), 7),
    to: new Date()
  }));
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, selectedCashier]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const result = await apiClient.getShiftsAnalytics({
        from: dateRange.from.toISOString(),
        to: endOfDay(dateRange.to).toISOString(),
        cashier_id: selectedCashier !== 'all' ? selectedCashier : undefined
      });
      setData(result);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Group shifts by operational day then by groupBy
  const groupedData = useMemo(() => {
    if (!data?.shifts) return [];
    const groups = new Map<string, ShiftData[]>();
    
    data.shifts.forEach(shift => {
      let key: string;
      
      switch (groupBy) {
        case 'week': {
          const weekStart = startOfWeek(parseISO(getWorkingDayKey(shift.started_at)), { weekStartsOn: 1 });
          key = format(weekStart, 'yyyy-MM-dd');
          break;
        }
        case 'month': {
          const monthStart = startOfMonth(parseISO(getWorkingDayKey(shift.started_at)));
          key = format(monthStart, 'yyyy-MM');
          break;
        }
        default:
          key = getWorkingDayKey(shift.started_at);
      }
      
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(shift);
    });

    return Array.from(groups.entries())
      .map(([key, shifts]) => ({
        key,
        label: formatPeriodLabel(key, groupBy),
        shifts,
        totals: calculateTotals(shifts)
      }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [data?.shifts, groupBy]);

  // Chart data with previous period overlay
  const chartData = useMemo(() => {
    const currentByDay = [...groupedData].reverse();
    const prevData = data?.prevChartData || [];
    
    // Map previous period data by index for overlay
    return currentByDay.map((group, idx) => ({
      name: group.label,
      revenue: group.totals.revenue,
      cash: group.totals.cash,
      kaspi: group.totals.kaspi,
      sessions: group.totals.sessions,
      prevRevenue: prevData[idx]?.revenue || 0,
      prevSessions: prevData[idx]?.sessions || 0,
    }));
  }, [groupedData, data?.prevChartData]);

  // Cashier comparison data
  const cashierComparisonData = useMemo(() => {
    if (!data?.shifts || selectedCashier !== 'all') return [];
    
    const cashierTotals = new Map<string, { 
      name: string; revenue: number; sessions: number; shiftsCount: number; totalHours: number; revenuePerHour: number; drinkRevenue: number;
    }>();
    
    data.shifts.forEach(shift => {
      if (!cashierTotals.has(shift.cashier_id)) {
        cashierTotals.set(shift.cashier_id, { name: shift.cashier_name, revenue: 0, sessions: 0, shiftsCount: 0, totalHours: 0, revenuePerHour: 0, drinkRevenue: 0 });
      }
      const t = cashierTotals.get(shift.cashier_id)!;
      t.revenue += shift.total_cash + shift.total_kaspi;
      t.sessions += shift.sessions_count;
      t.shiftsCount += 1;
      t.totalHours += shift.duration_hours;
    });

    // Add drink revenue from drinksByCashier
    data.drinkAnalytics?.drinksByCashier?.forEach(dc => {
      const t = cashierTotals.get(dc.cashier_id);
      if (t) t.drinkRevenue = dc.totalRevenue;
    });
    
    cashierTotals.forEach(t => {
      t.revenuePerHour = t.totalHours > 0 ? Math.round(t.revenue / t.totalHours) : 0;
    });
    
    return Array.from(cashierTotals.values()).sort((a, b) => b.revenue - a.revenue);
  }, [data?.shifts, selectedCashier, data?.drinkAnalytics]);

  const toggleExpand = (key: string) => {
    const next = new Set(expandedDays);
    if (next.has(key)) next.delete(key); else next.add(key);
    setExpandedDays(next);
  };

  const handleExport = async (type: 'excel' | 'pdf') => {
    if (!data?.shifts) return;
    const cashierName = selectedCashier !== 'all' ? data.cashiers.find(c => c.id === selectedCashier)?.name : undefined;
    const exportParams = { shifts: data.shifts, totals: data.totals, dateFrom: dateRange.from, dateTo: dateRange.to, cashierName };
    if (type === 'excel') { await exportToExcel(exportParams); } else { exportToPDF(exportParams); }
  };

  if (isLoading && !data) return <AnalyticsSkeleton />;

  const totals = data?.totals || { revenue: 0, cash: 0, kaspi: 0, games: 0, controllers: 0, drinks: 0, sessions: 0, avgCheck: 0, shiftsCount: 0, totalHours: 0, revenuePerHour: 0 };
  const prev = data?.previousPeriodTotals || totals;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {format(dateRange.from, 'd MMM', { locale: ru })} — {format(dateRange.to, 'd MMM yyyy', { locale: ru })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) setDateRange({ from: range.from, to: range.to });
                else if (range?.from) setDateRange({ from: range.from, to: range.from });
              }}
              disabled={(date) => date > new Date() || date < MIN_DATE}
              initialFocus
              className="pointer-events-auto"
              locale={ru}
            />
            <div className="p-3 border-t flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setDateRange({ from: new Date(), to: new Date() })}>Сегодня</Button>
              <Button size="sm" variant="outline" onClick={() => setDateRange({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) })}>Вчера</Button>
              <Button size="sm" variant="outline" onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}>7 дней</Button>
              <Button size="sm" variant="outline" onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}>30 дней</Button>
            </div>
          </PopoverContent>
        </Popover>

        <Select value={selectedCashier} onValueChange={setSelectedCashier}>
          <SelectTrigger className="w-[180px]">
            <Users className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Все кассиры" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все кассиры</SelectItem>
            {data?.cashiers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <TabsList className="glass-card border border-primary/20">
              <TabsTrigger value="day">День</TabsTrigger>
              <TabsTrigger value="week">Неделя</TabsTrigger>
              <TabsTrigger value="month">Месяц</TabsTrigger>
            </TabsList>
          </Tabs>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Экспорт</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border border-border">
              <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 text-green-500" /> Скачать Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4 text-red-500" /> Скачать PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Cards with % growth for all */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Выручка" value={formatCurrency(totals.revenue)} icon={<BarChart3 className="h-5 w-5" />} trend={calcGrowth(totals.revenue, prev.revenue)} className="col-span-2 md:col-span-1" />
        <KpiCard title="Наличные" value={formatCurrency(totals.cash)} icon={<Banknote className="h-5 w-5 text-cash" />} trend={calcGrowth(totals.cash, prev.cash)} />
        <KpiCard title="Kaspi" value={formatCurrency(totals.kaspi)} icon={<Smartphone className="h-5 w-5 text-kaspi" />} trend={calcGrowth(totals.kaspi, prev.kaspi)} />
        <KpiCard title="Средний чек" value={formatCurrency(totals.avgCheck)} icon={<Receipt className="h-5 w-5" />} trend={calcGrowth(totals.avgCheck, prev.avgCheck)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <SecondaryKpi icon={<Monitor className="h-5 w-5 text-primary" />} value={String(totals.sessions)} label="Сессий" trend={calcGrowth(totals.sessions, prev.sessions)} color="primary" />
        <SecondaryKpi icon={<CalendarIcon className="h-5 w-5 text-purple-400" />} value={String(totals.shiftsCount)} label="Раб. дней" trend={calcGrowth(totals.shiftsCount, prev.shiftsCount)} color="purple-500" />
        <SecondaryKpi icon={<Clock className="h-5 w-5 text-blue-400" />} value={`${Math.round(totals.totalHours)}ч`} label="Часов работы" trend={calcGrowth(totals.totalHours, prev.totalHours)} color="blue-500" />
        <SecondaryKpi icon={<TrendingUp className="h-5 w-5 text-green-400" />} value={formatCurrency(totals.revenuePerHour)} label="₸/час" trend={calcGrowth(totals.revenuePerHour, prev.revenuePerHour)} color="green-500" />
        <SecondaryKpi icon={<Gamepad2 className="h-5 w-5 text-secondary" />} value={formatCurrency(totals.controllers)} label="Джойстики" trend={calcGrowth(totals.controllers, prev.controllers)} color="secondary" />
        <SecondaryKpi icon={<Coffee className="h-5 w-5 text-amber-500" />} value={formatCurrency(totals.drinks)} label="Напитки" trend={calcGrowth(totals.drinks, prev.drinks)} color="amber-500" />
      </div>

      {/* Tabs: Overview / Drinks */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass-card border border-primary/20">
          <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Обзор</TabsTrigger>
          <TabsTrigger value="drinks" className="gap-1.5"><Wine className="h-4 w-4" /> Напитки</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Charts with overlay */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass-card border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Динамика выручки
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={chartData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => [formatCurrency(value), name === 'revenue' ? 'Текущий' : 'Пред. период']} />
                      <Legend formatter={(v) => v === 'revenue' ? 'Текущий период' : 'Пред. период'} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                      <Line type="monotone" dataKey="prevRevenue" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : <EmptyChart />}
              </CardContent>
            </Card>

            <Card className="glass-card border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-cash" /> Способы оплаты
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => [formatCurrency(value), name === 'cash' ? 'Наличные' : 'Kaspi']} />
                      <Legend formatter={(v) => v === 'cash' ? 'Наличные' : 'Kaspi'} />
                      <Bar dataKey="cash" fill="hsl(var(--cash))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="kaspi" fill="hsl(var(--kaspi))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyChart />}
              </CardContent>
            </Card>
          </div>

          {/* Cashier Comparison */}
          {cashierComparisonData.length > 1 && (
            <Card className="glass-card border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Сравнение кассиров
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/30">
                        <th className="text-left p-3 font-medium">Кассир</th>
                        <th className="text-center p-3 font-medium">Смен</th>
                        <th className="text-center p-3 font-medium">Часов</th>
                        <th className="text-right p-3 font-medium">Выручка</th>
                        <th className="text-right p-3 font-medium">₸/час</th>
                        <th className="text-right p-3 font-medium">Напитки</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {cashierComparisonData.map((cashier, index) => (
                        <tr key={cashier.name} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="font-semibold text-primary text-xs">{cashier.name.charAt(0).toUpperCase()}</span>
                              </div>
                              <span className="font-medium">{cashier.name}</span>
                              {index === 0 && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Топ</Badge>}
                            </div>
                          </td>
                          <td className="text-center p-3"><Badge variant="outline" className="font-mono">{cashier.shiftsCount}</Badge></td>
                          <td className="text-center p-3 text-muted-foreground">{Math.round(cashier.totalHours)}ч</td>
                          <td className="text-right p-3 font-semibold text-primary">{formatCurrency(cashier.revenue)}</td>
                          <td className="text-right p-3"><span className="text-green-400 font-medium">{formatCurrency(cashier.revenuePerHour)}</span></td>
                          <td className="text-right p-3 text-amber-400">{formatCurrency(cashier.drinkRevenue || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Table */}
          <DetailedTable groupedData={groupedData} expandedDays={expandedDays} toggleExpand={toggleExpand} />
        </TabsContent>

        <TabsContent value="drinks" className="space-y-6">
          <DrinkAnalyticsTab analytics={data?.drinkAnalytics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// === Drink Analytics Tab ===

function DrinkAnalyticsTab({ analytics }: { analytics?: DrinkAnalytics }) {
  if (!analytics || analytics.topDrinks.length === 0) {
    return (
      <Card className="glass-card border-primary/20">
        <CardContent className="p-8 text-center text-muted-foreground">
          Нет данных о продажах напитков за выбранный период
        </CardContent>
      </Card>
    );
  }

  const totalDrinkRevenue = analytics.topDrinks.reduce((sum, d) => sum + d.totalRevenue, 0);
  const totalDrinkQty = analytics.topDrinks.reduce((sum, d) => sum + d.totalQuantity, 0);

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="glass-card border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Coffee className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalDrinkRevenue)}</p>
              <p className="text-xs text-muted-foreground">Выручка напитков</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Wine className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDrinkQty}</p>
              <p className="text-xs text-muted-foreground">Продано шт.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDrinkQty > 0 ? formatCurrency(Math.round(totalDrinkRevenue / totalDrinkQty)) : '0 ₸'}</p>
              <p className="text-xs text-muted-foreground">Средняя цена</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Drinks Table */}
        <Card className="glass-card border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Coffee className="h-4 w-4 text-amber-500" /> Рейтинг напитков
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {analytics.topDrinks.map((drink, idx) => {
                const pct = totalDrinkRevenue > 0 ? Math.round((drink.totalRevenue / totalDrinkRevenue) * 100) : 0;
                return (
                  <div key={drink.name} className="px-4 py-3 flex items-center gap-3">
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      idx === 0 ? "bg-amber-500/20 text-amber-400" : idx === 1 ? "bg-muted text-muted-foreground" : "bg-muted/50 text-muted-foreground"
                    )}>{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{drink.name}</p>
                      <div className="w-full bg-muted/30 rounded-full h-1.5 mt-1">
                        <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-amber-400">{formatCurrency(drink.totalRevenue)}</p>
                      <p className="text-xs text-muted-foreground">{drink.totalQuantity} шт. · {pct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Drinks by Day Chart */}
        <Card className="glass-card border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" /> Динамика продаж напитков
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.drinksByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={analytics.drinksByDay.map(d => ({
                  name: format(parseISO(d.date), 'd MMM', { locale: ru }),
                  revenue: d.revenue,
                  quantity: d.quantity,
                }))}>
                  <defs>
                    <linearGradient id="colorDrinks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => [name === 'revenue' ? formatCurrency(value) : `${value} шт.`, name === 'revenue' ? 'Выручка' : 'Количество']} />
                  <Legend formatter={(v) => v === 'revenue' ? 'Выручка' : 'Количество'} />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#f59e0b" fillOpacity={1} fill="url(#colorDrinks)" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="quantity" stroke="#fb923c" strokeWidth={1.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </CardContent>
        </Card>
      </div>

      {/* Drinks by Cashier */}
      {analytics.drinksByCashier && analytics.drinksByCashier.length > 1 && (
        <Card className="glass-card border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" /> Продажи напитков по кассирам
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left p-3 font-medium">Кассир</th>
                    <th className="text-right p-3 font-medium">Количество</th>
                    <th className="text-right p-3 font-medium">Выручка</th>
                    <th className="text-right p-3 font-medium">Доля</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {analytics.drinksByCashier.map((c, idx) => (
                    <tr key={c.cashier_id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                            <span className="font-semibold text-amber-400 text-xs">{c.cashier_name.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="font-medium">{c.cashier_name}</span>
                          {idx === 0 && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Топ</Badge>}
                        </div>
                      </td>
                      <td className="text-right p-3">{c.totalQuantity} шт.</td>
                      <td className="text-right p-3 font-semibold text-amber-400">{formatCurrency(c.totalRevenue)}</td>
                      <td className="text-right p-3 text-muted-foreground">{totalDrinkRevenue > 0 ? Math.round((c.totalRevenue / totalDrinkRevenue) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// === Sub-components ===

function EmptyChart() {
  return <div className="h-[250px] flex items-center justify-center text-muted-foreground">Нет данных за выбранный период</div>;
}

function KpiCard({ title, value, icon, trend, className }: { title: string; value: string; icon: React.ReactNode; trend?: number | null; className?: string }) {
  return (
    <Card className={cn("glass-card border-primary/20", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">{icon}</div>
          {trend !== undefined && trend !== null && (
            <div className={cn("flex items-center gap-1 text-sm font-medium", trend > 0 ? "text-green-500" : trend < 0 ? "text-red-500" : "text-muted-foreground")}>
              {trend > 0 ? <TrendingUp className="h-4 w-4" /> : trend < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{title}</p>
      </CardContent>
    </Card>
  );
}

function SecondaryKpi({ icon, value, label, trend, color }: { icon: React.ReactNode; value: string; label: string; trend: number | null; color: string }) {
  return (
    <Card className={cn("glass-card", `border-${color}/20`)}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", `bg-${color}/20`)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        {trend !== null && (
          <div className={cn("text-xs font-medium", trend > 0 ? "text-green-500" : trend < 0 ? "text-red-500" : "text-muted-foreground")}>
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailedTable({ groupedData, expandedDays, toggleExpand }: { groupedData: any[]; expandedDays: Set<string>; toggleExpand: (key: string) => void }) {
  return (
    <Card className="glass-card border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Детализация по периодам
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {groupedData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Нет данных за выбранный период</div>
          ) : groupedData.map((group) => (
            <div key={group.key}>
              <button onClick={() => toggleExpand(group.key)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left">
                {expandedDays.has(group.key) ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                <span className="font-medium flex-1">{group.label}</span>
                <Badge variant="outline" className="mr-2">{group.shifts.length} смен</Badge>
                <span className="font-bold text-primary">{formatCurrency(group.totals.revenue)}</span>
              </button>
              {expandedDays.has(group.key) && (
                <div className="bg-muted/20 divide-y divide-border/50">
                  {group.shifts.map((shift: ShiftData) => <ShiftRow key={shift.id} shift={shift} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ShiftRow({ shift }: { shift: ShiftData }) {
  const startTime = parseISO(shift.started_at);
  const endTime = shift.ended_at ? parseISO(shift.ended_at) : new Date();
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) * 10) / 10;

  return (
    <div className="px-4 py-3 pl-12 flex items-center gap-4 text-sm">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="font-semibold text-primary">{shift.cashier_name.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{shift.cashier_name}</p>
        <p className="text-xs text-muted-foreground">
          {format(startTime, 'HH:mm')} — {shift.ended_at ? format(endTime, 'HH:mm') : 'активна'} 
          {shift.ended_at && <span className="ml-1">({duration}ч)</span>}
        </p>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1"><Banknote className="h-3 w-3 text-cash" /><span>{formatCurrency(shift.total_cash)}</span></div>
        <div className="flex items-center gap-1"><Smartphone className="h-3 w-3 text-kaspi" /><span>{formatCurrency(shift.total_kaspi)}</span></div>
      </div>
      <div className="font-semibold text-primary">{formatCurrency(shift.total_cash + shift.total_kaspi)}</div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[200px] ml-auto" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[100px]" />)}
      </div>
      <div className="grid grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[80px]" />)}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    </div>
  );
}
