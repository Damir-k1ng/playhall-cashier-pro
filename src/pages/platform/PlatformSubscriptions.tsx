import { useEffect, useState } from 'react';
import { platformApi } from '@/lib/platform-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, RefreshCw } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-secondary/20 text-secondary border-secondary/30',
  expired: 'bg-destructive/20 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
  past_due: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export default function PlatformSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedCycle, setSelectedCycle] = useState('');
  const [markPaid, setMarkPaid] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [subs, t, p] = await Promise.all([
        platformApi.getSubscriptions(),
        platformApi.getTenants(),
        platformApi.getPlans(),
      ]);
      setSubscriptions(subs);
      setTenants(t);
      setPlans(p);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  }

  const selectedPlanData = plans.find((p: any) => p.id === selectedPlan);
  const cycles = selectedPlanData?.billing_cycles || [];

  async function handleCreate() {
    if (!selectedTenant || !selectedPlan || !selectedCycle) {
      toast.error('Please fill all fields');
      return;
    }
    setCreating(true);
    try {
      await platformApi.createSubscription({
        tenant_id: selectedTenant,
        plan_id: selectedPlan,
        billing_cycle_id: selectedCycle,
        mark_paid: markPaid,
      });
      toast.success('Subscription created');
      setCreateOpen(false);
      setSelectedTenant('');
      setSelectedPlan('');
      setSelectedCycle('');
      setMarkPaid(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
    setCreating(false);
  }

  // Calculate price for selected cycle
  const selectedCycleData = cycles.find((c: any) => c.id === selectedCycle);
  const pricePreview = selectedPlanData && selectedCycleData
    ? (() => {
        const total = selectedPlanData.price_monthly * selectedCycleData.months;
        const discount = Math.round(total * selectedCycleData.discount_percent / 100);
        return { total, discount, final: total - discount };
      })()
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Subscription
          </Button>
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub: any) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.tenant?.club_name || '—'}</TableCell>
                  <TableCell>{sub.plan?.name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{sub.billing_cycle?.label || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[sub.status] || ''}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {sub.current_period_end
                      ? format(new Date(sub.current_period_end), 'dd.MM.yyyy')
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {subscriptions.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No subscriptions yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Subscription Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Subscription</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Club</Label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger>
                  <SelectValue placeholder="Select club" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.club_name} ({t.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={selectedPlan} onValueChange={(v) => { setSelectedPlan(v); setSelectedCycle(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.price_monthly.toLocaleString()} ₸/мес
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {cycles.length > 0 && (
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {pricePreview && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{pricePreview.total.toLocaleString()} ₸</span>
                </div>
                {pricePreview.discount > 0 && (
                  <div className="flex justify-between text-secondary">
                    <span>Discount ({selectedCycleData?.discount_percent}%)</span>
                    <span>−{pricePreview.discount.toLocaleString()} ₸</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-border pt-1">
                  <span>Total</span>
                  <span>{pricePreview.final.toLocaleString()} ₸</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Switch checked={markPaid} onCheckedChange={setMarkPaid} />
              <Label className="text-sm">Mark as paid</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
