import { mix } from '@/utils/colorUtils';

type Grad = CanvasGradient | string;
export interface AngelPalette {
  top: string; pearl: string; light: string; cream: string; gold: string; dark: string;
  stripe: string; rim: string; gill: string; socket: string; iris: string; irisRing: string; pupil: string; glint: string;
  lip: string; mouthIn: string; ray: string; finEdge: string; finA: string; finB: string; finC: string;
  pec: string; pelvic: string; pelvicBase: string;
  bodyG: Grad; vig: Grad; hi: Grad; shadeG: Grad; belly: Grad; finUp: Grad; finDn: Grad; tailG: Grad; ready: boolean;
}

const DEFAULT = '#e9e4d8';
const safe = (raw: unknown) => {
  const v = typeof raw === 'string' ? raw.trim() : '';
  const h = v.startsWith('#') ? v : `#${v}`;
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h) ? h : DEFAULT;
};

/** Silver-white pearl body, warm gold undertone, charcoal bars and translucent fins. */
export function makeAngelPalette(raw: string): AngelPalette {
  const c = safe(raw);
  return {
    top: mix(c, '#8f8a7e', 0.5), pearl: mix(c, '#f4f0e7', 0.4), light: mix(c, '#fcfaf4', 0.6), cream: mix(c, '#fff0cf', 0.5),
    gold: mix(c, '#d8b066', 0.42), dark: mix(c, '#262a31', 0.8, 0.45),
    stripe: mix(c, '#2a2d33', 0.88), rim: mix(c, '#585448', 0.62, 0.55), gill: mix(c, '#6a6252', 0.6),
    socket: mix(c, '#4c4436', 0.7, 0.32), iris: mix(c, '#c9783e', 0.6), irisRing: mix(c, '#f0d38a', 0.55, 0.9),
    pupil: '#131417', glint: 'rgba(255,255,255,0.92)', lip: mix(c, '#dcc6a4', 0.45), mouthIn: mix(c, '#38291f', 0.85),
    ray: mix(c, '#857d6c', 0.5, 0.5), finEdge: mix(c, '#383a41', 0.6, 0.55),
    finA: mix(c, '#f5f0e3', 0.4, 0.55), finB: mix(c, '#e6dbc2', 0.35, 0.3), finC: mix(c, '#34363d', 0.62, 0.45),
    pec: mix(c, '#f8f3e6', 0.4, 0.45), pelvic: mix(c, '#f3ecdc', 0.4, 0.85), pelvicBase: mix(c, '#3a3a3e', 0.7, 0.85),
    bodyG: c, vig: c, hi: c, shadeG: c, belly: c, finUp: c, finDn: c, tailG: c, ready: false,
  };
}

function radial(ctx: CanvasRenderingContext2D, stops: [number, string][]) {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}

/** Gradients live in body units and are built once per palette (never per frame). */
export function angelGrads(ctx: CanvasRenderingContext2D, p: AngelPalette) {
  if (p.ready) return;
  const b = ctx.createLinearGradient(0, -0.42, 0, 0.42);
  b.addColorStop(0, p.top); b.addColorStop(0.2, p.gold); b.addColorStop(0.42, p.pearl);
  b.addColorStop(0.62, p.light); b.addColorStop(0.85, p.cream); b.addColorStop(1, p.gold);
  p.vig = radial(ctx, [[0, 'rgba(255,255,255,0.08)'], [0.6, 'rgba(38,42,49,0)'], [1, p.dark]]);
  p.hi = radial(ctx, [[0, 'rgba(255,255,252,0.7)'], [0.45, 'rgba(255,244,230,0.22)'], [1, 'rgba(255,244,230,0)']]);
  p.shadeG = radial(ctx, [[0, 'rgba(30,32,38,0.55)'], [1, 'rgba(30,32,38,0)']]);
  p.belly = radial(ctx, [[0, 'rgba(255,246,222,0.6)'], [1, 'rgba(255,246,222,0)']]);
  const up = ctx.createLinearGradient(0, -0.22, 0, -1.0);
  up.addColorStop(0, p.finA); up.addColorStop(0.6, p.finB); up.addColorStop(1, p.finC);
  const dn = ctx.createLinearGradient(0, 0.28, 0, 1.0);
  dn.addColorStop(0, p.finA); dn.addColorStop(0.6, p.finB); dn.addColorStop(1, p.finC);
  const t = ctx.createLinearGradient(-0.42, 0, -0.8, 0);
  t.addColorStop(0, p.finA); t.addColorStop(0.65, p.finB); t.addColorStop(1, p.finC);
  p.bodyG = b; p.finUp = up; p.finDn = dn; p.tailG = t; p.ready = true;
}