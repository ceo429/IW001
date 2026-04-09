import { useEffect, useRef } from 'react';

/**
 * Tiny helper that hooks up a Canvas element with an HiDPI-aware draw
 * callback. Callers don't have to think about devicePixelRatio — they
 * just get a pre-scaled context and logical width/height in CSS pixels.
 */
export function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function render() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio ?? 1);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      draw(ctx, rect.width, rect.height);
    }

    render();

    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  return ref;
}
