import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes, createRequire } from 'node:module';

// Canvas factory is the environment boundary; the real drawing operations are inspected below.
const source = await readFile(new URL('../src/games/importedAippy/upstream/src/utils/aquaScene.ts', import.meta.url), 'utf8');
const moduleSource = stripTypeScriptTypes(source.replace(/^import[^;]+;/gm, ''));
const scene = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);

test('water lighting reaches lower viewport and attenuates by world depth', () => {
  assert.equal(typeof scene.drawWaterCaustics, 'function', 'missing full-view water lighting');
  const rectangles: number[][] = [], stops: [number, string][] = [], images: number[][] = [];
  const buffer = { width: 0, height: 0, getContext: () => context };
  const context = { save() {}, restore() {}, setTransform() {}, clearRect() {}, translate() {}, scale() {},
    fillRect(...args: number[]) { rectangles.push(args); }, createLinearGradient() { return { addColorStop(position: number, colour: string) { stops.push([position, colour]); } }; },
    globalAlpha: 1, globalCompositeOperation: 'source-over', fillStyle: null };
  (globalThis as any).document = { createElement: () => buffer };
  const destination = { save() {}, restore() {}, drawImage(_buffer: unknown, ...args: number[]) { images.push(args); } };
  scene.drawWaterCaustics(destination, {}, 0, 600, 500, 390, 844, 0.04, 1800);
  assert.ok(rectangles.some(rect => rect[3] >= 844), 'pattern never reaches lower viewport');
  assert.ok(images.some(image => image.at(-1) === 844), 'composited light must cover the entire viewport');
  const alpha = (colour: string) => Number(colour.match(/[\d.]+/g)!.at(-1));
  assert.ok(stops.length >= 2 && alpha(stops[0][1]) > alpha(stops.at(-1)![1]), 'world-depth attenuation must decrease smoothly');
  const firstBufferWidth = buffer.width;
  scene.drawWaterCaustics(destination, {}, 1, 600, 650, 400, 850, 0.04, 1800);
  assert.equal(buffer.width, firstBufferWidth, 'nearby view sizes reuse quantised buffer');
});

let canvas: any;
try { canvas = createRequire(import.meta.url)(process.env.FISH_CANVAS_MODULE || '@napi-rs/canvas'); } catch {}
test('real lighting remains visible below the former cut-off and fades with depth', { skip: !canvas }, async () => {
  (globalThis as any).document = { createElement: () => canvas.createCanvas(1, 1) };
  const realScene = await import(`data:text/javascript;base64,${Buffer.from(moduleSource + '\n// real canvas instance').toString('base64')}`);
  const tile = canvas.createCanvas(16, 16), texture = tile.getContext('2d');
  texture.fillStyle = 'white'; texture.fillRect(0, 0, 8, 16);
  const c = canvas.createCanvas(390, 844), ctx = c.getContext('2d');
  realScene.drawWaterCaustics(ctx, ctx.createPattern(tile, 'repeat'), 0, 0, 0, 390, 844, 1, 1800);
  const meanAlpha = (y: number) => {
    const pixels = ctx.getImageData(0, y, 390, 8).data; let total = 0;
    for (let i = 3; i < pixels.length; i += 4) total += pixels[i];
    return total / (pixels.length / 4);
  };
  assert.ok(meanAlpha(700) > 35, 'lower viewport has no caustic lighting');
  assert.ok(Math.abs(meanAlpha(392) - meanAlpha(404)) < 12, 'hard lighting discontinuity at old boundary');
  assert.ok(meanAlpha(16) > meanAlpha(700), 'light does not attenuate with depth');
});
