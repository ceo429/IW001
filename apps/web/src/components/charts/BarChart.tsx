import { useCallback } from 'react';
import { useCanvas } from './useCanvas';
import type { SeriesPoint } from './types';

interface Props {
  data: SeriesPoint[];
  height?: number;
  /** Horizontal orientation (each bar gets its own row). Default: vertical. */
  horizontal?: boolean;
}

const BAR_COLOR = '#eab308';
const BAR_BG = '#262626';
const TEXT_PRIMARY = '#e5e5e5';
const TEXT_MUTED = '#737373';

/**
 * Vertical or horizontal bar chart. Data is plotted against the max
 * value in the series so we never need an explicit scale prop. Labels
 * truncate gracefully when the column is too narrow.
 */
export function BarChart({ data, height = 220, horizontal = false }: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.font = '500 11px Pretendard, sans-serif';
      ctx.textBaseline = 'middle';

      if (horizontal) {
        drawHorizontal(ctx, w, h, data, max);
      } else {
        drawVertical(ctx, w, h, data, max);
      }
    },
    [data, max, horizontal],
  );

  const ref = useCanvas(draw);
  return (
    <canvas
      ref={ref}
      style={{ width: '100%', height }}
      role="img"
      aria-label="막대 차트"
    />
  );
}

function drawVertical(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: SeriesPoint[],
  max: number,
) {
  const paddingX = 16;
  const paddingTop = 16;
  const paddingBottom = 36;
  const chartW = w - paddingX * 2;
  const chartH = h - paddingTop - paddingBottom;
  if (data.length === 0 || chartW <= 0) return;

  const gap = 8;
  const barW = Math.max(4, (chartW - gap * (data.length - 1)) / data.length);

  data.forEach((d, i) => {
    const x = paddingX + i * (barW + gap);
    const barH = (d.value / max) * chartH;
    const y = paddingTop + chartH - barH;

    // Track (background)
    ctx.fillStyle = BAR_BG;
    ctx.fillRect(x, paddingTop, barW, chartH);

    // Bar
    ctx.fillStyle = BAR_COLOR;
    ctx.fillRect(x, y, barW, barH);

    // Value on top
    ctx.textAlign = 'center';
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.fillText(String(d.value), x + barW / 2, y - 8);

    // Label below
    ctx.fillStyle = TEXT_MUTED;
    const labelY = paddingTop + chartH + 14;
    const label = fitLabel(ctx, d.label, barW + gap - 2);
    ctx.fillText(label, x + barW / 2, labelY);
  });
}

function drawHorizontal(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: SeriesPoint[],
  max: number,
) {
  const labelColWidth = 100;
  const valueColWidth = 50;
  const paddingY = 8;
  const rowGap = 6;
  const rowH = Math.max(
    16,
    (h - paddingY * 2 - rowGap * Math.max(0, data.length - 1)) / Math.max(1, data.length),
  );
  const trackX = labelColWidth;
  const trackW = w - labelColWidth - valueColWidth - 8;
  if (trackW <= 0) return;

  data.forEach((d, i) => {
    const y = paddingY + i * (rowH + rowGap);
    const cy = y + rowH / 2;

    // Left label
    ctx.textAlign = 'right';
    ctx.fillStyle = TEXT_MUTED;
    const label = fitLabel(ctx, d.label, labelColWidth - 8);
    ctx.fillText(label, labelColWidth - 8, cy);

    // Track
    ctx.fillStyle = BAR_BG;
    ctx.fillRect(trackX, y + 2, trackW, rowH - 4);

    // Bar
    const barW = (d.value / max) * trackW;
    ctx.fillStyle = BAR_COLOR;
    ctx.fillRect(trackX, y + 2, barW, rowH - 4);

    // Right value
    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.fillText(String(d.value), trackX + trackW + 6, cy);
  });
}

function fitLabel(ctx: CanvasRenderingContext2D, label: string, maxWidth: number): string {
  if (ctx.measureText(label).width <= maxWidth) return label;
  const ellipsis = '…';
  let lo = 0;
  let hi = label.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (ctx.measureText(label.slice(0, mid) + ellipsis).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo === 0 ? '' : label.slice(0, lo) + ellipsis;
}
