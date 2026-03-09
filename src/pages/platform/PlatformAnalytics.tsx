import { Card, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function PlatformAnalytics() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <Card className="border-border">
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mb-4 opacity-40" />
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm">Platform-wide analytics will be available here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
