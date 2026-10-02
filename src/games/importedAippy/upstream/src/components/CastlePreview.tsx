import { useEffect, useRef } from 'react';
import { drawCastle } from '@/utils/castleRender';

const W = 76, H = 52;

/** Code-drawn Small Castle preview, using the same renderer as the aquarium castle. */
export const CastlePreview = ({ color }: { color: string }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawCastle(ctx, W / 2, H - 4, 44, color);
  }, [color]);
  return <canvas ref={ref} width={W} height={H} style={{ width: W, height: H }} aria-hidden="true" />;
};