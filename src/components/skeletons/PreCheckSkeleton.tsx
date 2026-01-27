import { Skeleton } from '@/components/ui/skeleton';
import { CLUB_NAME } from '@/lib/constants';

export function PreCheckSkeleton() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,hsl(185_100%_50%_/_0.03)_0%,transparent_50%)] pointer-events-none" />
      
      {/* Header Skeleton */}
      <header className="shrink-0 glass-card border-b border-primary/10 px-6 py-4 relative z-10">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <span className="text-xs text-muted-foreground tracking-wider">{CLUB_NAME}</span>
          <div className="w-16" />
        </div>
      </header>

      {/* Content Skeleton */}
      <main className="flex-1 min-h-0 overflow-y-auto p-6 relative z-10">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Title Skeleton */}
          <div className="text-center space-y-2">
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-5 w-48 mx-auto" />
          </div>

          {/* Time Info Card Skeleton */}
          <div className="glass-card rounded-2xl border border-primary/20 p-6">
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="text-center">
                  <Skeleton className="h-3 w-12 mx-auto mb-2" />
                  <Skeleton className="h-8 w-16 mx-auto" />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 flex justify-center">
              <Skeleton className="h-5 w-32" />
            </div>
          </div>

          {/* Summary Card Skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card rounded-xl border border-border/50 p-5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            ))}
          </div>

          {/* Total Skeleton */}
          <div className="glass-card rounded-2xl border-2 border-primary/30 p-8 text-center">
            <Skeleton className="h-4 w-32 mx-auto mb-3" />
            <Skeleton className="h-16 w-48 mx-auto" />
          </div>

          {/* Button Skeleton */}
          <Skeleton className="w-full h-20 rounded-2xl" />
        </div>
      </main>
    </div>
  );
}
