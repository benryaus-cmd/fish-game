import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const source = await readFile(new URL('../src/games/importedAippy/upstream/src/utils/playerSurvival.ts', import.meta.url), 'utf8');
const moduleSource = stripTypeScriptTypes(source.replace(/import \{ TAU, type Fish \} from[^;]+;/, 'const TAU = Math.PI * 2;').replace(/import type[^;]+;/g, ''), { mode: 'strip' });
const { updatePlayerFish, createPlayerSurvival } = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);

function fish() {
  return { x: 10000, y: 10000, L: 60, speed: 0, accel: 0, vy: 0, pitch: 0, dir: 1, yaw: 0, yawVel: 0, yawBody: 0, yawTail: 0, amp: 0.2, phase: 0, finPhase: 0, finBoost: 0, mouth: 0 };
}
const bounds = { w: 30000, h: 30000, surfaceY: () => 29900 };
function swim(x: number, y: number, fps = 60, seconds = 3, initial = fish(), modifiers = {}) {
  const survival = createPlayerSurvival();
  for (let i = 0; i < fps * seconds; i++) updatePlayerFish(initial, { x, y, active: true, burst: false }, survival, 1 / fps, bounds, false, modifiers);
  return initial;
}

test('light stick controls effort and actual travel without double attenuation', () => {
  const full = swim(1, 0), light = swim(0.25, 0);
  assert.ok(light.speed / full.speed > 0.24 && light.speed / full.speed < 0.26);
  assert.ok((light.x - 10000) / (full.x - 10000) > 0.24);
});
test('diagonal input cannot travel faster than full horizontal input', () => {
  const full = swim(1, 0), diagonal = swim(1, 1);
  assert.ok(Math.hypot(diagonal.x - 10000, diagonal.y - 10000) <= (full.x - 10000) * 1.01);
});
test('straight dives hold the dorsal view from either prior side without changing travel', () => {
  for (const dir of [1, -1]) {
    const initial = {...fish(), dir, yaw: dir===1?0:Math.PI, yawBody:dir===1?0:Math.PI,yawTail:dir===1?0:Math.PI};
    const down = swim(0, 1, 60, 5, initial);
    for (const yaw of [down.yaw,down.yawBody,down.yawTail]) assert.ok(Math.abs(yaw-Math.PI/2)<0.01);
    assert.ok(down.pitch < -1.34 && down.pitch > -1.36);
    assert.ok(Math.sin(down.yawBody)*Math.sin(down.pitch)<-0.95, 'local back faces the camera');
    assert.ok(Math.abs(down.vy-183.6)<0.001);
  }
});
test('climbs and diagonal dives have continuous depth rather than binary side facing', () => {
  const up=swim(0,-1,60,5), right=swim(0.7,0.7,60,5), left=swim(-0.7,0.7,60,5);
  assert.ok(up.pitch>1.34 && up.pitch<1.36);
  assert.ok(Math.abs(up.yawBody-Math.PI/2)<0.01);
  assert.ok(Math.abs(right.yawBody-Math.PI/4)<0.01);
  assert.ok(Math.abs(left.yawBody-3*Math.PI/4)<0.01);
  assert.ok(Math.abs(left.pitch-right.pitch)<0.001);
  assert.ok(right.pitch < -0.78 && right.pitch > -0.79);
});
test('release levels the diving pose smoothly and preserves horizontal turn behaviour', () => {
  const player=swim(0,1,60,5), survival=createPlayerSurvival();
  for(let i=0;i<30;i++) {
    const before=Math.abs(player.pitch);
    updatePlayerFish(player,{x:0,y:0,active:false,burst:false},survival,1/60,bounds,false);
    assert.ok(Math.abs(player.pitch)<before);
  }
  assert.ok(Math.abs(player.pitch)>0.37 && Math.abs(player.pitch)<0.40);
});
test('full-stick turns preserve head body and tail lag in both directions', () => {
  const left = swim(-1, 0, 60, 0.1);
  assert.ok(left.yaw > left.yawBody && left.yawBody > left.yawTail && left.yawTail > 0);
  const reversed = { ...fish(), dir: -1, yaw: Math.PI, yawBody: Math.PI, yawTail: Math.PI };
  const right = swim(1, 0, 60, 0.1, reversed);
  assert.ok(right.yaw < right.yawBody && right.yawBody < right.yawTail && right.yawTail < Math.PI);
  assert.ok(swim(-1, 0).yawBody > 3.1);
  assert.ok(swim(1, 0, 60, 3, reversed).yawBody < 0.04);
});
test('swimming stays consistent at 30, 60 and 120 FPS', () => {
  const runs = [30, 60, 120].map(fps => swim(-0.8, -0.6, fps));
  for (const run of runs) {
    assert.ok(Math.abs(run.pitch - runs[1].pitch) < 0.005);
    assert.ok(Math.abs(run.x - runs[1].x) < 6);
    assert.ok(Math.abs(run.y - runs[1].y) < 6);
    assert.ok(Math.abs(run.yawBody - runs[1].yawBody) < 0.005);
  }
});
test('invalid time or stick values cannot poison the pose', () => {
  const player = fish(), survival = createPlayerSurvival();
  updatePlayerFish(player, { x: Infinity, y: NaN, active: true, burst: false }, survival, NaN, bounds, false);
  for (const v of Object.values(player)) assert.ok(Number.isFinite(v));
});
test('optional adaptations change speed and burst stamina while defaults remain intact', () => {
  const normal = swim(1, 0), swift = swim(1, 0, 60, 3, fish(), { speedMultiplier: 1.2 });
  assert.ok(swift.speed > normal.speed * 1.19);
  const player = fish(), survival = createPlayerSurvival();
  updatePlayerFish(player, { x: 1, y: 0, active: true, burst: true }, survival, 0.05, bounds, false, { staminaDrainMultiplier: 1.2 });
  assert.ok(Math.abs(survival.stamina - 96.1) < 0.001);
});

