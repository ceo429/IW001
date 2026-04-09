import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { RequireAuth } from './features/auth/RequireAuth';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { PlaceholderPage } from './components/layout/PlaceholderPage';
import { PAGES } from '@iw001/shared';

/**
 * Top-level route table. Every spec page is registered here — the ones that
 * ship in Phase 1 use real feature components, the rest temporarily render
 * <PlaceholderPage> so navigation is already fully wired.
 */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Phase 2+ placeholders — the nav is live, the content waits. */}
        {PAGES.filter((p) => p.id !== 'dashboard').map((page) => (
          <Route
            key={page.id}
            path={page.id}
            element={<PlaceholderPage page={page} />}
          />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
