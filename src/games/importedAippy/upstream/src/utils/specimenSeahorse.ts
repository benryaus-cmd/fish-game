import { fishScale, type Fish } from '@/utils/fishModel';
import type { SeaPose } from '@/utils/seahorseModel';
import { buildGeo, HD } from '@/utils/seahorseGeom';
import type { Specimen } from '@/utils/boutique';

/** Controlled motion drives the native upright anatomy; its curled tail stays a seahorse tail. */
export function specimenSeahorsePose(f: Fish, specimen: Specimen): SeaPose {
  const ornate = specimen.traits.filter(trait => trait === 'ornate').length;
  const form = specimen.inherited?.finForm;
  const pitch = f.pitch + f.tilt;
  return {
    x: f.x, y: f.y, bob: 0, H: fishScale(f) * (1 + ornate * .035), fade: f.fade,
    rot: -Math.cos(f.yawBody) * pitch * .22,
    yawFrom: f.yawTail, yawTo: f.yaw, turnP: 1,
    controlledYaw: [f.yaw, f.yawBody, f.yawTail],
    look: 0, head: -pitch * .45, suck: f.mouth, breath: Math.sin(f.phase) * .3,
    bend: Math.sin(f.phase) * f.amp, sway: Math.sin(f.phase - .7) * f.amp,
    curl: (form === 'veil' ? .82 : form === 'fan' ? 1.12 : 1),
    swing: Math.sin(f.phase - 1) * f.amp, wave: f.phase,
    finPh: f.finPhase, finAmp: .5 + Math.min(.5, Math.abs(f.speed) / Math.max(1, f.L)) + ornate * .08,
    pecPh: f.finPhase, blink: 0,
  };
}

/** Exactly drawMouth's projected slit centre, transformed by the same whole-frame pose. */
export function seahorseMouthPoint(pose: SeaPose): { x: number; y: number } {
  buildGeo(pose);
  const tip = HD[HD.length - 1], cap = tip.a * tip.fs * .78;
  const x = tip.cx + tip.tx * cap, y = tip.cy + tip.ty * cap;
  const c = Math.cos(pose.rot), s = Math.sin(pose.rot);
  return { x: pose.x + (x * c - y * s) * pose.H, y: pose.y + pose.bob + (x * s + y * c) * pose.H };
}
