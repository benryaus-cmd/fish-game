import { mix } from '@/utils/colorUtils';

export interface SeaPalette {
  key: string; crown: string; body: string; light: string; deep: string; tail: string; tailTip: string;
  cream: string; shade: string; outline: string; sheen: string; ring: string; ringHi: string; knob: string; knobHi: string;
  fin: string; finRay: string; finEdge: string; iris: string; irisRing: string; pupil: string; orbit: string; mouth: string;
  blush: string; lid: string; ripple: string; litA: string; litB: string; drkA: string; drkB: string;
  grad: CanvasGradient | string; lit: CanvasGradient | string; ready: boolean;
}

/** Warm sandy-gold / honey family with a cream belly and soft coral accents, derived from the tweakable colour. */
export function makeSeaPalette(c: string): SeaPalette {
  return {
    key: c, crown: mix(c, '#b07434', 0.3), body: mix(c, '#e9b66c', 0.2), light: mix(c, '#f9deaa', 0.45),
    deep: mix(c, '#b5773a', 0.32), tail: mix(c, '#a86a32', 0.42), tailTip: mix(c, '#7c4a22', 0.5),
    cream: mix(c, '#fff1d6', 0.65, 0.5), shade: mix(c, '#5b3314', 0.6, 0.3), outline: mix(c, '#4a2a10', 0.62, 0.5),
    sheen: mix(c, '#fffaf0', 0.8, 0.42), ring: mix(c, '#6e4519', 0.55, 0.22), ringHi: mix(c, '#fff6e2', 0.7, 0.26),
    knob: mix(c, '#c58e4e', 0.35), knobHi: mix(c, '#fff6e0', 0.6, 0.7),
    fin: mix(c, '#fff4e0', 0.55, 0.4), finRay: mix(c, '#94622c', 0.4, 0.45), finEdge: mix(c, '#fffaf2', 0.8, 0.65),
    iris: mix(c, '#5e3a14', 0.5), irisRing: mix(c, '#ffe2a6', 0.5, 0.9), pupil: '#1a1109', orbit: mix(c, '#8e5a26', 0.4, 0.55),
    mouth: mix(c, '#3c2210', 0.75, 0.85), blush: mix(c, '#ec8f72', 0.55, 0.22), lid: mix(c, '#8a5a28', 0.4),
    ripple: 'rgba(255,255,255,0.5)', litA: mix(c, '#fffaf0', 0.85, 0.24), litB: mix(c, '#fffaf0', 0.85, 0),
    drkA: mix(c, '#4a2810', 0.6, 0), drkB: mix(c, '#4a2810', 0.6, 0.3),
    grad: c, lit: 'rgba(0,0,0,0)', ready: false,
  };
}

/** Body gradient (crown → gold → light chest → deeper tail) and a fixed upper-left key light, both in local units. */
export function seaGrads(ctx: CanvasRenderingContext2D, pal: SeaPalette) {
  if (pal.ready) return;
  const g = ctx.createLinearGradient(0, -0.52, 0, 0.5);
  g.addColorStop(0, pal.crown); g.addColorStop(0.13, pal.body); g.addColorStop(0.42, pal.light);
  g.addColorStop(0.6, pal.body); g.addColorStop(0.76, pal.deep); g.addColorStop(0.9, pal.tail); g.addColorStop(1, pal.tailTip);
  const l = ctx.createLinearGradient(-0.32, -0.4, 0.32, 0.4);
  l.addColorStop(0, pal.litA); l.addColorStop(0.45, pal.litB); l.addColorStop(0.6, pal.drkA); l.addColorStop(1, pal.drkB);
  pal.grad = g; pal.lit = l; pal.ready = true;
}