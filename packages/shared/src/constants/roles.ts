/**
 * Role definitions.
 *
 * Mirrors the Prisma `Role` enum in apps/api/prisma/schema.prisma. When adding
 * a role, update both places and migrate the `Permission` table accordingly.
 */

export const ROLES = {
  admin: { id: 'admin', label: '최고관리자', description: '모든 기능 접근', rank: 100 },
  manager: { id: 'manager', label: '매니저', description: '관리자 설정 제외', rank: 80 },
  engineer: { id: 'engineer', label: '엔지니어', description: '기술/운영 한정', rank: 60 },
  viewer: { id: 'viewer', label: '뷰어', description: '읽기 전용', rank: 20 },
} as const;

export type RoleId = keyof typeof ROLES;

export const ROLE_IDS = Object.keys(ROLES) as RoleId[];

/**
 * Check whether `a` outranks `b`. Used for UI gating like "can this user
 * edit another user" — but never as the final authorization check.
 */
export function outranks(a: RoleId, b: RoleId): boolean {
  return ROLES[a].rank > ROLES[b].rank;
}
