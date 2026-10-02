import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const utils = new URL('../src/games/importedAippy/upstream/src/utils/', import.meta.url);
const textureSource = stripTypeScriptTypes(await readFile(new URL('aquaTextures.ts', utils), 'utf8'));
const textureUrl = `data:text/javascript;base64,${Buffer.from(textureSource).toString('base64')}`;
const source = stripTypeScriptTypes((await readFile(new URL('worldCamera.ts', utils), 'utf8')).replace("'@/utils/aquaTextures'", JSON.stringify(textureUrl)));
const { createCamera, updateCamera, getCameraView, triggerCameraShake, WORLD_WIDTH, CASTLE_LANDMARK, worldSurfaceY } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

function advance(cam = createCamera(), hints = {}, seconds = 4, fps = 60, target = [1200, 900], size = [600, 450]) {
  for (let i = 0; i < seconds * fps; i++) updateCamera(cam, ...target, ...size, 1 / fps, 0, 0, hints);
  return cam;
}

test('fry cruise starts close while camera limits still allow normal framing', () => {
  assert.equal(createCamera().zoom, 1.18);
  assert.equal(advance(undefined, { speed: 98, bodyLength: 72 }).zoom, 1.18);
  const cam = createCamera();
  updateCamera(cam, 1200, 900, 600, 450, 1);
  assert.equal(cam.zoom, 1.18);
});

test('sustained fast travel reveals space without reacting instantly to a brief burst', () => {
  const brief = advance(undefined, { speed: 200 }, 0.1);
  assert.ok(brief.zoom > 1 && brief.zoom < 1.18);
  const fast = advance(undefined, { speed: 200 });
  assert.ok(fast.zoom >= 0.65 && fast.zoom < 0.66);
});

test('a large body gets room at rest and extreme inputs never shrink prey further', () => {
  const large = advance(undefined, { bodyLength: 115 });
  assert.ok(large.zoom >= 0.65 && large.zoom < 0.66);
  const extreme = advance(undefined, { bodyLength: 1000, speed: 10000 });
  assert.ok(extreme.zoom >= 0.65);
});

test('zoom recovers smoothly and more slowly after travel stops', () => {
  const cam = advance(undefined, { speed: 200 });
  const initial = cam.zoom;
  advance(cam, { speed: 0 }, 0.5);
  assert.ok(cam.zoom > initial && cam.zoom < 0.9);
  advance(cam, { speed: 0 }, 8);
  assert.ok(cam.zoom > 1.17 && cam.zoom <= 1.18);
});

test('hysteresis avoids zoom pulsing around the speed threshold', () => {
  const cam = advance(undefined, { speed: 120 });
  advance(cam, { speed: 112 });
  const samples = [];
  for (let i = 0; i < 240; i++) {
    updateCamera(cam, 1200, 900, 600, 450, 1 / 60, 0, 0, { speed: i % 2 ? 111.2 : 112.8 });
    samples.push(cam.zoom);
  }
  assert.ok(Math.max(...samples) - Math.min(...samples) < 0.005);
  assert.ok(cam.zoom < 1.13);
});

test('zoom and follow agree at 30, 60 and 120 fps', () => {
  const runs = [30, 60, 120].map(fps => advance(undefined, { speed: 200 }, 2, fps));
  for (const cam of runs) {
    assert.ok(Math.abs(cam.zoom - runs[1].zoom) < 0.001);
    assert.ok(Math.abs(cam.x - runs[1].x) < 2);
    assert.ok(Math.abs(cam.y - runs[1].y) < 2);
  }
});

test('world dimensions and shake share the same zoomed view contract', () => {
  const cam = createCamera();
  Object.assign(cam, { x: 300, y: 400, zoom: 0.75, shakeX: 3, shakeY: -4 });
  assert.deepEqual(getCameraView(cam, 600, 450), { x: 303, y: 396, width: 800, height: 600, zoom: 0.75 });
});

