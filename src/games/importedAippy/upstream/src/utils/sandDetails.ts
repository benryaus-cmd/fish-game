import { mix } from '@/utils/colorUtils';

type G = CanvasRenderingContext2D;

/** Half-buried smooth stone (lower half is later covered by the front sand). */
export function drawStone(g: G, x: number, y: number, rx: number, ry: number, deep: string): void {
  const gr = g.createRadialGradient(x - rx * 0.35, y - ry * 0.55, rx * 0.1, x, y, rx * 1.1);
  gr.addColorStop(0, '#b9c0b6');
  gr.addColorStop(0.55, '#8e9893');
  gr.addColorStop(1, mix('#6c7a7a', deep, 0.35));
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(x, y, rx, ry, -0.08, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,250,0.10)';
  g.beginPath(); g.ellipse(x - rx * 0.2, y - ry * 0.5, rx * 0.5, ry * 0.25, -0.1, 0, Math.PI * 2); g.fill();
}

export function drawPebble(g: G, x: number, y: number, r: number, color: string, t: number, alpha = 1): void {
  g.globalAlpha = alpha;
  g.fillStyle = 'rgba(40,60,60,0.12)';
  g.beginPath(); g.ellipse(x + r * 0.25, y + r * 0.45, r * 1.1, r * 0.45, 0, 0, Math.PI * 2); g.fill();
  const gr = g.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r * 1.2);
  gr.addColorStop(0, mix(color, '#ffffff', 0.35));
  gr.addColorStop(1, mix(color, '#3d4f52', 0.35));
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(x, y, r, r * (0.62 + t * 0.2), t * 0.8 - 0.4, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
}

/** Small weathered shell fragment, half-sunk and low contrast. */
export function drawShellFragment(g: G, x: number, y: number, s: number, rot: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = 'rgba(60,70,60,0.08)';
  g.beginPath(); g.ellipse(0.5, 0.6, s * 0.7, s * 0.28, 0, 0, Math.PI * 2); g.fill();
  const gr = g.createLinearGradient(0, -s * 0.6, 0, 0);
  gr.addColorStop(0, 'rgba(240,230,216,0.92)');
  gr.addColorStop(1, 'rgba(212,194,176,0.92)');
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(-s * 0.5, 0);
  g.quadraticCurveTo(-s * 0.3, -s * 0.65, s * 0.35, -s * 0.5);
  g.lineTo(s * 0.55, -s * 0.1);
  g.quadraticCurveTo(0, -s * 0.18, -s * 0.5, 0);
  g.fill();
  g.strokeStyle = 'rgba(150,120,100,0.18)';
  g.lineWidth = 0.5;
  g.beginPath(); g.moveTo(-s * 0.2, -s * 0.12); g.quadraticCurveTo(0, -s * 0.45, s * 0.3, -s * 0.38); g.stroke();
  g.restore();
}

/** Tiny pale fan shell lying in the sand. */
export function drawShell(g: G, x: number, y: number, s: number, rot: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = 'rgba(60,70,60,0.10)';
  g.beginPath(); g.ellipse(0.6, 0.8, s * 0.95, s * 0.35, 0, 0, Math.PI * 2); g.fill();
  const gr = g.createLinearGradient(0, -s, 0, 0);
  gr.addColorStop(0, '#f4e9dc');
  gr.addColorStop(1, '#dcc3b0');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, s, Math.PI * 1.12, Math.PI * 1.88); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(150,115,95,0.28)';
  g.lineWidth = 0.5;
  g.beginPath();
  for (let i = 1; i < 5; i++) {
    const a = Math.PI * (1.12 + (0.76 * i) / 5);
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.95);
  }
  g.stroke();
  g.fillStyle = '#d8bfae';
  g.beginPath(); g.ellipse(0, 0.3, s * 0.22, s * 0.14, 0, 0, Math.PI * 2); g.fill();
  g.restore();
}