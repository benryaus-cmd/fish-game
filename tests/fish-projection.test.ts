import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { stripTypeScriptTypes, createRequire } from 'node:module';

const root = new URL('../src/games/importedAippy/upstream/src/utils/', import.meta.url);
const modules = new Map<string, string>();
async function loadUrl(name: string): Promise<string> {
  if (modules.has(name)) return modules.get(name)!;
  let source = await readFile(new URL(`${name}.ts`, root), 'utf8');
  source = source.replace(/import type[\s\S]*?;/g, '');
  const imports = [...source.matchAll(/from ['"]@\/utils\/([^'"]+)['"]/g)];
  for (const match of imports) source = source.replace(match[0], `from ${JSON.stringify(await loadUrl(match[1]))}`);
  const url = `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`;
  modules.set(name, url);
  return url;
}
const { createFish, computePose, makePalette, makeColorfulPalette, LAST } = await import(await loadUrl('fishModel'));
const { drawMedianFin, drawTail, drawPectoral } = await import(await loadUrl('fishFins'));
const { drawFish } = await import(await loadUrl('fishRender'));
const { STARTER, COLORFUL } = await import(await loadUrl('fishSpecies'));
const { getFishMouthPos } = await import(await loadUrl('survivalEcology'));
function fish(pitch: number, yaw: number, L = 160, tr = STARTER) {
  const f = createFish(640, 480, L, tr);
  Object.assign(f, { x: 320, y: 240, pitch, yaw, yawBody: yaw, yawTail: yaw, amp: 0, phase: 0.9, tilt: 0 });
  computePose(f);
  return f;
}
function recorder() {
  const moves: number[][] = [];
  return { moves, beginPath() {}, closePath() {}, moveTo(x: number, y: number) { moves.push([x, y]); },
    lineTo() {}, quadraticCurveTo() {}, fill() {}, stroke() {} };
}
function close(actual: number[], expected: number[], message: string) {
  assert.ok(Math.hypot(actual[0] - expected[0], actual[1] - expected[1]) < 1e-6, `${message}: ${actual} != ${expected}`);
}

// These catch screen-Y attachment offsets; expectations come from the analytic
// projection of a yawed, pitched local down axis, not a production helper.
test('median roots stay on the local dorsal plane through climb, dive and reversal', () => {
  for (const yaw of [0, Math.PI]) for (const pitch of [0, -1.2, 1.2]) {
    const f = fish(pitch, yaw), ctx = recorder(), fin = f.tr.fins[0];
    drawMedianFin(ctx, f, fin.t0, fin.t1, fin.side, fin.h, fin.skew);
    const i = Math.round(fin.t0 * LAST), offset = -f.tr.hh[i] * 0.7;
    close(ctx.moves[0], [f.px[i] + Math.cos(yaw) * Math.sin(pitch) * offset,
      f.py[i] + Math.cos(pitch) * offset], `median ${yaw}/${pitch}`);
  }
});
test('tail root rotates with body thickness including feeding tilt', () => {
  for (const yaw of [0, Math.PI]) for (const pitch of [-1.2, 1.2]) {
    const f = fish(pitch, yaw), ctx = recorder();
    f.tilt = 0.1; computePose(f); drawTail(ctx, f);
    const h = -f.tr.hh[LAST] * 1.15;
    close(ctx.moves[0], [f.px[LAST] + Math.cos(yaw) * Math.sin(pitch + 0.1) * h,
      f.py[LAST] + Math.cos(pitch + 0.1) * h], 'tail root');
  }
});
test('both paired fins attach to their projected flank and local belly', () => {
  for (const yaw of [0, Math.PI / 2, Math.PI]) for (const pitch of [-1.2, 1.2]) for (const side of [-1, 1]) {
    const f = fish(pitch, yaw), ctx = recorder(); drawPectoral(ctx, f, side);
    const h = f.tr.hh[6] * 0.3;
    close(ctx.moves[0], [f.px[6] - side * Math.sin(yaw) * f.tr.ww[6] * 0.85 + Math.cos(yaw) * Math.sin(pitch) * h,
      f.py[6] + Math.cos(pitch) * h], 'paired root');
  }
});
test('bite contact follows the pitched mouth including feeding tilt and either facing direction', () => {
  for (const yaw of [0, Math.PI]) for (const pitch of [0, -1.2, 1.2]) {
    const f = fish(pitch, yaw); f.tilt = 0.1;
    const p = pitch + 0.1, actual = getFishMouthPos(f);
    close([actual.x, actual.y], [320 + Math.cos(yaw) * (Math.cos(p) * 0.42 + Math.sin(p) * 0.03) * 160,
      240 + (-Math.sin(p) * 0.42 + Math.cos(p) * 0.03) * 160], 'bite contact');
  }
});

