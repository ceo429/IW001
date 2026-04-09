import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/**
 * Authenticated shell: sidebar + topbar + routed outlet.
 */
export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100 dark:bg-neutral-950 dark:text-neutral-100">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
