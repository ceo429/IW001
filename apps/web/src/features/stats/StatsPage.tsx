import { useState, type ReactNode } from 'react';
import { BarChart, DonutChart, LineChart, type ChartSeries } from '@/components/charts';
import {
  useStatsByCustomer,
  useStatsByPeriod,
  useStatsByProduct,
} from './api/useStats';

type Tab = 'customer' | 'product' | 'period';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'customer', label: '고객' },
  { id: 'product', label: '제품' },
  { id: 'period', label: '기간' },
];

/**
 * Analytics page. Three tabs, each shown as a pair of chart cards.
 * The Canvas chart primitives live in apps/web/src/components/charts
 * and are deliberately framework-free — they take a `ChartSeries`
 * payload exactly as the API returns it.
 */
export function StatsPage() {
  const [tab, setTab] = useState<Tab>('customer');
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-neutral-500">분석</div>
        <h1 className="mt-1 text-2xl font-bold">통계</h1>
      </div>

      <nav className="mb-4 flex items-center gap-1 border-b border-neutral-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2 text-sm transition ${
              tab === t.id
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-200'
            }`}
          >
            {t.label}
          </button>
        ))}
        {tab === 'period' && (
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-neutral-500">연도</label>
            <select
              className="input !py-1"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}
      </nav>

      {tab === 'customer' && <CustomerTab />}
      {tab === 'product' && <ProductTab />}
      {tab === 'period' && <PeriodTab year={year} />}
    </div>
  );
}

// -- Tab 1 -------------------------------------------------------------------

function CustomerTab() {
  const { data, isLoading } = useStatsByCustomer();

  if (isLoading || !data) return <LoadingCard />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title={data.topByQuoteCount.title}>
        <BarChart data={data.topByQuoteCount.points} horizontal height={260} />
        {data.topByQuoteCount.points.length === 0 && <EmptyNote />}
      </ChartCard>
      <ChartCard title={data.topByDeviceCount.title}>
        <BarChart data={data.topByDeviceCount.points} horizontal height={260} />
        {data.topByDeviceCount.points.length === 0 && <EmptyNote />}
      </ChartCard>
    </div>
  );
}

// -- Tab 2 -------------------------------------------------------------------

function ProductTab() {
  const { data, isLoading } = useStatsByProduct();

  if (isLoading || !data) return <LoadingCard />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title={data.byCategory.title}>
        <DonutChart data={data.byCategory.points} />
        {data.byCategory.points.length === 0 && <EmptyNote />}
      </ChartCard>
      <ChartCard title={data.topByStock.title}>
        <BarChart data={data.topByStock.points} horizontal height={260} />
        {data.topByStock.points.length === 0 && <EmptyNote />}
      </ChartCard>
    </div>
  );
}

// -- Tab 3 -------------------------------------------------------------------

function PeriodTab({ year }: { year: number }) {
  const { data, isLoading } = useStatsByPeriod(year);

  if (isLoading || !data) return <LoadingCard />;

  return (
    <div className="grid grid-cols-1 gap-4">
      <ChartCard title={data.quotesPerMonth.title} subtitle="월별 견적 발행 건수">
        <LineChart data={data.quotesPerMonth.points} />
      </ChartCard>
      <ChartCard title={data.homesAddedPerMonth.title} subtitle="신규 장소 등록 수">
        <LineChart data={data.homesAddedPerMonth.points} />
      </ChartCard>

      <TotalsRow series={[data.quotesPerMonth, data.homesAddedPerMonth]} />
    </div>
  );
}

// -- Helpers -----------------------------------------------------------------

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <header className="mb-3">
        <h2 className="text-sm font-semibold text-neutral-200">{title}</h2>
        {subtitle && <p className="text-[10px] text-neutral-500">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function EmptyNote() {
  return (
    <p className="mt-3 text-center text-[10px] text-neutral-600">
      표시할 데이터가 없습니다.
    </p>
  );
}

function LoadingCard() {
  return (
    <div className="card text-center text-sm text-neutral-500">불러오는 중…</div>
  );
}

function TotalsRow({ series }: { series: ChartSeries[] }) {
  return (
    <section className="grid grid-cols-2 gap-3">
      {series.map((s) => {
        const total = s.points.reduce((sum, p) => sum + p.value, 0);
        return (
          <div key={s.title} className="card">
            <div className="text-xs text-neutral-500">{s.title} (연간 합계)</div>
            <div className="mt-1 text-3xl font-bold text-brand-400">
              {total.toLocaleString('ko-KR')}
            </div>
          </div>
        );
      })}
    </section>
  );
}
