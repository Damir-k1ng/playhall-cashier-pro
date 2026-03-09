import { useEffect, useState } from 'react';
import { platformApi } from '@/lib/platform-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CheckCircle, Ban, Pause, CalendarPlus, ExternalLink, RefreshCw } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-secondary/20 text-secondary border-secondary/30',
  trial: 'bg-primary/20 text-primary border-primary/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  expired: 'bg-destructive/20 text-destructive border-destructive/30',
  suspended: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  blocked: 'bg-destructive/20 text-destructive border-destructive/30',
};

export default function PlatformClubs() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Approve dialog
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; tenant: any | null }>({ open: false, tenant: null });
  const [trialDays, setTrialDays] = useState(14);

  // Extend trial dialog
  const [extendDialog, setExtendDialog] = useState<{ open: boolean; tenant: any | null }>({ open: false, tenant: null });
  const [extendDays, setExtendDays] = useState(7);

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    setLoading(true);
    try {
      const data = await platformApi.getTenants();
      setTenants(data);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  }

  async function handleApprove() {
    if (!approveDialog.tenant) return;
    setActionLoading(approveDialog.tenant.id);
    try {
      await platformApi.approveTenant(approveDialog.tenant.id, trialDays);
      toast.success(`${approveDialog.tenant.club_name} approved with ${trialDays}-day trial`);
      setApproveDialog({ open: false, tenant: null });
      loadTenants();
    } catch (err: any) {
      toast.error(err.message);
    }
    setActionLoading(null);
  }

  async function handleSuspend(tenant: any) {
    setActionLoading(tenant.id);
    try {
      await platformApi.suspendTenant(tenant.id);
      toast.success(`${tenant.club_name} suspended`);
      loadTenants();
    } catch (err: any) {
      toast.error(err.message);
    }
    setActionLoading(null);
  }

  async function handleBlock(tenant: any) {
    setActionLoading(tenant.id);
    try {
      await platformApi.blockTenant(tenant.id);
      toast.success(`${tenant.club_name} blocked`);
      loadTenants();
    } catch (err: any) {
      toast.error(err.message);
    }
    setActionLoading(null);
  }

  async function handleExtend() {
    if (!extendDialog.tenant) return;
    setActionLoading(extendDialog.tenant.id);
    try {
      await platformApi.extendTrial(extendDialog.tenant.id, extendDays);
      toast.success(`Trial extended by ${extendDays} days`);
      setExtendDialog({ open: false, tenant: null });
      loadTenants();
    } catch (err: any) {
      toast.error(err.message);
    }
    setActionLoading(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clubs</h1>
        <Button variant="outline" size="sm" onClick={loadTenants} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Club</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-center">Stations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trial Until</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.club_name}</TableCell>
                  <TableCell className="text-muted-foreground">{tenant.city || '—'}</TableCell>
                  <TableCell className="text-center">{tenant.stations_count}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[tenant.status] || ''}>
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {tenant.trial_until
                      ? format(new Date(tenant.trial_until), 'dd.MM.yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {tenant.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Approve"
                          disabled={actionLoading === tenant.id}
                          onClick={() => {
                            setTrialDays(14);
                            setApproveDialog({ open: true, tenant });
                          }}
                        >
                          <CheckCircle className="h-4 w-4 text-secondary" />
                        </Button>
                      )}
                      {['trial', 'active'].includes(tenant.status) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Suspend"
                          disabled={actionLoading === tenant.id}
                          onClick={() => handleSuspend(tenant)}
                        >
                          <Pause className="h-4 w-4 text-orange-400" />
                        </Button>
                      )}
                      {tenant.status !== 'blocked' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Block"
                          disabled={actionLoading === tenant.id}
                          onClick={() => handleBlock(tenant)}
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      {['trial', 'expired'].includes(tenant.status) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Extend Trial"
                          disabled={actionLoading === tenant.id}
                          onClick={() => {
                            setExtendDays(7);
                            setExtendDialog({ open: true, tenant });
                          }}
                        >
                          <CalendarPlus className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tenants.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No clubs yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialog.open} onOpenChange={(open) => setApproveDialog({ open, tenant: approveDialog.tenant })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve {approveDialog.tenant?.club_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Trial days</Label>
            <Input
              type="number"
              min={1}
              max={365}
              value={trialDays}
              onChange={(e) => setTrialDays(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Status will change to <strong>trial</strong> and POS access will be granted for the specified duration.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog({ open: false, tenant: null })}>Cancel</Button>
            <Button onClick={handleApprove} disabled={actionLoading !== null}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Trial Dialog */}
      <Dialog open={extendDialog.open} onOpenChange={(open) => setExtendDialog({ open, tenant: extendDialog.tenant })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Trial — {extendDialog.tenant?.club_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Additional days</Label>
            <Input
              type="number"
              min={1}
              max={365}
              value={extendDays}
              onChange={(e) => setExtendDays(Number(e.target.value))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialog({ open: false, tenant: null })}>Cancel</Button>
            <Button onClick={handleExtend} disabled={actionLoading !== null}>Extend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
