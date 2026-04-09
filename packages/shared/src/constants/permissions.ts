/**
 * Default permission matrix — (role × pageId) -> (read, write, delete).
 *
 * These are the BASELINE values seeded into the `Permission` table on first
 * boot. Admins may then override them in the UI; the DB is the runtime
 * authority, not this file.
 *
 * See 개발기획서.md §5.2 for the page presets per role.
 */

import { ROLE_IDS, type RoleId } from './roles.js';
import { PAGE_IDS } from './pages.js';

export interface PermissionEntry {
  role: RoleId;
  pageId: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

/** Pages each role may READ by default. */
const READABLE_BY_ROLE: Record<RoleId, readonly string[]> = {
  admin: PAGE_IDS, // everything
  manager: PAGE_IDS.filter((id) => id !== 'admin' && id !== 'audit'),
  engineer: [
    'dashboard',
    'home-status',
    'spatial',
    'projects',
    'as-intake',
    'maintenance',
    'as-guide',
    'alarms',
  ],
  viewer: ['dashboard', 'home-status', 'stats', 'customers', 'quotes', 'products'],
};

/** Pages each role may WRITE (create/update) by default. */
const WRITABLE_BY_ROLE: Record<RoleId, readonly string[]> = {
  admin: PAGE_IDS,
  manager: PAGE_IDS.filter(
    (id) => id !== 'admin' && id !== 'audit' && id !== 'accounts',
  ),
  engineer: ['spatial', 'projects', 'as-intake', 'maintenance'],
  viewer: [], // read-only
};

/** Pages each role may DELETE by default. */
const DELETABLE_BY_ROLE: Record<RoleId, readonly string[]> = {
  admin: PAGE_IDS,
  manager: ['projects', 'quotes'],
  engineer: [],
  viewer: [],
};

/**
 * Build the full default matrix as a flat array of entries, suitable for
 * `prisma.permission.createMany({ data })`.
 */
export function buildDefaultPermissionMatrix(): PermissionEntry[] {
  const out: PermissionEntry[] = [];
  for (const role of ROLE_IDS) {
    const r = new Set(READABLE_BY_ROLE[role]);
    const w = new Set(WRITABLE_BY_ROLE[role]);
    const d = new Set(DELETABLE_BY_ROLE[role]);
    for (const pageId of PAGE_IDS) {
      out.push({
        role,
        pageId,
        canRead: r.has(pageId),
        canWrite: w.has(pageId),
        canDelete: d.has(pageId),
      });
    }
  }
  return out;
}

/** Actions that can be enforced via @RequirePermission(). */
export type PermissionAction = 'read' | 'write' | 'delete';
