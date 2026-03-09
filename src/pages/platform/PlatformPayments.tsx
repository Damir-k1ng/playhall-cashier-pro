import { useEffect, useState } from 'react';
import { platformApi } from '@/lib/platform-api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';

const statusColors: Record<string, string> = {
  paid: 'bg-secondary/20 text-secondary border-secondary/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  failed: 'bg-destructive/20 text-destructive border-destructive/30',
  refunded: 'bg-muted text-muted-foreground border-border',
};

export default function PlatformPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setLoading(true);
    try {
      const data = await platformApi.getSubscriptionPayments();
      setPayments(data);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Button variant="outline" size="sm" onClick={loadPayments} disabled={loading}>
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
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.tenant?.club_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{p.subscription?.plan?.name || '—'}</TableCell>
                  <TableCell className="text-right font-mono">{p.amount?.toLocaleString()} ₸</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[p.status] || ''}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.payment_method || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(p.created_at), 'dd.MM.yyyy HH:mm')}
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No payments yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