const utilsRoot = new URL('../src/games/importedAippy/upstream/src/utils/', import.meta.url);
const colorSource = stripTypeScriptTypes(await readFile(new URL('colorUtils.ts', utilsRoot), 'utf8'));
const colorUrl = `data:text/javascript;base64,${Buffer.from(colorSource).toString('base64')}`;
const plantSource = stripTypeScriptTypes((await readFile(new URL('plantRender.ts', utilsRoot), 'utf8')).replace("'@/utils/colorUtils'", JSON.stringify(colorUrl)));
const { drawPlant } = await import(`data:text/javascript;base64,${Buffer.from(plantSource).toString('base64')}`);
function recordingContext() {
  const points: number[][] = [], fills: unknown[] = [];
  return { points, fills, globalAlpha: 1, fillStyle: null, strokeStyle: null, lineWidth: 1,
    beginPath() {}, closePath() {}, moveTo(...p: number[]) { points.push(p); }, lineTo(...p: number[]) { points.push(p); },
    ellipse() {}, fill() { fills.push(this.fillStyle); }, stroke() {}, save() {}, restore() {},
    createLinearGradient() { return { addColorStop() {} }; },
  };
}
test('foreground and rear leaves split into complete distinct render layers', () => {
  const plant = { kind: 'leafy', h: 3, seed: 7, tone: 0 };
  const all = recordingContext(), back = recordingContext(), front = recordingContext();
  drawPlant(all, 100, 300, plant, 60, '#4fa85c', 2, 1, 'all');
  drawPlant(back, 100, 300, plant, 60, '#4fa85c', 2, 1, 'back');
  drawPlant(front, 100, 300, plant, 60, '#4fa85c', 2, 1, 'front');
  assert.ok(back.fills.length > 0 && front.fills.length > 0);
  assert.equal(back.fills.length + front.fills.length, all.fills.length);
});
test('plant translucency does not shrink geometry and leaves receive gradient shading', () => {
  const plant = { kind: 'leafy', h: 3, seed: 7, tone: 0 };
  const full = recordingContext(), faded = recordingContext();
  drawPlant(full, 100, 300, plant, 60, '#4fa85c', 2, 1);
  drawPlant(faded, 100, 300, plant, 60, '#4fa85c', 2, 0.3);
  assert.deepEqual(faded.points, full.points);
  assert.ok(full.fills.some(fill => typeof fill === 'object'));
});

test('nursery eligibility includes all four boundaries and excludes beyond each edge', async () => {
  const coverSource = stripTypeScriptTypes((await readFile(new URL('nurseryCover.ts', utilsRoot), 'utf8'))
    .replace(/import type[^;]+;/g, '')
    .replace(/import \{ NURSERY_ZONE[^;]+;/, 'const NURSERY_ZONE = { x0:160, x1:720, y0:1280, y1:1780 };')
    .replace(/import \{ drawPlant[^;]+;/, ''));
  const { isInNursery } = await import(`data:text/javascript;base64,${Buffer.from(coverSource).toString('base64')}`);
  for (const point of [[160,1280], [720,1780], [160,1780], [720,1280]]) assert.equal(isInNursery(...point), true);
  for (const point of [[159,1500], [721,1500], [400,1279], [400,1781], [NaN,1500]]) assert.equal(isInNursery(...point), false);
});

test('neutral input continues a pending turn in either facing direction', () => {
  for (const dir of [-1, 1]) {
    const player = { ...fish(), dir, yaw: Math.PI / 2, yawBody: Math.PI / 2, yawTail: Math.PI / 2 };
    const survival = createPlayerSurvival();
    for (let i = 0; i < 180; i++) updatePlayerFish(player, { x: 0, y: 0, active: false, burst: false }, survival, 1 / 60, bounds, false);
    assert.ok(dir === 1 ? player.yawTail < 0.05 : player.yawTail > 3.09);
  }
});
test('vertical coasting drag is independent of frame rate', () => {
  const destinations = [30,60,120].map(fps => {
    const player = { ...fish(), vy: -180 }, survival = createPlayerSurvival();
    for (let i=0;i<fps;i++) updatePlayerFish(player, {x:0,y:0,active:false,burst:false}, survival, 1/fps, bounds, false);
    return player.y;
  });
  assert.ok(Math.max(...destinations) - Math.min(...destinations) < 3);
});

test('light horizontal steering retains its facing after release in both directions', () => {
  for(const dir of [-1,1]) {
    const initial={...fish(),dir:-dir,yaw:dir===1?Math.PI:0,yawBody:dir===1?Math.PI:0,yawTail:dir===1?Math.PI:0};
    const player=swim(dir*0.1,0,60,5,initial);
    assert.equal(player.dir,dir);
    const survival=createPlayerSurvival();
    for(let i=0;i<60;i++) updatePlayerFish(player,{x:0,y:0,active:false,burst:false},survival,1/60,bounds,false);
    assert.ok(dir===1?player.yawBody<0.05:player.yawBody>3.09);
  }
});
