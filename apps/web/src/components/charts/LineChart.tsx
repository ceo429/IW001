import { useCallback } from 'react';
import { useCanvas } from './useCanvas';
import type { SeriesPoint } from './types';

interface Props {
  data: SeriesPoint[];
  height?: number;
}

const LINE_COLOR = '#eab308';
const POINT_COLOR = '#facc15';
const GRID_COLOR = '#262626';
const TEXT_MUTED = '#737373';

/**
 * Simple single-series line chart with 4 horizontal gridlines and
 * filled point markers. Good enough for monthly trend views; multi-
 * series support can wait until a real design asks for it.
 */
export function LineChart({ data, height = 220 }: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const paddingX = 32;
      const paddingTop = 12;
      const paddingBottom = 24;
      const chartW = w - paddingX * 2;
      const chartH = h - paddingTop - paddingBottom;
      if (data.length === 0 || chartW <= 0) return;

      ctx.font = '500 10px Pretendard, sans-serif';
      ctx.textBaseline = 'middle';

      // Gridlines + y-axis labels.
      ctx.strokeStyle = GRID_COLOR;
      ctx.fillStyle = TEXT_MUTED;
      ctx.lineWidth = 1;
      const gridSteps = 4;
      for (let i = 0; i <= gridSteps; i++) {
        const y = paddingTop + (chartH / gridSteps) * i;
        ctx.beginPath();
        ctx.moveTo(paddingX, y);
        ctx.lineTo(paddingX + chartW, y);
        ctx.stroke();
        const label = String(Math.round(max - (max / gridSteps) * i));
        ctx.textAlign = 'right';
        ctx.fillText(label, paddingX - 6, y);
      }

      // Compute x positions.
      const stepX =
        data.length === 1 ? 0 : chartW / (data.length - 1);
      const points: Array<[number, number]> = data.map((d, i) => [
        paddingX + stepX * i,
        paddingTop + chartH - (d.value / max) * chartH,
      ]);

      // Line.
      ctx.strokeStyle = LINE_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Point dots.
      ctx.fillStyle = POINT_COLOR;
      points.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // X-axis labels.
      ctx.fillStyle = TEXT_MUTED;
      ctx.textAlign = 'center';
      data.forEach((d, i) => {
        const [x] = points[i]!;
        ctx.fillText(d.label, x, paddingTop + chartH + 12);
      });
    },
    [data, max],
  );

  const ref = useCanvas(draw);

  return (
    <canvas
      ref={ref}
      style={{ width: '100%', height }}
      role="img"
      aria-label="꺾은선 차트"
    />
  );
}
