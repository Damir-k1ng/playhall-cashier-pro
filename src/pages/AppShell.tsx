import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Dashboard } from '@/pages/Dashboard';
import { Loader2 } from 'lucide-react';

export default function AppShell() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, isLoading, tenant } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (tenant?.slug && slug !== tenant.slug) {
    return <Navigate to={`/app/${tenant.slug}`} replace />;
  }

  return <Dashboard />;
}
