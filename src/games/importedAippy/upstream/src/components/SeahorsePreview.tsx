import { useEffect, useRef } from 'react';
import { makeSeaPalette, type SeaPose } from '@/utils/seahorseModel';
import { drawSeahorse } from '@/utils/seahorseRender';

const W = 76, H = 52;

const POSE: SeaPose = {
  x: 33, y: 27, bob: 0, H: 44, fade: 1, rot: 0.04, yawFrom: 0.42, yawTo: 0.42, turnP: 1, look: 0,
  head: 0.03, suck: 0, breath: 0.3, bend: 0.2, sway: 0, curl: 1, swing: 0.1, wave: 1.4,
  finPh: 1.2, finAmp: 0.6, pecPh: 0.8, blink: 0,
};

/** Code-drawn seahorse preview, rendered with the exact same drawing as the live seahorse (slight 3/4 view). */
export const SeahorsePreview = ({ color }: { color: string }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawSeahorse(ctx, POSE, makeSeaPalette(color));
  }, [color]);
  return <canvas ref={ref} width={W} height={H} style={{ width: W, height: H }} aria-hidden="true" />;
};