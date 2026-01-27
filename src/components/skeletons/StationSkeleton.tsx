import { Skeleton } from '@/components/ui/skeleton';
import { CLUB_NAME } from '@/lib/constants';

export function StationSkeleton() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,hsl(185_100%_50%_/_0.03)_0%,transparent_50%)] pointer-events-none" />
      
      {/* Header Skeleton */}
      <header className="shrink-0 glass-card border-b border-primary/10 px-6 py-4 relative z-10">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <span className="text-xs text-muted-foreground tracking-wider font-brand">{CLUB_NAME}</span>
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      </header>

      {/* Content Skeleton */}
      <main className="flex-1 min-h-0 overflow-y-auto p-6 relative z-10">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Station Name */}
          <div className="mb-8">
            <Skeleton className="h-12 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>

          {/* Timer Skeleton */}
          <div className="py-16 rounded-3xl glass-card border-2 border-primary/30 flex flex-col items-center justify-center">
            <Skeleton className="h-24 w-80 mb-6" />
            <Skeleton className="h-6 w-48" />
          </div>

          {/* Controllers Section Skeleton */}
          <div className="glass-card rounded-2xl border border-primary/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-10 w-28 rounded-xl" />
            </div>
            <Skeleton className="h-5 w-40" />
          </div>

          {/* Drinks Section Skeleton */}
          <div className="glass-card rounded-2xl border border-success/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-10 w-28 rounded-xl" />
            </div>
            <Skeleton className="h-5 w-36" />
          </div>

          {/* End Session Button Skeleton */}
          <Skeleton className="w-full h-20 rounded-2xl" />
        </div>
      </main>
    </div>
  );
}
