import { useEffect, useRef } from 'react';
import { createFish, computePose, bodyGradient } from '@/utils/fishModel';
import { drawFish } from '@/utils/fishRender';
import { applySpecimenAppearance } from '@/utils/specimenAppearance';
import type { Specimen } from '@/utils/boutique';

export default function FishPortrait({ specimen }: { specimen: Specimen }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 180 * dpr; canvas.height = 110 * dpr;
    const fish = createFish(180, 180, 75 + specimen.growth * 0.15);
    const palette = applySpecimenAppearance(fish, specimen);
    fish.x = 93; fish.y = 57; fish.amp = 0.16;
    let raf = 0, previous = 0;
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      if (document.hidden || now - previous < 33) return;
      previous = now;
      const t = now / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, 180, 110);
      bg.addColorStop(0, '#153c43'); bg.addColorStop(1, '#071d24');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 180, 110);
      ctx.fillStyle = 'rgba(207,228,205,0.08)';
      ctx.beginPath(); ctx.ellipse(82, 80, 53, 6, 0, 0, Math.PI * 2); ctx.fill();
      fish.phase = t * 4; fish.finPhase = t * 3;
      fish.pitch = Math.sin(t * 0.7) * 0.05;
      fish.y = 56 + Math.sin(t) * 3;
      computePose(fish); bodyGradient(ctx, palette); drawFish(ctx, fish, palette);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [specimen]);
  return <canvas ref={ref} className="fish-portrait" aria-label={specimen.name + ' guppy portrait'} role="img" />;
}
