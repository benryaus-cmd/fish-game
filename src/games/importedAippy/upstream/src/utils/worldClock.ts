import type { BoutiqueSave } from './boutique.ts';
import { advanceSpecimenCare, ensureSpecimenCare } from './specimenCare.ts';
import { advanceTankCare } from './tankCare.ts';
export interface WorldClock { startedAtMs: number; lastSeenMs: number }
export const WORLD_PHASE_SECONDS = 300;
const safe = (now: number) => Number.isFinite(now) ? Math.max(0, now) : 0;
export function sampleWorldClock(clock: WorldClock, now = Date.now()) {
  const elapsedSeconds = Math.max(0, (Math.max(safe(now), clock.lastSeenMs) - clock.startedAtMs) / 1000);
  const cycle = elapsedSeconds % 600;
  const phase: 'day' | 'night' = cycle < 300 ? 'day' : 'night';
  // A brief smooth dawn/dusk retains shared light at phase boundaries.
  const fade = 15;
  const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
  const daylight = cycle < 300 ? smooth(cycle / fade) * smooth((300 - cycle) / fade) : 0;
  const minuteOfDay = Math.floor((360 + cycle / 600 * 1440) % 1440);
  const label = `D${Math.floor(elapsedSeconds / 600) + 1} ${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`;
  return { daylight, phase, label, elapsedSeconds };
}
export function initialiseCareProfile(save: BoutiqueSave, now = Date.now()): BoutiqueSave {
  const at = safe(now), worldClock = save.worldClock ?? { startedAtMs: at, lastSeenMs: at };
  return { ...save, worldClock, tankCare: save.tankCare ?? {dirt:0,lastUpdatedMs:at,pellets:0}, kept: save.kept.map(fish => ensureSpecimenCare(fish, at)), activeRun: save.activeRun ? { ...save.activeRun, specimen: ensureSpecimenCare(save.activeRun.specimen, at) } : null };
}
export function advanceProfileCare(save: BoutiqueSave, now = Date.now(), includeActive = false, presence: 'present' | 'away' = 'away'): BoutiqueSave {
  const profile = initialiseCareProfile(save, now), at = Math.max(profile.worldClock!.lastSeenMs, safe(now));
  return advanceTankCare({ ...profile, worldClock: { ...profile.worldClock!, lastSeenMs: at }, kept: profile.kept.map(fish => advanceSpecimenCare(fish, at, 'home', presence)), activeRun: includeActive && profile.activeRun ? { ...profile.activeRun, specimen: advanceSpecimenCare(profile.activeRun.specimen, at, 'growing', presence) } : profile.activeRun },at);
}
