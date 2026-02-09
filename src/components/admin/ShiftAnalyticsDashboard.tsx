import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays, parseISO, startOfWeek, startOfMonth, isSameDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  FileText
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportToExcel, exportToPDF } from '@/lib/export-utils';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AnalyticsData {
  shifts: ShiftData[];
  cashiers: CashierInfo[];
  totals: TotalsSummary;
  previousPeriodTotals: TotalsSummary;
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

// Start date: January 27, 2025
const MIN_DATE = new Date(2025, 0, 27);

export function ShiftAnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
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
      // CRITICAL: Use endOfDay for 'to' date to include the entire last day
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

  // Group shifts by period
  const groupedData = useMemo(() => {
    if (!data?.shifts) return [];

    const groups = new Map<string, ShiftData[]>();
    
    data.shifts.forEach(shift => {
      const date = parseISO(shift.started_at);
      let key: string;
      
      switch (groupBy) {
        case 'week':
          const weekStart = startOfWeek(date, { weekStartsOn: 1 });
          key = format(weekStart, 'yyyy-MM-dd');
          break;
        case 'month':
          const monthStart = startOfMonth(date);
          key = format(monthStart, 'yyyy-MM');
          break;
        default:
          key = format(date, 'yyyy-MM-dd');
      }
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
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

  // Chart data
  const chartData = useMemo(() => {
    return [...groupedData]
      .reverse()
      .map(group => ({
        name: group.label,
        revenue: group.totals.revenue,
        cash: group.totals.cash,
        kaspi: group.totals.kaspi,
        sessions: group.totals.sessions
      }));
  }, [groupedData]);

  // Cashier comparison data with hours and shifts count
  const cashierComparisonData = useMemo(() => {
    if (!data?.shifts || selectedCashier !== 'all') return [];
    
    const cashierTotals = new Map<string, { 
      name: string; 
      revenue: number; 
      sessions: number;
      shiftsCount: number;
      totalHours: number;
      revenuePerHour: number;
    }>();
    
    data.shifts.forEach(shift => {
      if (!cashierTotals.has(shift.cashier_id)) {
        cashierTotals.set(shift.cashier_id, {
          name: shift.cashier_name,
          revenue: 0,
          sessions: 0,
          shiftsCount: 0,
          totalHours: 0,
          revenuePerHour: 0
        });
      }
      const totals = cashierTotals.get(shift.cashier_id)!;
      totals.revenue += shift.total_cash + shift.total_kaspi;
      totals.sessions += shift.sessions_count;
      totals.shiftsCount += 1;
      totals.totalHours += shift.duration_hours;
    });
    
    // Calculate revenue per hour
    cashierTotals.forEach(totals => {
      totals.revenuePerHour = totals.totalHours > 0 
        ? Math.round(totals.revenue / totals.totalHours) 
        : 0;
    });
    
    return Array.from(cashierTotals.values())
      .sort((a, b) => b.revenue - a.revenue);
  }, [data?.shifts, selectedCashier]);

  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedDays(newExpanded);
  };

  const handleExport = async (type: 'excel' | 'pdf') => {
    if (!data?.shifts) return;
    
    const cashierName = selectedCashier !== 'all' 
      ? data.cashiers.find(c => c.id === selectedCashier)?.name 
      : undefined;

    const exportParams = {
      shifts: data.shifts,
      totals: data.totals,
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      cashierName
    };

    if (type === 'excel') {
      await exportToExcel(exportParams);
    } else {
      exportToPDF(exportParams);
    }
  };

  if (isLoading && !data) {
    return <AnalyticsSkeleton />;
  }

  const totals = data?.totals || { revenue: 0, cash: 0, kaspi: 0, games: 0, controllers: 0, drinks: 0, sessions: 0, avgCheck: 0, shiftsCount: 0, totalHours: 0, revenuePerHour: 0 };
  const prevTotals = data?.previousPeriodTotals || totals;
  const percentChange = prevTotals.revenue > 0 
    ? Math.round(((totals.revenue - prevTotals.revenue) / prevTotals.revenue) * 100) 
    : 0;

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
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                } else if (range?.from) {
                  setDateRange({ from: range.from, to: range.from });
                }
              }}
              disabled={(date) => date > new Date() || date < MIN_DATE}
              initialFocus
              className="pointer-events-auto"
              locale={ru}
            />
            <div className="p-3 border-t flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setDateRange({ from: subDays(new Date(), 0), to: new Date() })}>
                Сегодня
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDateRange({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) })}>
                Вчера
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}>
                7 дней
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}>
                30 дней
              </Button>
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
            {data?.cashiers?.map(cashier => (
              <SelectItem key={cashier.id} value={cashier.id}>{cashier.name}</SelectItem>
            ))}
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

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Экспорт</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border border-border">
              <DropdownMenuItem 
                onClick={() => handleExport('excel')}
                className="gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-500" />
                Скачать Excel
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleExport('pdf')}
                className="gap-2 cursor-pointer"
              >
                <FileText className="h-4 w-4 text-red-500" />
                Скачать PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Выручка"
          value={formatCurrency(totals.revenue)}
          icon={<BarChart3 className="h-5 w-5" />}
          trend={percentChange}
          className="col-span-2 md:col-span-1"
        />
        <KpiCard
          title="Наличные"
          value={formatCurrency(totals.cash)}
          icon={<Banknote className="h-5 w-5 text-cash" />}
          iconColor="text-cash"
        />
        <KpiCard
          title="Kaspi"
          value={formatCurrency(totals.kaspi)}
          icon={<Smartphone className="h-5 w-5 text-kaspi" />}
          iconColor="text-kaspi"
        />
        <KpiCard
          title="Средний чек"
          value={formatCurrency(totals.avgCheck)}
          icon={<Receipt className="h-5 w-5" />}
        />
      </div>

      {/* Secondary KPI - Including new metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="glass-card border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totals.sessions}</p>
              <p className="text-xs text-muted-foreground">Сессий</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totals.shiftsCount}</p>
              <p className="text-xs text-muted-foreground">Смен</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{Math.round(totals.totalHours)}ч</p>
              <p className="text-xs text-muted-foreground">Часов работы</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totals.revenuePerHour)}</p>
              <p className="text-xs text-muted-foreground">₸/час</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-secondary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
              <Gamepad2 className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totals.controllers)}</p>
              <p className="text-xs text-muted-foreground">Джойстики</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Coffee className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totals.drinks)}</p>
              <p className="text-xs text-muted-foreground">Напитки</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Динамика выручки
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Выручка']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Нет данных за выбранный период
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Chart */}
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4 text-cash" />
              Способы оплаты
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'cash' ? 'Наличные' : 'Kaspi']}
                  />
                  <Legend formatter={(value) => value === 'cash' ? 'Наличные' : 'Kaspi'} />
                  <Bar dataKey="cash" fill="hsl(var(--cash))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="kaspi" fill="hsl(var(--kaspi))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Нет данных за выбранный период
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cashier Comparison Table */}
      {cashierComparisonData.length > 1 && (
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Сравнение кассиров
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {cashierComparisonData.map((cashier, index) => (
                    <tr key={cashier.name} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="font-semibold text-primary text-xs">
                              {cashier.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium">{cashier.name}</span>
                          {index === 0 && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                              Топ
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-center p-3">
                        <Badge variant="outline" className="font-mono">
                          {cashier.shiftsCount}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <span className="text-muted-foreground">{Math.round(cashier.totalHours)}ч</span>
                      </td>
                      <td className="text-right p-3 font-semibold text-primary">
                        {formatCurrency(cashier.revenue)}
                      </td>
                      <td className="text-right p-3">
                        <span className="text-green-400 font-medium">
                          {formatCurrency(cashier.revenuePerHour)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Table with Drill-down */}
      <Card className="glass-card border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Детализация по периодам
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {groupedData.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Нет данных за выбранный период
              </div>
            ) : (
              groupedData.map((group) => (
                <div key={group.key}>
                  {/* Period Row */}
                  <button
                    onClick={() => toggleExpand(group.key)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    {expandedDays.has(group.key) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-medium flex-1">{group.label}</span>
                    <Badge variant="outline" className="mr-2">
                      {group.shifts.length} смен
                    </Badge>
                    <span className="font-bold text-primary">
                      {formatCurrency(group.totals.revenue)}
                    </span>
                  </button>

                  {/* Expanded Shifts */}
                  {expandedDays.has(group.key) && (
                    <div className="bg-muted/20 divide-y divide-border/50">
                      {group.shifts.map((shift) => (
                        <ShiftRow key={shift.id} shift={shift} />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Components
function KpiCard({ 
  title, 
  value, 
  icon, 
  trend, 
  iconColor,
  className 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend?: number;
  iconColor?: string;
  className?: string;
}) {
  return (
    <Card className={cn("glass-card border-primary/20", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={cn("w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center", iconColor)}>
            {icon}
          </div>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              trend > 0 ? "text-green-500" : trend < 0 ? "text-red-500" : "text-muted-foreground"
            )}>
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

function ShiftRow({ shift }: { shift: ShiftData }) {
  const startTime = parseISO(shift.started_at);
  const endTime = shift.ended_at ? parseISO(shift.ended_at) : new Date();
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) * 10) / 10;

  return (
    <div className="px-4 py-3 pl-12 flex items-center gap-4 text-sm">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="font-semibold text-primary">
          {shift.cashier_name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{shift.cashier_name}</p>
        <p className="text-xs text-muted-foreground">
          {format(startTime, 'HH:mm')} — {shift.ended_at ? format(endTime, 'HH:mm') : 'активна'} 
          {shift.ended_at && <span className="ml-1">({duration}ч)</span>}
        </p>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <Banknote className="h-3 w-3 text-cash" />
          <span>{formatCurrency(shift.total_cash)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Smartphone className="h-3 w-3 text-kaspi" />
          <span>{formatCurrency(shift.total_kaspi)}</span>
        </div>
      </div>
      <div className="font-semibold text-primary">
        {formatCurrency(shift.total_cash + shift.total_kaspi)}
      </div>
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
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[100px]" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[80px]" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    </div>
  );
}

// Utility Functions
function formatPeriodLabel(key: string, groupBy: GroupBy): string {
  switch (groupBy) {
    case 'week':
      const weekDate = parseISO(key);
      return `Неделя ${format(weekDate, 'd MMM', { locale: ru })}`;
    case 'month':
      const [year, month] = key.split('-');
      const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      return format(monthDate, 'LLLL yyyy', { locale: ru });
    default:
      const dayDate = parseISO(key);
      const today = new Date();
      const yesterday = subDays(today, 1);
      
      if (isSameDay(dayDate, today)) return 'Сегодня';
      if (isSameDay(dayDate, yesterday)) return 'Вчера';
      return format(dayDate, 'd MMMM', { locale: ru });
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
