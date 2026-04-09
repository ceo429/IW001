/**
 * The 19 pages defined by the original spec, grouped into 7 navigation groups.
 * See 개발기획서.md §3.
 *
 * `id` is the stable identifier used both in React Router paths and in the
 * `Permission` table. Do NOT change `id` after deployment; add a new page instead.
 */

export type PageGroup =
  | 'monitoring'
  | 'operations'
  | 'finance'
  | 'analytics'
  | 'customers'
  | 'management'
  | 'system';

export interface PageDef {
  id: string;
  label: string;
  group: PageGroup;
  icon: string;
}

export const PAGES: readonly PageDef[] = [
  // 모니터링
  { id: 'dashboard', label: '대시보드', group: 'monitoring', icon: 'dashboard' },
  { id: 'accounts', label: '계정관리(헤이홈)', group: 'monitoring', icon: 'accounts' },
  { id: 'home-status', label: '장소별 현황', group: 'monitoring', icon: 'home-status' },

  // 운영
  { id: 'spatial', label: '공간매핑', group: 'operations', icon: 'spatial' },
  { id: 'projects', label: '프로젝트 & 태스크', group: 'operations', icon: 'projects' },
  { id: 'announcements', label: '공지사항', group: 'operations', icon: 'announcements' },
  { id: 'as-intake', label: 'AS 인입건', group: 'operations', icon: 'as-intake' },

  // 재무
  { id: 'quotes', label: '견적서', group: 'finance', icon: 'quotes' },
  { id: 'products', label: '품목관리', group: 'finance', icon: 'products' },

  // 분석
  { id: 'stats', label: '통계', group: 'analytics', icon: 'stats' },
  { id: 'period-stats', label: '기간별 상세통계', group: 'analytics', icon: 'period-stats' },
  { id: 'okr', label: 'OKR & KPI', group: 'analytics', icon: 'okr' },

  // 고객
  { id: 'customers', label: '고객관리', group: 'customers', icon: 'customers' },

  // 관리
  { id: 'approvals', label: '결재센터', group: 'management', icon: 'approvals' },
  { id: 'maintenance', label: '유지보수', group: 'management', icon: 'maintenance' },
  { id: 'as-guide', label: 'AS 가이드', group: 'management', icon: 'as-guide' },

  // 시스템
  { id: 'alarms', label: '알림관리', group: 'system', icon: 'alarms' },
  { id: 'audit', label: '감사로그', group: 'system', icon: 'audit' },
  { id: 'admin', label: '관리자 설정', group: 'system', icon: 'admin' },
] as const;

export const PAGE_IDS = PAGES.map((p) => p.id);

export const GROUP_LABELS: Record<PageGroup, string> = {
  monitoring: '모니터링',
  operations: '운영',
  finance: '재무',
  analytics: '분석',
  customers: '고객',
  management: '관리',
  system: '시스템',
};

export const GROUP_ORDER: PageGroup[] = [
  'monitoring',
  'operations',
  'finance',
  'analytics',
  'customers',
  'management',
  'system',
];
