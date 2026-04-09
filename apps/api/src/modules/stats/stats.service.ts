import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface ChartSeries {
  title: string;
  points: SeriesPoint[];
}

/**
 * Stats aggregations used by the analytics page. Everything is derived
 * from the primary tables — no materialized views yet. That's fine at
 * current scale; if the "by period" query becomes a hot spot, we'll
 * migrate it to a monthly rollup table (docs/ROADMAP.md Phase 3).
 */
@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Tab 1: by customer ----

  async byCustomer(): Promise<{
    topByQuoteCount: ChartSeries;
    topByDeviceCount: ChartSeries;
  }> {
    const withQuotes = await this.prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { quotes: true, homes: true } },
      },
      orderBy: { name: 'asc' },
      take: 500,
    });

    const topByQuotes = [...withQuotes]
      .sort((a, b) => b._count.quotes - a._count.quotes)
      .slice(0, 8)
      .filter((c) => c._count.quotes > 0);

    // Homes-per-customer is a proxy for "device count" since it's one
    // hop away and Prisma can't groupBy across relations cheaply.
    const topByHomes = [...withQuotes]
      .sort((a, b) => b._count.homes - a._count.homes)
      .slice(0, 8)
      .filter((c) => c._count.homes > 0);

    return {
      topByQuoteCount: {
        title: '견적 많은 고객사 Top 8',
        points: topByQuotes.map((c) => ({ label: c.name, value: c._count.quotes })),
      },
      topByDeviceCount: {
        title: '장소 많은 고객사 Top 8',
        points: topByHomes.map((c) => ({ label: c.name, value: c._count.homes })),
      },
    };
  }

  // ---- Tab 2: by product ----

  async byProduct(): Promise<{
    byCategory: ChartSeries;
    topByStock: ChartSeries;
  }> {
    const byCategory = await this.prisma.product.groupBy({
      by: ['category'],
      _count: { _all: true },
      _sum: { stock: true },
    });

    const topByStock = await this.prisma.product.findMany({
      select: { name: true, stock: true },
      orderBy: { stock: 'desc' },
      take: 8,
    });

    return {
      byCategory: {
        title: '카테고리별 품목 수',
        points: byCategory.map((g) => ({
          label: g.category,
          value: g._count._all,
        })),
      },
      topByStock: {
        title: '재고 많은 품목 Top 8',
        points: topByStock.map((p) => ({ label: p.name, value: p.stock })),
      },
    };
  }

  // ---- Tab 3: by period ----

  /**
   * Quote totals per month for the given year (default: current).
   * Implemented via a raw query because Prisma's groupBy doesn't support
   * date-trunc directly. Safe because `year` is coerced to Number by the
   * controller's zod pipe before this call.
   */
  async byPeriod(year: number): Promise<{
    quotesPerMonth: ChartSeries;
    homesAddedPerMonth: ChartSeries;
  }> {
    const quotesPerMonth = await this.prisma.$queryRaw<
      Array<{ month: number; count: bigint }>
    >`
      SELECT EXTRACT(MONTH FROM "issuedAt")::int AS month, COUNT(*)::bigint AS count
      FROM "Quote"
      WHERE EXTRACT(YEAR FROM "issuedAt") = ${year}
      GROUP BY month
      ORDER BY month ASC
    `;

    const homesPerMonth = await this.prisma.$queryRaw<
      Array<{ month: number; count: bigint }>
    >`
      SELECT EXTRACT(MONTH FROM "createdAt")::int AS month, COUNT(*)::bigint AS count
      FROM "Home"
      WHERE EXTRACT(YEAR FROM "createdAt") = ${year}
      GROUP BY month
      ORDER BY month ASC
    `;

    return {
      quotesPerMonth: fillMonths(`${year}년 월별 견적`, quotesPerMonth),
      homesAddedPerMonth: fillMonths(`${year}년 월별 장소 추가`, homesPerMonth),
    };
  }

  // ---- Multi-year trends (used by the period-stats page) -----------------

  /**
   * Annual totals over a year range. Returns three parallel dense series
   * (quotes / homes / devices) suitable for a line or multi-bar chart.
   * Missing years come back as 0 so the caller never has to backfill.
   * Range is inclusive on both ends.
   */
  async multiYear(
    fromYear: number,
    toYear: number,
  ): Promise<{
    yearlyQuotes: ChartSeries;
    yearlyHomes: ChartSeries;
    yearlyDevices: ChartSeries;
    summary: {
      totalQuotes: number;
      totalHomes: number;
      totalDevices: number;
    };
  }> {
    const years: number[] = [];
    for (let y = fromYear; y <= toYear; y++) years.push(y);

    const [quoteRows, homeRows, deviceRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ year: number; count: bigint }>>`
        SELECT EXTRACT(YEAR FROM "issuedAt")::int AS year, COUNT(*)::bigint AS count
        FROM "Quote"
        WHERE EXTRACT(YEAR FROM "issuedAt") BETWEEN ${fromYear} AND ${toYear}
        GROUP BY year
        ORDER BY year ASC
      `,
      this.prisma.$queryRaw<Array<{ year: number; count: bigint }>>`
        SELECT EXTRACT(YEAR FROM "createdAt")::int AS year, COUNT(*)::bigint AS count
        FROM "Home"
        WHERE EXTRACT(YEAR FROM "createdAt") BETWEEN ${fromYear} AND ${toYear}
        GROUP BY year
        ORDER BY year ASC
      `,
      this.prisma.$queryRaw<Array<{ year: number; count: bigint }>>`
        SELECT EXTRACT(YEAR FROM "createdAt")::int AS year, COUNT(*)::bigint AS count
        FROM "Device"
        WHERE EXTRACT(YEAR FROM "createdAt") BETWEEN ${fromYear} AND ${toYear}
        GROUP BY year
        ORDER BY year ASC
      `,
    ]);

    const yearlyQuotes = fillYears('연도별 견적 발행', years, quoteRows);
    const yearlyHomes = fillYears('연도별 장소 도입', years, homeRows);
    const yearlyDevices = fillYears('연도별 기기 추가', years, deviceRows);

    return {
      yearlyQuotes,
      yearlyHomes,
      yearlyDevices,
      summary: {
        totalQuotes: yearlyQuotes.points.reduce((s, p) => s + p.value, 0),
        totalHomes: yearlyHomes.points.reduce((s, p) => s + p.value, 0),
        totalDevices: yearlyDevices.points.reduce((s, p) => s + p.value, 0),
      },
    };
  }
}

/**
 * Ensure all 12 months are present even when no rows exist for that month
 * — the chart component expects a dense series.
 */
function fillMonths(
  title: string,
  rows: Array<{ month: number; count: bigint }>,
): ChartSeries {
  const map = new Map<number, number>();
  for (const r of rows) map.set(Number(r.month), Number(r.count));
  const points: SeriesPoint[] = [];
  for (let m = 1; m <= 12; m++) {
    points.push({ label: `${m}월`, value: map.get(m) ?? 0 });
  }
  return { title, points };
}

/** Like fillMonths but for an arbitrary year range. */
function fillYears(
  title: string,
  years: number[],
  rows: Array<{ year: number; count: bigint }>,
): ChartSeries {
  const map = new Map<number, number>();
  for (const r of rows) map.set(Number(r.year), Number(r.count));
  return {
    title,
    points: years.map((y) => ({ label: `${y}`, value: map.get(y) ?? 0 })),
  };
}
