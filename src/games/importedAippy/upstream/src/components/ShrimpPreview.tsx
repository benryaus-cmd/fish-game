import { useEffect, useRef } from 'react';
import { makeShrimpPalette, previewPose } from '@/utils/shrimpModel';
import { drawShrimp } from '@/utils/shrimpRender';

const W = 76, H = 52;

/** Code-drawn shrimp preview, rendered with the same renderer as the live shrimp. */
export const ShrimpPreview = ({ color }: { color: string }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawShrimp(ctx, previewPose(), makeShrimpPalette(color));
  }, [color]);
  return <canvas ref={ref} style={{ width: `${W}px`, height: `${H}px` }} aria-hidden="true" />;
};