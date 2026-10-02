import {
  createFish,
  fishScale,
  TAU,
  type Fish,
  type FishPalette,
} from '@/utils/fishModel';
import { SPECIES, type SpeciesId } from '@/utils/fishSpecies';
import { MAX_PLAYER_PITCH, type PlayerSurvivalState } from '@/utils/playerSurvival';
import { NURSERY_ZONE, WORLD_WIDTH } from '@/utils/worldCamera';

const PI = Math.PI;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

export interface PreyEntity {
  fish: Fish;
  active: boolean;
  speciesId: SpeciesId;
  respawnTimer: number;
}

export interface PredatorEntity {
  fish: Fish;
  targetId: 'player' | 'prey' | null;
  state: 'patrol' | 'stalk' | 'charge' | 'disengage';
  stateTimer: number;
  attackCooldown: number;
}

export function createPreyFish(
  id: number,
  x: number,
  y: number,
  baseLength: number,
  speciesId: SpeciesId = 'starter'
): PreyEntity {
  const tr = SPECIES[speciesId];
  const f = createFish(2400, 1600, baseLength, tr);
  f.id = id;
  f.x = x;
  f.y = y;
  f.tx = x + (Math.random() - 0.5) * 300;
  f.ty = y + (Math.random() - 0.5) * 200;
  f.pSpeed = 0.85 + Math.random() * 0.35;
  f.pHeight = 0.5;
  f.dir = Math.random() < 0.5 ? 1 : -1;
  f.yaw = f.yawBody = f.yawTail = f.dir === 1 ? 0 : PI;
  f.phase = Math.random() * TAU;
  f.finPhase = Math.random() * TAU;

  return {
    fish: f,
    active: true,
    speciesId,
    respawnTimer: 0,
  };
}

export function createPredatorFish(x: number, y: number, baseLength: number): PredatorEntity {
  const tr = SPECIES['starter']; // use robust fish rig
  const f = createFish(2400, 1600, baseLength, tr);
  f.id = 99999;
  f.x = x;
  f.y = y;
  f.tx = x - 400;
  f.ty = y;
  f.pSpeed = 1.25;
  f.dir = -1;
  f.yaw = f.yawBody = f.yawTail = PI;
  f.phase = Math.random() * TAU;
  f.finPhase = Math.random() * TAU;

  return {
    fish: f,
    targetId: null,
    state: 'patrol',
    stateTimer: 4.0,
    attackCooldown: 0,
  };
}

// Check mouth position for biting
export function getFishMouthPos(f: Fish): { x: number; y: number } {
  const S = fishScale(f);
  const p = f.pitch + f.tilt;
  const mx = f.x + Math.cos(f.yaw) * (Math.cos(p) * 0.42 + Math.sin(p) * 0.03) * S;
  const my = f.y + (-Math.sin(p) * 0.42 + Math.cos(p) * 0.03) * S;
  return { x: mx, y: my };
}

