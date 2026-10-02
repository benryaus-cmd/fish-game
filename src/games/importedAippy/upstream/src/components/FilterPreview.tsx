import { useEffect, useRef } from 'react';
import { createFilterFx, filterLayout } from '@/utils/waterFilter';
import { drawFilter } from '@/utils/filterRender';

const W = 76, H = 52;

/** Code-drawn Water Filter preview, rendered with the same renderer as the aquarium filter. */
export const FilterPreview = ({ color }: { color: string }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const base = filterLayout(400, 400, 0);
    const k = 22 / base.H;
    const fx = createFilterFx();
    fx.alpha = 1;
    fx.t = 0.6;
    ctx.save();
    ctx.translate(W * 0.5 + 6, 3);
    ctx.scale(k, k);
    ctx.translate(-base.x - base.W / 2, -base.y);
    drawFilter(ctx, fx, base, color);
    ctx.restore();
  }, [color]);
  return <canvas ref={ref} width={W} height={H} style={{ width: W, height: H }} aria-hidden="true" />;
};