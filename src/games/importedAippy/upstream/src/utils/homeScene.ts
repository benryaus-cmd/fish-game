import type { Specimen } from './boutique';

/** Home pose is deliberately independent of health, hunger, growth and transactions. */
export interface HomeResident {
  id: string; x: number; y: number; size: number; color: string; accent: string;
  phase: number; heading: number; seed: number; elapsed: number;
  vx: number; vy: number; pitch: number; yaw: number; yawBody: number; yawTail: number;
}
export interface HomeAxis { x: number; y: number }
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
function identitySeed(id: string) {
  let value = 2166136261;
  for (let i = 0; i < id.length; i++) value = Math.imul(value ^ id.charCodeAt(i), 16777619);
  return (value >>> 0) / 4294967296;
}
export function homeBounds(width: number, height: number, size: number) {
  const mx = Math.min(Math.max(0, width) / 2, size * 1.5 + 8);
  const top = Math.min(height / 2, size * 0.72 + 30);
  return { left: mx, right: Math.max(mx, width - mx), top, bottom: Math.max(top, height * 0.82 - size * 0.75) };
}
export function createHomeResidents(specimens: Specimen[], width: number, height: number, controlledId: string | null, previous: HomeResident[] = []): HomeResident[] {
  // Sorting by persistent ID keeps a stable visible cohort when collection order changes.
  const unique = [...new Map(specimens.map(s => [s.id, s])).values()].sort((a, b) => a.id.localeCompare(b.id));
  const visible = unique.slice(0, 24);
  const controlled = unique.find(s => s.id === controlledId);
  if (controlled && !visible.some(s => s.id === controlledId)) visible[visible.length - 1] = controlled;
  const poses = new Map(previous.map(r => [r.id, r]));
  return visible.map(s => {
    const old = poses.get(s.id);
    const seed = identitySeed(s.id);
    const size = Math.max(14, Math.min(69, 28 + s.growth * 0.31, width * 0.15, height * 0.16));
    const bounds = homeBounds(width, height, size);
    return { id: s.id, color: s.color, accent: s.accent, size, seed,
      x: clamp(old?.x ?? bounds.left + (bounds.right - bounds.left) * ((seed * 17.31) % 1), bounds.left, bounds.right),
      y: clamp(old?.y ?? bounds.top + (bounds.bottom - bounds.top) * ((seed * 29.73) % 1), bounds.top, bounds.bottom),
      vx: old?.vx ?? 0, vy: old?.vy ?? 0, pitch: old?.pitch ?? 0,
      yaw: old?.yaw ?? (seed < 0.5 ? 0 : Math.PI), yawBody: old?.yawBody ?? (seed < 0.5 ? 0 : Math.PI), yawTail: old?.yawTail ?? (seed < 0.5 ? 0 : Math.PI),
      phase: old?.phase ?? seed * Math.PI * 2, heading: old?.heading ?? (seed < 0.5 ? 0 : Math.PI), elapsed: old?.elapsed ?? seed * 20 };
  });
}
export function stepHomeResidents(residents: HomeResident[], width: number, height: number, dt: number, controlledId: string | null, axis: HomeAxis): HomeResident[] {
  const seconds = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
  const inputX = Number.isFinite(axis.x) ? axis.x : 0, inputY = Number.isFinite(axis.y) ? axis.y : 0;
  const magnitude = Math.max(1, Math.hypot(inputX, inputY));
  return residents.map(r => {
    const elapsed = r.elapsed + seconds;
    const controlled = r.id === controlledId;
    const bounds = homeBounds(width, height, r.size);
    let dx: number, dy: number;
    if (controlled) { dx = inputX / magnitude * 70; dy = inputY / magnitude * 70; }
    else {
      const targetX = bounds.left + (bounds.right - bounds.left) * (0.5 + 0.44 * Math.sin(elapsed * 0.18 + r.seed * 9));
      const targetY = bounds.top + (bounds.bottom - bounds.top) * (0.5 + 0.4 * Math.sin(elapsed * 0.23 + r.seed * 19));
      const distance = Math.hypot(targetX-r.x,targetY-r.y);
      const speed = Math.min(distance * 0.55, 12 + r.seed * 13);
      dx = distance > 0.1 ? (targetX-r.x) / distance * speed : 0;
      dy = distance > 0.1 ? (targetY-r.y) / distance * speed : 0;
    }
    const heading = Math.abs(dx) > 0.1 ? (dx >= 0 ? 0 : Math.PI) : r.heading;
    const ease = (current: number, target: number, rate: number) => current + (target-current) * (1-Math.exp(-rate*seconds));
    // The head leads a reversal; the existing rig projects the following spine and fins.
    const yaw = ease(r.yaw, heading, 8);
    const yawBody = ease(r.yawBody, yaw, 6);
    const yawTail = ease(r.yawTail, yawBody, 5);
    const targetPitch = Math.hypot(dx,dy)>0.1 ? clamp(Math.atan2(-dy,Math.abs(dx)), -1.3, 1.3) : 0;
    return { ...r, elapsed, x: clamp(r.x + dx * seconds, bounds.left, bounds.right), y: clamp(r.y + dy * seconds, bounds.top, bounds.bottom),
      vx: dx, vy: dy, heading, yaw, yawBody, yawTail, pitch: ease(r.pitch,targetPitch,6),
      phase: r.phase + seconds * (2.2 + Math.hypot(dx,dy) * 0.045) };
  });
}
export function pickHomeResident(residents: HomeResident[], x: number, y: number): string | null {
  let closest: HomeResident | null = null, distance = Infinity;
  for (const r of residents) {
    const d = Math.hypot(x-r.x,y-r.y);
    if (d < Math.max(24,r.size*0.8) && d < distance) { closest=r; distance=d; }
  }
  return closest?.id ?? null;
}
export function canvasHomePoint(clientX: number, clientY: number, rect: {left:number;top:number;width:number;height:number}, width: number, height: number): HomeAxis {
  return { x:(clientX-rect.left) * width / Math.max(1,rect.width), y:(clientY-rect.top) * height / Math.max(1,rect.height) };
}
