import { useCallback } from 'react';
import { useCanvas } from './useCanvas';
import { CHART_COLORS, type SeriesPoint } from './types';

interface Props {
  data: SeriesPoint[];
  size?: number;
}

/**
 * Donut chart — hand-rolled with Canvas arcs. Keeps a 60% inner radius
 * so a total-value label can sit in the middle.
 */
export function DonutChart({ data, size = 200 }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const cx = w / 2;
      const cy = h / 2;
      const outer = Math.min(cx, cy) - 4;
      const inner = outer * 0.6;

      if (total === 0) {
        ctx.strokeStyle = '#262626';
        ctx.lineWidth = outer - inner;
        ctx.beginPath();
        ctx.arc(cx, cy, (outer + inner) / 2, 0, Math.PI * 2);
        ctx.stroke();
        return;
      }

      let start = -Math.PI / 2;
      data.forEach((d, i) => {
        const angle = (d.value / total) * Math.PI * 2;
        const color = CHART_COLORS[i % CHART_COLORS.length];
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, outer, start, start + angle);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        start += angle;
      });

      // Inner hole to produce the donut effect.
      ctx.beginPath();
      ctx.arc(cx, cy, inner, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0a0a';
      ctx.fill();

      // Center total label.
      ctx.fillStyle = '#e5e5e5';
      ctx.font = '600 18px Pretendard, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(total.toLocaleString('ko-KR'), cx, cy - 2);
      ctx.fillStyle = '#737373';
      ctx.font = '400 10px Pretendard, sans-serif';
      ctx.fillText('합계', cx, cy + 14);
    },
    [data, total],
  );

  const canvasRef = useCanvas(draw);

  return (
    <div className="flex items-center gap-4">
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, flexShrink: 0 }}
        role="img"
        aria-label="도넛 차트"
      />
      <ul className="flex-1 space-y-1 text-xs">
        {data.map((d, i) => {
          const pct = total === 0 ? 0 : Math.round((d.value / total) * 1000) / 10;
          return (
            <li key={`${d.label}-${i}`} className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                aria-hidden
              />
              <span className="flex-1 truncate text-neutral-300">{d.label}</span>
              <span className="font-mono tabular-nums text-neutral-400">
                {d.value.toLocaleString('ko-KR')}
              </span>
              <span className="w-10 text-right font-mono tabular-nums text-neutral-600">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
