import { TAU, type Fish } from '@/utils/fishModel';
import type { JoystickInput } from '@/utils/playerInput';

const PI = Math.PI;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

export interface PlayerSurvivalState {
  health: number; // 0..100
  hunger: number; // 0..100
  stamina: number; // 0..100
  growth: number; // 0..100 (%)
  invulnerableTime: number; // seconds remaining
  burstCooldown: number; // seconds remaining
  isBursting: boolean;
  isInNursery: boolean;
  isDead: boolean;
  scoreReported: boolean;
  growthPulse: number; // 0..1 pulse animation for HUD / body highlight
  damageFlash: number; // 0..1 flinch/flash on hit
}

export function createPlayerSurvival(): PlayerSurvivalState {
  return {
    health: 100,
    hunger: 100,
    stamina: 100,
    growth: 0,
    invulnerableTime: 0,
    burstCooldown: 0,
    isBursting: false,
    isInNursery: true,
    isDead: false,
    scoreReported: false,
    growthPulse: 0,
    damageFlash: 0,
  };
}

export interface WorldBounds {
  w: number;
  h: number;
  surfaceY: (x: number) => number;
}

export interface PlayerSurvivalModifiers {
  speedMultiplier?: number;
  staminaDrainMultiplier?: number;
}

export function updatePlayerFish(
  player: Fish,
  input: JoystickInput,
  survival: PlayerSurvivalState,
  dtRaw: number,
  bounds: WorldBounds,
  inShelter: boolean,
  modifiers: PlayerSurvivalModifiers = {}
) {
  const dt = Number.isFinite(dtRaw) ? clamp(dtRaw, 0, 0.05) : 0;
  if (dt <= 0) return;

  const inputX = Number.isFinite(input.x) ? clamp(input.x, -1, 1) : 0;
  const inputY = Number.isFinite(input.y) ? clamp(input.y, -1, 1) : 0;
  const inputLength = Math.hypot(inputX, inputY);
  const strength = input.active ? Math.min(1, inputLength) : 0;
  const moving = strength > 0.001;
  const directionX = moving ? inputX / inputLength : 0;
  const directionY = moving ? inputY / inputLength : 0;
  const speedMultiplier = Number.isFinite(modifiers.speedMultiplier)
    ? clamp(modifiers.speedMultiplier!, 0.1, 3) : 1;
  const staminaDrainMultiplier = Number.isFinite(modifiers.staminaDrainMultiplier)
    ? clamp(modifiers.staminaDrainMultiplier!, 0.1, 3) : 1;
  survival.isInNursery = inShelter;

  // Invulnerability & damage flash decay
  if (survival.invulnerableTime > 0) {
    survival.invulnerableTime = Math.max(0, survival.invulnerableTime - dt);
  }
  if (survival.damageFlash > 0) {
    survival.damageFlash = Math.max(0, survival.damageFlash - dt * 2.5);
  }
  if (survival.growthPulse > 0) {
    survival.growthPulse = Math.max(0, survival.growthPulse - dt * 1.5);
  }

  // Check dead
  if (survival.health <= 0) {
    survival.health = 0;
    survival.isDead = true;
  }

  // Burst handling & stamina management
  if (survival.burstCooldown > 0) {
    survival.burstCooldown = Math.max(0, survival.burstCooldown - dt);
  }

  const wantsBurst = input.burst && survival.stamina > 20 && survival.burstCooldown <= 0;
  if (wantsBurst) {
    survival.isBursting = true;
    survival.stamina = Math.max(0, survival.stamina - dt * 65 * staminaDrainMultiplier);
    if (survival.stamina <= 5) {
      survival.isBursting = false;
      survival.burstCooldown = 1.0;
    }
  } else {
    survival.isBursting = false;
    // Stamina recovery (faster when coasting/resting)
    const recRate = input.active ? 22 : 38;
    survival.stamina = Math.min(100, survival.stamina + dt * recRate);
  }

  // Movement Physics
  const L = Number.isFinite(player.L) ? Math.max(1, player.L) : 1;
  const maxBaseSpeed = L * 3.4 * 0.4 * speedMultiplier;
  const burstMultiplier = survival.isBursting ? 1.85 : 1.0;
  const targetSpeed = maxBaseSpeed * burstMultiplier * strength;

  // Acceleration / Drag
  const accelRate = survival.isBursting ? 8.0 : moving ? 5.0 : 3.0;
  const prevSpeed = player.speed;
  player.speed += (targetSpeed - player.speed) * ease(accelRate, dt);
  player.accel += ((player.speed - prevSpeed) / dt / L - player.accel) * ease(4, dt);

  // Direction & Steering
  if (moving) {
    // Determine horizontal facing (1 = right, -1 = left)
    if (inputX > 0.001 && player.dir !== 1) {
      player.dir = 1;
    } else if (inputX < -0.001 && player.dir !== -1) {
      player.dir = -1;
    }

    // Desired vertical pitch based on Y input
    // Positive pitch lifts the nose in the procedural rig (screen Y points down).
    // Dive through the local body frame; yaw exposes the back instead of a rotated flank.
    const pitchGoal = clamp(Math.atan2(-directionY, Math.abs(directionX)), -1.35, 1.35);
    player.pitch += (pitchGoal - player.pitch) * ease(5, dt);
  } else {
    // Gentle leveling when idle
    player.pitch += (0 - player.pitch) * ease(2.5, dt);
  }

  // Strong horizontal input speeds up the turn without snapping the pose.
  // Keep the original response below half stick; reach full boost at 90%.
  const turnInput = moving ? clamp((Math.abs(inputX) - 0.5) / 0.4, 0, 1) : 0;
  const turnBoost = turnInput * turnInput * (3 - 2 * turnInput);
  // A vertical direction holds the middle of a turn, independent of the previous side.
  const goalYaw = moving ? Math.atan2(Math.abs(directionY), directionX) : (player.dir === 1 ? 0 : PI);
  const k = 5.2 + 41.6 * turnBoost;
  const c = 2 * Math.sqrt(k) * 0.95;
  player.yawVel += ((goalYaw - player.yaw) * k - player.yawVel * c) * dt;
  player.yaw = clamp(player.yaw + player.yawVel * dt, -0.04, PI + 0.04);
  player.yawBody += (player.yaw - player.yawBody) * ease(5.5 + 11 * turnBoost, dt);
  player.yawTail += (player.yawBody - player.yawTail) * ease(4.2 + 8.4 * turnBoost, dt);
  const turning = Math.sin(clamp(player.yawBody, 0, PI));

  // Compute velocities
  let vx = 0;
  let vy = 0;
  if (moving) {
    const forwardX = Math.cos(player.yawBody);
    vx = directionX * player.speed * (0.8 + 0.2 * Math.abs(forwardX));
    vy = directionY * player.speed * 0.9;
  } else {
    // Gentle coasting along current heading
    vx = player.speed * Math.cos(player.yawBody) * 0.5;
    // Preserve the original 60 FPS drag while keeping coasting consistent at any FPS.
    vy = player.vy * Math.pow(0.9, dt * 60);
  }

  player.vy = vy;
  player.x += vx * dt;
  player.y += vy * dt;

  // Boundary clamping
  const marginX = L * 0.6;
  const minY = L * 0.8;
  const floorYRaw = bounds.surfaceY(player.x);
  const floorY = Number.isFinite(floorYRaw) ? floorYRaw : bounds.h;
  const maxY = floorY - L * 0.45;

  player.x = clamp(player.x, marginX, Math.max(marginX, bounds.w - marginX));
  player.y = clamp(player.y, minY, Math.max(minY, maxY));

  // Natural fin and tail wave animation based on effort
  const norm = player.speed / L;
  const push = Math.max(0, player.accel);
  const freq = (0.7 + norm * 2.2 + push * 2.0) * (survival.isBursting ? 1.6 : 1.0);

  player.amp +=
    (clamp(0.12 + norm * 0.35 + push * 0.6 + turning * 0.2, 0.08, 0.65) - player.amp) *
    ease(3, dt);

  player.phase += TAU * freq * dt;
  if (player.phase > TAU * 1000) player.phase -= TAU * 1000;

  player.finPhase += TAU * (0.6 + norm * 0.7) * dt;
  if (player.finPhase > TAU * 1000) player.finPhase -= TAU * 1000;

  player.finBoost += (clamp(push * 0.9 + turning * 0.2, -0.1, 0.45) - player.finBoost) * ease(3, dt);

  // Close mouth smoothly unless biting
  if (player.mouth > 0) {
    player.mouth = Math.max(0, player.mouth - dt * 3.5);
  }
}
