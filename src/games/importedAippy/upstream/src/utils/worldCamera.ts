import { mulberry } from '@/utils/aquaTextures';

export interface Camera {
  x: number;
  y: number;
  shakeX: number;
  shakeY: number;
  shakeTime: number;
  zoom: number;
}

export interface CameraHints {
  /** Actual world travel speed in pixels/second, not stick strength. */
  speed?: number;
  swimming?: boolean;
  bursting?: boolean;
  /** The player's body length in world pixels (excluding ornamental fins). */
  bodyLength?: number;
  reducedMotion?: boolean;
}

const MIN_ZOOM = 0.65;
export const MAX_ZOOM = 1.18;
const zoomStates = new WeakMap<Camera, { fast: boolean; target: number }>();
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function clampCameraAxis(position: number, worldSize: number, visibleSize: number) {
  // Expose equal space on both sides when the viewport exceeds the world.
  return visibleSize >= worldSize
    ? (worldSize - visibleSize) / 2
    : Math.max(0, Math.min(worldSize - visibleSize, position));
}

/** One world-space view for transforms, culling, effects and pointer picking.
 * Shake offsets are world pixels and follow the existing positive-offset contract.
 */
export function getCameraView(cam: Camera, viewW: number, viewH: number) {
  const zoom = Number.isFinite(cam.zoom) ? Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.zoom)) : 1;
  return {
    x: cam.x + cam.shakeX,
    y: cam.y + cam.shakeY,
    width: viewW / zoom,
    height: viewH / zoom,
    zoom,
  };
}

export const WORLD_WIDTH = 3600;
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
  cx: 3300,
  get baseY() { return worldSurfaceY(3300); },
  size: 210,
};

export function createCamera(): Camera {
  return {
    x: 450,
    y: 1400,
    shakeX: 0,
    shakeY: 0,
    shakeTime: 0,
    zoom: MAX_ZOOM,
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
  lookAheadY = 0,
  hints: CameraHints = {}
) {
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const oldZoom = Number.isFinite(cam.zoom) ? Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.zoom)) : 1;
  const centerX = cam.x + viewW / oldZoom / 2;
  const centerY = cam.y + viewH / oldZoom / 2;
  let state = zoomStates.get(cam);
  if (!state) {
    state = { fast: false, target: oldZoom };
    zoomStates.set(cam, state);
  }

  if (hints.reducedMotion) {
    state.fast = false;
    state.target = cam.zoom = 1;
    cam.shakeTime = cam.shakeX = cam.shakeY = 0;
    lookAheadX = lookAheadY = 0;
  } else {
    const speed = Number.isFinite(hints.speed) ? Math.max(0, hints.speed!) : 0;
    const bodyLength = Number.isFinite(hints.bodyLength) ? Math.max(0, hints.bodyLength!) : 72;
    // Schmitt trigger: ordinary 72px guppy cruise (~98px/s) stays at 1x.
    if (speed >= 112) state.fast = true;
    else if (speed <= 96) state.fast = false;
    const speedRoom = state.fast ? clamp01((speed - 96) / 96) : 0;
    const sizeRoom = clamp01((bodyLength - 85) / 30);
    const closeZoom = bodyLength <= 72 ? MAX_ZOOM : 1 + (MAX_ZOOM - 1) * clamp01((100 - bodyLength) / 28);
    const target = closeZoom - (closeZoom - MIN_ZOOM) * Math.max(speedRoom, sizeRoom, hints.bursting ? .9 : hints.swimming ? .22 : 0);
    // Hold tiny target fluctuations, but always allow full recovery / maximum room.
    if (Math.abs(target - state.target) >= 0.015 || target === closeZoom || target === MIN_ZOOM) state.target = target;
    const zoomRate = state.target < oldZoom ? 2 : 0.65;
    cam.zoom = oldZoom + (state.target - oldZoom) * (1 - Math.exp(-zoomRate * dt));
  }
  // Keep the wider lens inside the aquarium on large but still fitting viewports.
  if(viewW<=WORLD_WIDTH&&viewH<=WORLD_HEIGHT)cam.zoom=Math.max(cam.zoom,viewW/WORLD_WIDTH,viewH/WORLD_HEIGHT);
  const worldViewW = viewW / cam.zoom;
  const worldViewH = viewH / cam.zoom;
  // Zoom about the current centre, rather than anchoring the old top-left.
  cam.x = centerX - worldViewW / 2;
  cam.y = centerY - worldViewH / 2;

  // Desired center in world coordinates
  const desiredCenterX = targetX + lookAheadX;
  const desiredCenterY = targetY + lookAheadY;

  // Camera top-left in world coords
  const desiredCamX = clampCameraAxis(desiredCenterX - worldViewW / 2, WORLD_WIDTH, worldViewW);
  const desiredCamY = clampCameraAxis(desiredCenterY - worldViewH / 2, WORLD_HEIGHT, worldViewH);

  // Smooth follow
  const followSpeed = 6.0;
  const k = 1 - Math.exp(-followSpeed * dt);
  cam.x += (desiredCamX - cam.x) * k;
  cam.y += (desiredCamY - cam.y) * k;
  // Clamp the actual view too: a resize or zoom change must not reveal an edge
  // while the smoothed position is still catching up to its target.
  cam.x = clampCameraAxis(cam.x, WORLD_WIDTH, worldViewW);
  cam.y = clampCameraAxis(cam.y, WORLD_HEIGHT, worldViewH);

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
  cam.shakeX = clampCameraAxis(cam.x + cam.shakeX, WORLD_WIDTH, worldViewW) - cam.x;
  cam.shakeY = clampCameraAxis(cam.y + cam.shakeY, WORLD_HEIGHT, worldViewH) - cam.y;
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

  // Low seagrass patches join the nursery to the castle without becoming shelter.
  for(let x=900,i=0;x<CASTLE_LANDMARK.cx-120;x+=180,i++){
    const rx=x+(rnd()-.5)*55;
    decorPlants.push({x:rx,baseY:worldSurfaceY(rx)+3,kind:'grass',h:1.05+rnd()*.65,seed:2100+i*17,tone:i%3,S:38+rnd()*15});
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
