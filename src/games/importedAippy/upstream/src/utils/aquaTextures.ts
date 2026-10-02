export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  return c.getContext('2d') as CanvasRenderingContext2D;
}

/** Deterministic seeded random so the scene looks identical after resizes. */
export function mulberry(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let bubbleSprite: HTMLCanvasElement | null = null;
export function getBubbleSprite(): HTMLCanvasElement {
  if (bubbleSprite) return bubbleSprite;
  const c = makeCanvas(64, 64);
  const g = ctx2d(c);
  const body = g.createRadialGradient(32, 34, 0, 32, 32, 30);
  body.addColorStop(0, 'rgba(210,245,250,0.04)');
  body.addColorStop(0.72, 'rgba(215,248,252,0.10)');
  body.addColorStop(0.93, 'rgba(235,252,255,0.42)');
  body.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = body;
  g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(240,253,255,0.32)';
  g.lineWidth = 1.2;
  g.beginPath(); g.arc(32, 32, 28.6, 0, Math.PI * 2); g.stroke();
  const hl = g.createRadialGradient(23, 22, 0, 23, 22, 9);
  hl.addColorStop(0, 'rgba(255,255,255,0.85)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl;
  g.beginPath(); g.ellipse(23, 22, 9, 6, -0.6, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.2)';
  g.lineWidth = 1.6;
  g.beginPath(); g.arc(32, 32, 23, 0.35, 1.25); g.stroke();
  bubbleSprite = c;
  return c;
}

let dotSprite: HTMLCanvasElement | null = null;
export function getDotSprite(): HTMLCanvasElement {
  if (dotSprite) return dotSprite;
  const c = makeCanvas(32, 32);
  const g = ctx2d(c);
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(238,252,246,1)');
  gr.addColorStop(0.35, 'rgba(232,250,244,0.5)');
  gr.addColorStop(1, 'rgba(232,250,244,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  dotSprite = c;
  return c;
}

let raySprite: HTMLCanvasElement | null = null;
export function getRaySprite(): HTMLCanvasElement {
  if (raySprite) return raySprite;
  const c = makeCanvas(64, 512);
  const g = ctx2d(c);
  const hg = g.createLinearGradient(0, 0, 64, 0);
  hg.addColorStop(0, 'rgba(255,255,244,0)');
  hg.addColorStop(0.5, 'rgba(255,255,244,1)');
  hg.addColorStop(1, 'rgba(255,255,244,0)');
  g.fillStyle = hg;
  g.fillRect(0, 0, 64, 512);
  g.globalCompositeOperation = 'destination-in';
  const vg = g.createLinearGradient(0, 0, 0, 512);
  vg.addColorStop(0, 'rgba(0,0,0,1)');
  vg.addColorStop(0.35, 'rgba(0,0,0,0.55)');
  vg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = vg;
  g.fillRect(0, 0, 64, 512);
  raySprite = c;
  return c;
}

let causticTex: HTMLCanvasElement | null = null;
/** Tileable soft caustic network (warped cellular edges). Built once. */
export function getCausticTexture(): HTMLCanvasElement {
  if (causticTex) return causticTex;
  const S = 256, N = 16, SIG = 3.2, TAU = Math.PI * 2;
  const rnd = mulberry(11);
  const px: number[] = [], py: number[] = [];
  for (let i = 0; i < N; i++) { px.push(rnd() * S); py.push(rnd() * S); }
  const c = makeCanvas(S, S);
  const g = ctx2d(c);
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const wx = x + Math.sin((y / S) * TAU * 2) * 5 + Math.sin((y / S) * TAU * 3 + 1) * 3;
      const wy = y + Math.sin((x / S) * TAU * 2 + 2) * 5;
      let d1 = 1e9, d2 = 1e9;
      for (let i = 0; i < N; i++) {
        let dx = Math.abs(wx - px[i]) % S; if (dx > S / 2) dx = S - dx;
        let dy = Math.abs(wy - py[i]) % S; if (dy > S / 2) dy = S - dy;
        const d = dx * dx + dy * dy;
        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
      }
      const v = Math.sqrt(d2) - Math.sqrt(d1);
      const k = Math.exp(-(v * v) / (2 * SIG * SIG));
      const idx = (y * S + x) * 4;
      img.data[idx] = 230; img.data[idx + 1] = 255; img.data[idx + 2] = 245;
      img.data[idx + 3] = Math.round(k * 190);
    }
  }
  g.putImageData(img, 0, 0);
  causticTex = c;
  return c;
}