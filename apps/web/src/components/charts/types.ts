/**
 * Shared chart primitive types.
 *
 * Per 기획서 §2.1 we draw charts with the raw Canvas API instead of a
 * dependency. These shapes match what apps/api/src/modules/stats returns
 * so charts can take the server response unchanged.
 */

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface ChartSeries {
  title: string;
  points: SeriesPoint[];
}

/** Palette derived from the Tailwind brand + complementary tones. */
export const CHART_COLORS = [
  '#eab308',
  '#3b82f6',
  '#22c55e',
  '#ef4444',
  '#a855f7',
  '#06b6d4',
  '#f97316',
  '#ec4899',
] as const;