let canvas: any;
for (const path of [process.env.FISH_CANVAS_MODULE, '@napi-rs/canvas', `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/@napi-rs/canvas`, '/tmp/fish-tools/node_modules/@napi-rs/canvas', '/tmp/fish-browser/node_modules/@napi-rs/canvas'].filter(Boolean)) {
  try { canvas = createRequire(import.meta.url)(path); break; } catch {}
}
if (canvas) (globalThis as any).document = { createElement: () => canvas.createCanvas(64, 64) };
function render(f: any, rotate = 0, palette = makePalette('#f09340')) {
  const c = canvas.createCanvas(640, 480), ctx = c.getContext('2d');
  if (rotate) { ctx.translate(f.x, f.y); ctx.rotate(rotate); ctx.translate(-f.x, -f.y); }
  drawFish(ctx, f, palette);
  return c;
}
test('real rendered silhouettes keep their width and visible fins at steep pitch', { skip: !canvas }, () => {
  for (const yaw of [0, Math.PI]) for (const pitch of [-1.2, 1.2]) {
    const pitched = render(fish(pitch, yaw)), rotated = render(fish(0, yaw), yaw === 0 ? -pitch : pitch);
    const a = pitched.getContext('2d').getImageData(0, 0, 640, 480).data;
    const b = rotated.getContext('2d').getImageData(0, 0, 640, 480).data;
    let intersection = 0, union = 0;
    for (let i = 3; i < a.length; i += 4) { const aa = a[i] > 50, bb = b[i] > 50; intersection += Number(aa && bb); union += Number(aa || bb); }
    assert.ok(intersection / union > 0.94, `silhouette IoU ${intersection / union} at ${yaw}/${pitch}`);
  }
});
test('visible eye remains attached to the projected head, not screen-up', { skip: !canvas }, () => {
  for (const yaw of [0, Math.PI]) for (const pitch of [-1.2, 1.2]) {
    const f = fish(pitch, yaw), p = makePalette('#999999'); p.iris = '#ff0000';
    const c = render(f, 0, p), data = c.getContext('2d').getImageData(0, 0, 640, 480).data;
    let x = 0, y = 0, count = 0;
    for (let py = 0; py < 480; py++) for (let px = 0; px < 640; px++) {
      const i = (py * 640 + px) * 4;
      if (data[i] > 180 && data[i + 1] < 50 && data[i + 2] < 50 && data[i + 3] > 200) { x += px + 0.5; y += py + 0.5; count++; }
    }
    assert.ok(count > 15, 'visible iris has area');
    const h = -f.tr.hh[3] * 0.2;
    const ex = f.x + (f.px[3] + Math.cos(yaw) * Math.sin(pitch) * h) * f.L;
    const ey = f.y + (f.py[3] + Math.cos(pitch) * h) * f.L;
    assert.ok(Math.hypot(x / count - ex, y / count - ey) < 4, `eye drift ${yaw}/${pitch}`);
  }
});
test('body bands, gills and volume lighting follow the pitched local frame', { skip: !canvas }, () => {
  for (const tr of [STARTER, COLORFUL]) for (const yaw of [0, Math.PI]) {
    const p = () => tr === STARTER ? makePalette('#f09340') : makeColorfulPalette('#368bc4', '#edbf51');
    const a = render(fish(1.2, yaw, 160, tr), 0, p()).getContext('2d').getImageData(0, 0, 640, 480).data;
    const b = render(fish(0, yaw, 160, tr), yaw === 0 ? -1.2 : 1.2, p()).getContext('2d').getImageData(0, 0, 640, 480).data;
    let error = 0, count = 0;
    for (let i = 0; i < a.length; i += 4) if (a[i + 3] > 245 && b[i + 3] > 245) {
      for (let channel = 0; channel < 3; channel++) error += Math.abs(a[i + channel] - b[i + channel]);
      count += 3;
    }
    assert.ok(error / count < 8, `${tr.id}/${yaw} shading drift ${error / count}`);
  }
});
test('write actual procedural pose sheet for visual review', { skip: !canvas || !process.env.FISH_POSE_SHEET }, async () => {
  const sheet = canvas.createCanvas(1440, 1800), ctx = sheet.getContext('2d');
  ctx.fillStyle = '#12323b'; ctx.fillRect(0, 0, 1440, 1800);
  for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) {
    const tr = row < 2 || row === 4 ? STARTER : COLORFUL, L = row >= 4 || row % 2 ? 125 : 65;
    const yaw = col < 3 ? 0 : Math.PI, pitch = [-1.2, 0, 1.2][col % 3];
    const f = fish(pitch, yaw, L, tr); f.x = col * 240 + 120; f.y = row * 300 + 150; f.amp = 0.2;
    if (row >= 4) {
      f.yaw = Math.PI / 2; f.yawBody = col < 3 ? 0.7 : Math.PI - 0.7; f.yawTail = col < 3 ? 0.3 : Math.PI - 0.3;
      f.mouth = 0.7;
    }
    drawFish(ctx, f, tr === STARTER ? makePalette('#f09340') : makeColorfulPalette('#368bc4', '#edbf51'));
    ctx.fillStyle = '#f4edde'; ctx.font = '14px sans-serif';
    ctx.fillText(`${tr.id} ${L}px ${row >= 4 ? 'turn ' : ''}${yaw ? 'left' : 'right'} ${pitch}`, col * 240 + 10, row * 300 + 280);
  }
  await mkdir('test-results', { recursive: true });
  await writeFile('test-results/fish-pose-sheet.png', sheet.toBuffer('image/png'));
});
