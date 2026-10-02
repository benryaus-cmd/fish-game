import type { Specimen } from './boutique';

/** Home pose is deliberately independent of health, hunger, growth and transactions. */
export interface HomeResident {
  id: string; x: number; y: number; size: number; color: string; accent: string;
  phase: number; finPhase: number; amp: number; heading: number; seed: number; elapsed: number;
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
      phase: old?.phase ?? seed * Math.PI * 2, finPhase: old?.finPhase ?? seed * Math.PI * 7,
      amp: old?.amp ?? 0.22, heading: old?.heading ?? (seed < 0.5 ? 0 : Math.PI), elapsed: old?.elapsed ?? seed * 20 };
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
    const ease = (current: number, target: number, rate: number) => current + (target-current) * (1-Math.exp(-rate*seconds));
    let dx: number, dy: number, cruise = 0;
    if (controlled) { dx = inputX / magnitude * 70; dy = inputY / magnitude * 70; }
    else {
      const targetX = bounds.left + (bounds.right - bounds.left) * (0.5 + 0.44 * Math.sin(elapsed * 0.065 + r.seed * 9));
      const targetY = bounds.top + (bounds.bottom - bounds.top) * (0.5 + 0.4 * Math.sin(elapsed * 0.09 + r.seed * 19));
      const distance = Math.hypot(targetX-r.x,targetY-r.y);
      // Cruise in body lengths, with individual rhythm fixed to the saved identity.
      cruise = Math.min(distance * 0.18, r.size * (0.17 + r.seed * 0.08));
      dx = Math.abs(targetX-r.x) > r.size * 0.35 ? targetX-r.x : 0;
      dy = clamp((targetY-r.y) * 0.12, -cruise * 0.45, cruise * 0.45);
    }
    const heading = Math.abs(dx) > 0.1 ? (dx >= 0 ? 0 : Math.PI) : r.heading;
    // Home turns unfold slowly; direct player control keeps its responsive rig.
    const goalYaw = controlled && Math.hypot(dx,dy)>0.1 ? Math.atan2(Math.abs(dy),dx) : heading;
    const yaw = ease(r.yaw, goalYaw, controlled ? 8 : 1.4);
    const yawBody = ease(r.yawBody, yaw, controlled ? 6 : 1);
    const yawTail = ease(r.yawTail, yawBody, controlled ? 5 : 0.8);
    if (!controlled) {
      // Travel follows the turning body instead of instantly reversing under it.
      dx = ease(r.vx, Math.cos(yawBody) * cruise, 0.9);
      dy = ease(r.vy, dy, 0.8);
    }
    // Controlled dives expose the back; autonomous residents keep a relaxed attitude.
    const targetPitch = Math.hypot(dx,dy)>0.1
      ? controlled ? clamp(Math.atan2(-dy,Math.abs(dx)),-1.35,1.35) : clamp(-dy/70*0.45,-0.42,0.42)
      : 0;
    return { ...r, elapsed, x: clamp(r.x + dx * seconds, bounds.left, bounds.right), y: clamp(r.y + dy * seconds, bounds.top, bounds.bottom),
      vx: dx, vy: dy, heading, yaw, yawBody, yawTail, pitch: ease(r.pitch,targetPitch,controlled ? 6 : 1.5),
      // Renderer phases are radians: express biological beat rates in full cycles.
      phase: r.phase + Math.PI * 2 * seconds * (0.72 + r.seed * 0.12 + Math.hypot(dx,dy) / r.size * 0.9),
      finPhase: (r.finPhase ?? r.phase * 0.8) + Math.PI * 2 * seconds * (0.55 + r.seed * 0.1 + Math.hypot(dx,dy) / r.size * 0.5),
      amp: ease(r.amp ?? 0.22, clamp(0.22 + Math.hypot(dx,dy) / r.size * 0.3 + Math.sin(yawBody) * 0.05, 0.22, 0.48), 2) };
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
