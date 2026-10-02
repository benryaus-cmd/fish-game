/**
 * Per-creature feeding limit: each individual may eat EAT_LIMIT pellets, then rests from food
 * for COOLDOWN seconds. State is temporary (never saved) and keyed by the creature object itself.
 * One shared clock is advanced once per frame from the central game loop — no timers.
 */
const EAT_LIMIT = 2;
const COOLDOWN = 4;

interface Gate { n: number; until: number }
const gates = new WeakMap<object, Gate>();
let clock = 0;

/** Advance the shared feeding clock (call exactly once per frame with real delta time). */
export function tickFeedGates(dt: number) {
  if (dt > 0) clock += Math.min(dt, 0.25);
}

/** True when this creature may target, reserve and eat food right now. */
export function canFeed(o: object): boolean {
  const g = gates.get(o);
  if (!g || g.until <= 0) return true;
  if (clock < g.until) return false;
  g.n = 0;
  g.until = 0;
  return true;
}

/** Record one SUCCESSFUL eat. Returns true when the creature just entered its cooldown. */
export function noteEat(o: object): boolean {
  let g = gates.get(o);
  if (!g) { g = { n: 0, until: 0 }; gates.set(o, g); }
  g.n += 1;
  if (g.n >= EAT_LIMIT) { g.until = clock + COOLDOWN; return true; }
  return false;
}