// Prey update: wander, flee from player/predator, loose schooling
export function updatePrey(
  preyList: PreyEntity[],
  player: Fish,
  predator: PredatorEntity,
  dt: number,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  surfaceY: (x: number) => number
) {
  const playerMouth = getFishMouthPos(player);

  for (let i = 0; i < preyList.length; i++) {
    const p = preyList[i];
    if (!p.active) {
      p.respawnTimer -= dt;
      // Respawn outside camera view
      if (p.respawnTimer <= 0) {
        // Find safe spawn pos outside current camera rect
        const margin = 150;
        let spawnX = 0;
        let spawnY = 0;
        const fromLeft = Math.random() < 0.5;
        if (fromLeft) {
          spawnX = Math.max(100, camX - margin - Math.random() * 200);
        } else {
          spawnX = Math.min(2300, camX + viewW + margin + Math.random() * 200);
        }
        spawnY = 300 + Math.random() * 1100;
        const floorY = surfaceY(spawnX);
        spawnY = Math.min(spawnY, floorY - p.fish.L * 0.8);

        p.fish.x = spawnX;
        p.fish.y = spawnY;
        p.fish.tx = spawnX + (fromLeft ? 300 : -300);
        p.fish.ty = spawnY;
        p.active = true;
      }
      continue;
    }

    const f = p.fish;
    f.decide -= dt;
    f.turnCool -= dt;

    // Proximity checks for threats (player & predator)
    const dPlayerX = f.x - player.x;
    const dPlayerY = f.y - player.y;
    const distPlayer = Math.hypot(dPlayerX, dPlayerY);

    const dPredX = f.x - predator.fish.x;
    const dPredY = f.y - predator.fish.y;
    const distPred = Math.hypot(dPredX, dPredY);

    const threatDist = Math.min(distPlayer, distPred);
    const isPlayerCloser = distPlayer < distPred;
    const fleeTarget = isPlayerCloser ? { x: player.x, y: player.y } : { x: predator.fish.x, y: predator.fish.y };

    const fleeRadius = f.L * 3.5;
    const isFleeing = threatDist < fleeRadius;

    if (isFleeing) {
      // Flee away from threat
      const fleeDx = f.x - fleeTarget.x;
      const fleeDy = f.y - fleeTarget.y;
      const fleeLen = Math.hypot(fleeDx, fleeDy) || 1;
      f.tx = f.x + (fleeDx / fleeLen) * (f.L * 3.0);
      f.ty = clamp(f.y + (fleeDy / fleeLen) * (f.L * 2.0), 150, surfaceY(f.x) - f.L);
      f.cruise = 1.35; // fast flee
      f.decide = 0.5;
    } else if (f.decide <= 0 || Math.abs(f.tx - f.x) < f.L * 0.8) {
      // Normal wander
      f.decide = 2.5 + Math.random() * 3.5;
      f.tx = clamp(f.x + (Math.random() - 0.5) * 600, 100, 2300);
      f.ty = clamp(f.y + (Math.random() - 0.5) * 350, 180, surfaceY(f.x) - f.L * 0.7);
      f.cruise = 0.45 + Math.random() * 0.3;
    }

    // Turn logic
    const dx = f.tx - f.x;
    if (dx > 20 && f.dir !== 1 && f.turnCool <= 0) {
      f.dir = 1;
      f.turnCool = 1.8;
    } else if (dx < -20 && f.dir !== -1 && f.turnCool <= 0) {
      f.dir = -1;
      f.turnCool = 1.8;
    }

    // Natural fish yaw and physics
    const goal = f.dir === 1 ? 0 : PI;
    const k = 3.6;
    const c = 2 * Math.sqrt(k) * 0.95;
    f.yawVel += ((goal - f.yaw) * k - f.yawVel * c) * dt;
    f.yaw = clamp(f.yaw + f.yawVel * dt, -0.04, PI + 0.04);
    f.yawBody += (f.yaw - f.yawBody) * ease(4.0, dt);
    f.yawTail += (f.yawBody - f.yawTail) * ease(3.0, dt);

    const speedTarget = f.cruise * f.L * f.pSpeed * .4;
    f.speed += (speedTarget - f.speed) * ease(isFleeing ? 3.5 : 1.2, dt);

    const vx = f.speed * Math.cos(f.yawBody);
    const vyTarget = clamp((f.ty - f.y) * 0.8, -f.speed * 0.6, f.speed * 0.6);
    f.vy += (vyTarget - f.vy) * ease(2.0, dt);

    f.x += vx * dt;
    f.y += f.vy * dt;

    // Clamping to world
    const floorY = surfaceY(f.x);
    f.x = clamp(f.x, 80, 2320);
    f.y = clamp(f.y, 120, floorY - f.L * 0.5);

    // Wave animations
    const norm = f.speed / f.L;
    const freq = (0.8 + norm * 2.0);
    f.phase += TAU * freq * dt;
    if (f.phase > TAU * 1000) f.phase -= TAU * 1000;
    f.finPhase += TAU * (0.6 + norm * 0.6) * dt;
    if (f.finPhase > TAU * 1000) f.finPhase -= TAU * 1000;
  }
}

