import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

/**
 * Hook that provides navigation functions with tenant slug prefix.
 * Use in POS components instead of raw useNavigate.
 */
export function useTenantNavigate() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const slug = tenant?.slug || '';
  const prefix = slug ? `/app/${slug}` : '';

  const tenantNavigate = useCallback(
    (path: string | number, options?: { replace?: boolean; state?: any }) => {
      if (typeof path === 'number') {
        navigate(path);
        return;
      }
      // Don't prefix platform, login, or absolute external paths
      if (path.startsWith('/platform') || path.startsWith('/login') || path.startsWith('/app/')) {
        navigate(path, options);
        return;
      }
      navigate(`${prefix}${path}`, options);
    },
    [navigate, prefix]
  );

  const goHome = useCallback(() => {
    navigate(prefix || '/', { replace: true });
  }, [navigate, prefix]);

  return { navigate: tenantNavigate, goHome, prefix };
}
