/**
 * Dashboard — the one real feature page shipped in Phase 1. Data is mocked
 * for the scaffold; Phase 2 will replace with a TanStack Query hook hitting
 * `GET /stats/overview`.
 */
export function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold">대시보드</h1>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="전체 계정" value="42" hint="+3 vs 지난주" />
        <KpiCard label="총 장소" value="128" hint="5개 신규" />
        <KpiCard label="총 기기" value="2,341" hint="24h 변동 없음" />
        <KpiCard label="온라인율" value="96.4%" hint="목표 95% 이상" />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-neutral-300">연도별 도입 추이</h2>
          <div className="flex h-48 items-end gap-2">
            {[34, 52, 48, 71, 88, 96, 108, 124].map((v, i) => (
              <div key={i} className="flex-1">
                <div
                  className="rounded-t bg-brand-500/70"
                  style={{ height: `${v}%` }}
                  aria-hidden
                />
                <div className="mt-1 text-center text-[10px] text-neutral-500">
                  {2019 + i}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            시각화는 Phase 2에서 TanStack Query + Canvas 차트 컴포넌트로 교체됩니다.
          </p>
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-neutral-300">최근 알림</h2>
          <ul className="space-y-3 text-sm">
            {mockAlerts.map((a) => (
              <li key={a.id} className="border-l-2 border-brand-500/70 pl-3">
                <div className="font-medium text-neutral-200">{a.title}</div>
                <div className="text-xs text-neutral-500">{a.when}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-brand-400">{value}</div>
      <div className="mt-1 text-xs text-neutral-500">{hint}</div>
    </div>
  );
}

const mockAlerts = [
  { id: 1, title: '공릉 해링턴 — 허브 오프라인', when: '2분 전' },
  { id: 2, title: '프렌즈스크린 서초 — 센서 배터리 20%', when: '24분 전' },
  { id: 3, title: '김캐디 골프존S — 견적 QT-2026-0042 승인 대기', when: '1시간 전' },
  { id: 4, title: '스마트상점 서강 — AS 접수 (스위치 무응답)', when: '3시간 전' },
  { id: 5, title: '판도 당산 — 정기 점검 일정 (내일)', when: '어제' },
];
