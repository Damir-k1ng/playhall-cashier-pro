import { useAuth } from '@/contexts/AuthContext';
import { PinLogin } from '@/components/auth/PinLogin';
import { Dashboard } from '@/pages/Dashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return isAuthenticated ? <Dashboard /> : <PinLogin />;
};

export default Index;