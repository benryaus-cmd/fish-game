import { mulberry } from '@/utils/aquaTextures';

export interface Camera {
  x: number;
  y: number;
  shakeX: number;
  shakeY: number;
  shakeTime: number;
}

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1800;

// World landmarks
export const NURSERY_ZONE = {
  x0: 160,
  x1: 720,
  y0: 1280,
  y1: 1780,
};

export const OPEN_FEEDING_ZONE = {
  x0: 850,
  x1: 1700,
  y0: 600,
  y1: 1450,
};

export const CASTLE_LANDMARK = {
  cx: 2100,
  baseY: 1660,
  size: 210,
};

export function createCamera(): Camera {
  return {
    x: 450,
    y: 1400,
    shakeX: 0,
    shakeY: 0,
    shakeTime: 0,
  };
}

export function triggerCameraShake(cam: Camera, duration = 0.25) {
  cam.shakeTime = Math.max(cam.shakeTime, duration);
}

export function updateCamera(
  cam: Camera,
  targetX: number,
  targetY: number,
  viewW: number,
  viewH: number,
  dt: number,
  lookAheadX = 0,
  lookAheadY = 0
) {
  // Desired center in world coordinates
  const desiredCenterX = targetX + lookAheadX;
  const desiredCenterY = targetY + lookAheadY;

  // Camera top-left in world coords
  let desiredCamX = desiredCenterX - viewW / 2;
  let desiredCamY = desiredCenterY - viewH / 2;

  // Clamp camera to world bounds
  const maxCamX = Math.max(0, WORLD_WIDTH - viewW);
  const maxCamY = Math.max(0, WORLD_HEIGHT - viewH);

  desiredCamX = Math.max(0, Math.min(maxCamX, desiredCamX));
  desiredCamY = Math.max(0, Math.min(maxCamY, desiredCamY));

  // Smooth follow
  const followSpeed = 6.0;
  const k = 1 - Math.exp(-followSpeed * dt);
  cam.x += (desiredCamX - cam.x) * k;
  cam.y += (desiredCamY - cam.y) * k;

  // Shake effect
  if (cam.shakeTime > 0) {
    cam.shakeTime = Math.max(0, cam.shakeTime - dt);
    const intensity = (cam.shakeTime / 0.25) * 8;
    cam.shakeX = (Math.random() - 0.5) * intensity;
    cam.shakeY = (Math.random() - 0.5) * intensity;
  } else {
    cam.shakeX = 0;
    cam.shakeY = 0;
  }
}

// Bounded procedural sand floor height in world coords
const K = [(Math.PI * 2) / 1100, (Math.PI * 2) / 520, (Math.PI * 2) / 260];
const baseFloor = WORLD_HEIGHT - 220;
const ampFloor = 48;

export function worldSurfaceY(worldX: number): number {
  return (
    baseFloor +
    ampFloor *
      (0.6 * Math.sin(worldX * K[0] + 0.4) +
        0.28 * Math.sin(worldX * K[1] + 1.2) +
        0.12 * Math.sin(worldX * K[2] + 2.1))
  );
}

// Generate static landmarks / decor placement in world coordinates
export interface WorldPlant {
  x: number;
  baseY: number;
  h: number;
  kind: 'leafy' | 'grass' | 'tall';
  seed: number;
  tone: number;
  S: number;
}

export interface WorldRock {
  x: number;
  baseY: number;
  w: number;
  h: number;
  seed: number;
  tone: number;
  S: number;
}

export interface WorldScene {
  nurseryPlants: WorldPlant[];
  decorPlants: WorldPlant[];
  rocks: WorldRock[];
}

export function buildWorldScene(): WorldScene {
  const rnd = mulberry(777123);
  const nurseryPlants: WorldPlant[] = [];
  const decorPlants: WorldPlant[] = [];
  const rocks: WorldRock[] = [];

  // Dense nursery shelter along floor (X: 180 to 700)
  for (let x = 200; x <= 680; x += 40) {
    const rx = x + (rnd() - 0.5) * 20;
    const sy = worldSurfaceY(rx);
    const kinds: Array<'leafy' | 'grass' | 'tall'> = ['tall', 'grass', 'leafy', 'tall'];
    nurseryPlants.push({
      x: rx,
      baseY: sy + (rnd() - 0.5) * 12,
      h: 2.4 + rnd() * 1.8,
      kind: kinds[Math.floor(rnd() * kinds.length)],
      seed: Math.floor(rnd() * 1000),
      tone: Math.floor(rnd() * 3),
      S: 55 + rnd() * 25,
    });
  }

  // A couple of big smooth rocks around nursery boundary
  rocks.push({
    x: 180,
    baseY: worldSurfaceY(180) + 10,
    w: 1.4,
    h: 1.1,
    seed: 12,
    tone: 1,
    S: 80,
  });
  rocks.push({
    x: 730,
    baseY: worldSurfaceY(730) + 12,
    w: 1.8,
    h: 1.3,
    seed: 45,
    tone: 2,
    S: 90,
  });

  // Open feeding area scattered plants and rocks (X: 850 to 1800)
  for (let x = 900; x <= 1800; x += 140) {
    const rx = x + (rnd() - 0.5) * 40;
    const sy = worldSurfaceY(rx);
    if (rnd() < 0.6) {
      decorPlants.push({
        x: rx,
        baseY: sy + (rnd() - 0.5) * 8,
        h: 1.2 + rnd() * 1.2,
        kind: rnd() < 0.5 ? 'leafy' : 'grass',
        seed: Math.floor(rnd() * 1000),
        tone: Math.floor(rnd() * 3),
        S: 45 + rnd() * 20,
      });
    }
    if (rnd() < 0.5) {
      rocks.push({
        x: rx + (rnd() - 0.5) * 60,
        baseY: sy + 10,
        w: 0.9 + rnd() * 0.7,
        h: 0.6 + rnd() * 0.5,
        seed: Math.floor(rnd() * 1000),
        tone: Math.floor(rnd() * 3),
        S: 50 + rnd() * 30,
      });
    }
  }

  // Castle perimeter rocks
  rocks.push({
    x: CASTLE_LANDMARK.cx - 160,
    baseY: worldSurfaceY(CASTLE_LANDMARK.cx - 160) + 10,
    w: 1.5,
    h: 1.0,
    seed: 88,
    tone: 0,
    S: 75,
  });
  rocks.push({
    x: CASTLE_LANDMARK.cx + 170,
    baseY: worldSurfaceY(CASTLE_LANDMARK.cx + 170) + 10,
    w: 1.3,
    h: 0.9,
    seed: 92,
    tone: 2,
    S: 70,
  });

  return { nurseryPlants, decorPlants, rocks };
}