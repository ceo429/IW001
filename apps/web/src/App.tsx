import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { RequireAuth } from './features/auth/RequireAuth';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { QuotesListPage } from './features/quotes/QuotesListPage';
import { QuoteDetailPage } from './features/quotes/QuoteDetailPage';
import { QuoteEditorPage } from './features/quotes/QuoteEditorPage';
import { ProductsPage } from './features/products/ProductsPage';
import { CustomersPage } from './features/customers/CustomersPage';
import { AdminPage } from './features/admin/AdminPage';
import { HomeStatusPage } from './features/homes/HomeStatusPage';
import { PlaceholderPage } from './components/layout/PlaceholderPage';
import { PAGES } from '@iw001/shared';

/**
 * Top-level route table. Every spec page is registered here — the ones that
 * ship in Phase 1 use real feature components, the rest temporarily render
 * <PlaceholderPage> so navigation is already fully wired.
 *
 * Phase 1 live routes:
 *   - /dashboard  → DashboardPage
 *   - /quotes     → QuotesListPage (+ /new, /:id, /:id/edit)
 */

const IMPLEMENTED_IDS = new Set([
  'dashboard',
  'quotes',
  'products',
  'customers',
  'admin',
  'home-status',
]);

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

        {/* Quotes feature — nested so the sidebar highlight still works. */}
        <Route path="quotes" element={<QuotesListPage />} />
        <Route path="quotes/new" element={<QuoteEditorPage />} />
        <Route path="quotes/:id" element={<QuoteDetailPage />} />
        <Route path="quotes/:id/edit" element={<QuoteEditorPage />} />

        {/* Products feature */}
        <Route path="products" element={<ProductsPage />} />

        {/* Customers feature */}
        <Route path="customers" element={<CustomersPage />} />

        {/* Admin settings (permission matrix editor) */}
        <Route path="admin" element={<AdminPage />} />

        {/* Monitoring — 장소별 현황 */}
        <Route path="home-status" element={<HomeStatusPage />} />

        {/* Remaining spec pages — live nav, placeholder body (Phase 2). */}
        {PAGES.filter((p) => !IMPLEMENTED_IDS.has(p.id)).map((page) => (
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