test('zoomed framing and resizing stay within all four world edges immediately', () => {
  for (const target of [[-100, -100], [4000, 2500]]) {
    const cam = advance(undefined, { speed: 200 }, 4, 60, target);
    assert.ok(cam.x >= 0 && cam.x + 600 / cam.zoom <= WORLD_WIDTH);
    assert.ok(cam.y >= 0 && cam.y + 450 / cam.zoom <= 1800);
    updateCamera(cam, ...target, 1700, 1200, 1 / 60, 0, 0, { speed: 200 });
    assert.ok(cam.x >= 0 && cam.x + 1700 / cam.zoom <= WORLD_WIDTH);
    assert.ok(cam.y >= 0 && cam.y + 1200 / cam.zoom <= 1800);
  }
});

test('a viewport larger than the world centres the world rather than pinning one corner', () => {
  const cam = advance(undefined, {}, 1, 60, [3000, 2500], [4800, 2400]);
  assert.ok(Math.abs(cam.x - (WORLD_WIDTH - 4800 / cam.zoom) / 2) < 0.01);
  assert.ok(Math.abs(cam.y - (1800 - 2400 / cam.zoom) / 2) < 0.01);
});

test('reduced motion turns off dynamic zoom, travel lead and shake immediately', () => {
  const cam = advance(undefined, { speed: 200 });
  triggerCameraShake(cam);
  updateCamera(cam, 1200, 900, 600, 450, 1 / 60, 100, -100, { speed: 200, bodyLength: 115, reducedMotion: true });
  assert.equal(cam.zoom, 1);
  assert.equal(cam.shakeTime, 0);
  assert.equal(cam.shakeX, 0);
  assert.equal(cam.shakeY, 0);
  advance(cam, { speed: 200, reducedMotion: true });
  assert.ok(Math.abs(cam.x - 900) < 0.01 && Math.abs(cam.y - 675) < 0.01);
  updateCamera(cam, 1200, 900, 600, 450, 1, 100, -100, { reducedMotion: true });
  assert.ok(Math.abs(cam.x - 900) < 0.01 && Math.abs(cam.y - 675) < 0.01);
});

test('shake does not expose outside the world at a clamped edge', () => {
  const cam = advance(undefined, { speed: 200 }, 4, 60, [-100, -100]);
  const random = Math.random;
  try {
    Math.random = () => 0;
    triggerCameraShake(cam);
    updateCamera(cam, -100, -100, 600, 450, 1 / 60, 0, 0, { speed: 200 });
    const view = getCameraView(cam, 600, 450);
    assert.ok(view.x >= 0 && view.y >= 0);
  } finally {
    Math.random = random;
  }
});

test('invalid motion hints and time cannot poison an otherwise valid camera', () => {
  const cam = createCamera();
  updateCamera(cam, 1200, 900, 600, 450, NaN, 0, 0, { speed: Infinity, bodyLength: NaN });
  assert.equal(cam.zoom, 1.18);
  for (const value of Object.values(cam)) assert.ok(Number.isFinite(value));
});

test('castle is grounded at the far end of a habitat wide enough for a long nursery journey',()=>{assert.ok(WORLD_WIDTH>=3500); assert.ok(CASTLE_LANDMARK.cx>3000); assert.equal(CASTLE_LANDMARK.baseY,worldSurfaceY(CASTLE_LANDMARK.cx));});

const healingSource=(await readFile(new URL('castleHealing.ts',utils),'utf8')).replace("'@/utils/worldCamera'",JSON.stringify(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`));
const healing=await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(healingSource)).toString('base64')}`);
test('castle recovery is confined to the visible bubble plume rather than the whole landmark',()=>{
 const base=CASTLE_LANDMARK.baseY;
 assert.equal(healing.inCastleHealingPlume(3300,base-120),true);
 assert.equal(healing.inCastleHealingPlume(3300,base-310),true);
 assert.equal(healing.inCastleHealingPlume(3300,base-340),false);
 assert.equal(healing.inCastleHealingPlume(3420,base-120),false);
 assert.equal(healing.inCastleHealingPlume(3300,base+10),false);
});

test('normal swimming reveals more space and Burst reveals more again',()=>{
 const still=advance(undefined,{speed:30,bodyLength:72});
 const swimming=advance(undefined,{speed:30,bodyLength:72,swimming:true});
 const burst=advance(undefined,{speed:30,bodyLength:72,swimming:true,bursting:true});
 assert.ok(swimming.zoom<still.zoom-.08);assert.ok(burst.zoom<swimming.zoom-.2);
});
