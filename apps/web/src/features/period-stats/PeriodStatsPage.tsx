import { useState } from 'react';
import { BarChart, LineChart } from '@/components/charts';
import { useMultiYear } from './api/usePeriodStats';

/**
 * 기간별 상세통계 — year-over-year trends across quotes, homes, devices.
 * Distinct from the stats "period" tab, which shows monthly detail for
 * a single year. This page zooms out to the multi-year picture.
 */
export function PeriodStatsPage() {
  const currentYear = new Date().getFullYear();
  const [from, setFrom] = useState(currentYear - 5);
  const [to, setTo] = useState(currentYear);

  const { data, isLoading } = useMultiYear(from, to);

  const years: number[] = [];
  for (let y = currentYear - 10; y <= currentYear; y++) years.push(y);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-neutral-500">분석</div>
        <h1 className="mt-1 text-2xl font-bold">기간별 상세통계</h1>
        <p className="mt-1 text-xs text-neutral-500">
          연도별 견적·장소·기기 추세를 한눈에 확인합니다. 월별 상세는
          <a className="ml-1 text-brand-400 hover:underline" href="/stats">
            통계
          </a>{' '}
          페이지의 "기간" 탭에서 확인할 수 있습니다.
        </p>
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500">시작 연도</label>
          <select
            className="input !py-1"
            value={from}
            onChange={(e) => setFrom(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500">종료 연도</label>
          <select
            className="input !py-1"
            value={to}
            onChange={(e) => setTo(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y} disabled={y < from}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-xs text-neutral-500">
          범위: {from} – {to} ({to - from + 1}년)
        </div>
      </div>

      {isLoading && (
        <div className="card text-center text-sm text-neutral-500">불러오는 중…</div>
      )}

      {data && (
        <>
          <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard label="총 견적" value={data.summary.totalQuotes} />
            <KpiCard label="총 장소" value={data.summary.totalHomes} />
            <KpiCard label="총 기기" value={data.summary.totalDevices} />
          </section>

          <section className="card mb-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-200">
              {data.yearlyQuotes.title}
            </h2>
            <LineChart data={data.yearlyQuotes.points} height={240} />
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="card">
              <h2 className="mb-3 text-sm font-semibold text-neutral-200">
                {data.yearlyHomes.title}
              </h2>
              <BarChart data={data.yearlyHomes.points} height={240} />
            </section>
            <section className="card">
              <h2 className="mb-3 text-sm font-semibold text-neutral-200">
                {data.yearlyDevices.title}
              </h2>
              <BarChart data={data.yearlyDevices.points} height={240} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-brand-400">
        {value.toLocaleString('ko-KR')}
      </div>
    </div>
  );
}