// Predator AI: Patrols open water, tracks player if line of sight, loses player in nursery shelter
export function updatePredator(
  pred: PredatorEntity,
  player: Fish,
  playerSurvival: PlayerSurvivalState,
  dt: number,
  surfaceY: (x: number) => number,
  onBitePlayer: () => void
) {
  const f = pred.fish;
  pred.stateTimer -= dt;
  if (pred.attackCooldown > 0) {
    pred.attackCooldown = Math.max(0, pred.attackCooldown - dt);
  }

  const pMouth = getFishMouthPos(f);
  const dxToPlayer = player.x - f.x;
  const dyToPlayer = player.y - f.y;
  const distToPlayer = Math.hypot(dxToPlayer, dyToPlayer);

  // Line of sight check & nursery concealment
  const playerInNursery = playerSurvival.isInNursery;
  const canSeePlayer = !playerInNursery && distToPlayer < 600 && !playerSurvival.isDead;

  // Keep the last pursuit heading instead of rerolling a retreat target each frame.
  const disengage = (seconds: number) => {
    const dx = f.tx - f.x;
    const dy = f.ty - f.y;
    const distance = Math.hypot(dx, dy);
    const headingX = distance > 1 ? dx / distance : Math.cos(f.yawBody);
    const headingY = distance > 1 ? dy / distance : -Math.sin(f.pitch);
    f.tx = clamp(f.x + headingX * f.L * 5, 200, WORLD_WIDTH - 100);
    f.ty = clamp(f.y + headingY * f.L * 5, 150, surfaceY(f.tx) - f.L * 0.6);
    f.cruise = 0.65;
    pred.state = 'disengage';
    pred.stateTimer = seconds;
  };

  switch (pred.state) {
    case 'patrol': {
      if (canSeePlayer && pred.attackCooldown <= 0) {
        pred.state = 'stalk';
        pred.stateTimer = 0.65;
        f.tx = player.x;
        f.ty = player.y;
        f.cruise = 2.4;
        break;
      }
      if (pred.stateTimer <= 0 || Math.abs(f.tx - f.x) < f.L * 0.6) {
        pred.stateTimer = 4.0 + Math.random() * 4.0;
        // Patrol outside nursery (X: 850 to 2200)
        f.tx = 900 + Math.random() * (WORLD_WIDTH - 1100);
        f.ty = 400 + Math.random() * 800;
        f.cruise = 0.65;
      }
      break;
    }

    case 'stalk': {
      if (playerInNursery || playerSurvival.isDead || distToPlayer > 850) {
        disengage(2.5);
        break;
      }
      f.tx = player.x;
      f.ty = player.y;
      f.cruise = 2.4;

      // When close enough, charge!
      if ((distToPlayer < 650 || pred.stateTimer <= 0) && pred.attackCooldown <= 0) {
        pred.state = 'charge';
        pred.stateTimer = 1.4;
        f.cruise = 6.4;
      } else if (pred.stateTimer <= 0) {
        disengage(2.0);
      }
      break;
    }

    case 'charge': {
      if (playerInNursery || playerSurvival.isDead) {
        disengage(2.5);
        break;
      }
      f.tx = player.x;
      f.ty = player.y;
      f.cruise = 6.4; // decisive lunge: 3.2 body lengths/second

      // Bite test
      const mouthDist = Math.hypot(pMouth.x - player.x, pMouth.y - player.y);
      if (mouthDist < player.L * 0.75 && pred.attackCooldown <= 0 && playerSurvival.invulnerableTime <= 0) {
        f.mouth = 1.0;
        pred.attackCooldown = 7.0; // seven-second recovery after a successful bite
        disengage(2.5);
        onBitePlayer();
      } else if (pred.stateTimer <= 0) {
        disengage(2.0);
      }
      break;
    }

    case 'disengage': {
      // Coast toward the fixed forward target while easing back to patrol speed.
      f.cruise = 0.65;
      if (pred.stateTimer <= 0) {
        pred.state = 'patrol';
        pred.stateTimer = 4.0;
      }
      break;
    }
  }

  // Pose in the same local 3D frame as controlled fish, including dorsal dives.
  const dx = f.tx - f.x;
  const dy = f.ty - f.y;
  const distance = Math.hypot(dx, dy) || 1;
  const directionX = dx / distance;
  const directionY = dy / distance;
  if (dx > 0.001) f.dir = 1;
  else if (dx < -0.001) f.dir = -1;
  const goal = Math.atan2(Math.abs(directionY), directionX);
  const pitchGoal = clamp(Math.atan2(-directionY, Math.abs(directionX)), -MAX_PLAYER_PITCH, MAX_PLAYER_PITCH);
  f.pitch += (pitchGoal - f.pitch) * ease(pred.state === 'charge' ? 8 : 5, dt);
  const k = pred.state === 'charge' ? 46.8 : 5.2;
  const c = 2 * Math.sqrt(k) * 0.95;
  f.yawVel += ((goal - f.yaw) * k - f.yawVel * c) * dt;
  f.yaw = clamp(f.yaw + f.yawVel * dt, -0.04, PI + 0.04);
  f.yawBody += (f.yaw - f.yawBody) * ease(pred.state === 'charge' ? 16.5 : 5.5, dt);
  f.yawTail += (f.yawBody - f.yawTail) * ease(pred.state === 'charge' ? 12.6 : 4.2, dt);

  const targetSpeed = f.cruise * f.L * f.pSpeed * .4;
  f.speed += (targetSpeed - f.speed) * ease(pred.state === 'charge' ? 9 : 1.8, dt);

  // Steep attacks travel vertically instead of stalling on a side-facing yaw.
  const vx = directionX * f.speed * (0.8 + 0.2 * Math.abs(Math.cos(f.yawBody)));
  const vyTarget = directionY * f.speed * 0.9;
  f.vy += (vyTarget - f.vy) * ease(pred.state === 'charge' ? 9 : 2.5, dt);
  f.x += vx * dt;
  f.y += f.vy * dt;

  // Clamp predator to world
  const floorY = surfaceY(f.x);
  f.x = clamp(f.x, 200, WORLD_WIDTH - 100);
  f.y = clamp(f.y, 150, floorY - f.L * 0.6);

  // Close mouth smoothly
  if (f.mouth > 0) {
    f.mouth = Math.max(0, f.mouth - dt * 2.5);
  }

  // Wave animation
  const norm = f.speed / f.L;
  const freq = (0.7 + norm * 2.2) * (pred.state === 'charge' ? 1.5 : 1.0);
  f.phase += TAU * freq * dt;
  if (f.phase > TAU * 1000) f.phase -= TAU * 1000;
  f.finPhase += TAU * (0.6 + norm * 0.6) * dt;
  if (f.finPhase > TAU * 1000) f.finPhase -= TAU * 1000;
}
