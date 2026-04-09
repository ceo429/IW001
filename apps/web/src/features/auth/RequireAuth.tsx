import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

/**
 * Route guard. Reminder: this is a UX convenience. The real gate is the
 * server-side Guard chain on the API. A bypass here only means an
 * authenticated-looking UI that immediately fails on the first API call.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
