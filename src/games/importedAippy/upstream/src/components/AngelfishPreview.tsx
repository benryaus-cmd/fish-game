import { useEffect, useRef } from 'react';
import { previewPose } from '@/utils/angelModel';
import { makeAngelPalette } from '@/utils/angelPalette';
import { drawAngelfish } from '@/utils/angelRender';

const W = 76, H = 52;

/** Code-drawn angelfish preview, rendered with the same renderer as the live fish (slight 3/4 view). */
export const AngelfishPreview = ({ color }: { color: string }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawAngelfish(ctx, previewPose(), makeAngelPalette(color));
  }, [color]);
  return <canvas ref={ref} width={W} height={H} style={{ width: W, height: H }} aria-hidden="true" />;
};