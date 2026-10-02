import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import * as boutique from '../src/games/importedAippy/upstream/src/utils/boutique.ts';

const { createBoutiqueSave, createSpecimen, loadBoutique, settleRun, writeBoutique } = boutique;
const start = (...args: unknown[]) => {
  assert.equal(typeof (boutique as any).startStockRun, 'function', 'stock purchase transaction must exist');
  return (boutique as any).startStockRun(...args);
};
function storage() {
  const entries = new Map<string, string>();
  return { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
}

test('paid stock debits and creates a healthy distinct fry in one profile', () => {
  const before = { ...createBoutiqueSave(), coins: 100 };
  const after = start(before, 'sunburst', 'paid');
  assert.equal(after.coins, 60);
  assert.equal(before.coins, 100);
  assert.equal(before.activeRun, null);
  assert.deepEqual({ x: after.activeRun.x, y: after.activeRun.y, stamina: after.activeRun.stamina }, { x: 380, y: 1520, stamina: 100 });
  assert.equal(after.activeRun.specimen.id, 'paid');
  assert.equal(after.activeRun.specimen.origin, 'sunburst');
  assert.equal(after.activeRun.specimen.inherited.finForm, 'fan');
  assert.equal(after.activeRun.specimen.growth, 0);
  assert.equal(after.activeRun.specimen.health, 100);
  assert.equal(after.activeRun.specimen.hunger, 100);
  assert.deepEqual(after.activeRun.specimen.traits, []);
  const memory = storage();
  assert.equal(writeBoutique(after, memory), true);
  assert.deepEqual(loadBoutique(memory), after);
});

test('insufficient funds, invalid IDs, existing run and replay preserve the same profile', () => {
  const poor = createBoutiqueSave();
  assert.equal(start(poor, 'blueveil', 'poor'), poor);
  const rich = { ...poor, coins: 100 };
  for (const [stockId, runId] of [['missing', 'new'], ['legacy', 'new'], ['ordinary', ''], ['ordinary', ' '.repeat(3)]]) {
    assert.equal(start(rich, stockId, runId), rich);
  }
  const active = start(rich, 'ordinary', 'live');
  assert.equal(start(active, 'blueveil', 'other'), active);
  const ended = { ...rich, completedRunIds: ['done'] };
  assert.equal(start(ended, 'ordinary', 'done'), ended);
  const owned = { ...rich, kept: [{ ...createSpecimen(), id: 'owned' }] };
  assert.equal(start(owned, 'ordinary', 'owned'), owned);
});

test('failed storage never modifies or commits the caller purchase profile', () => {
  const before = { ...createBoutiqueSave(), coins: 75 };
  const purchase = start(before, 'blueveil', 'blocked');
  assert.equal(writeBoutique(purchase, { setItem() { throw new Error('full'); } }), false);
  assert.equal(before.coins, 75);
  assert.equal(before.activeRun, null);
  assert.equal(purchase.coins, 0);
  assert.equal(purchase.activeRun.specimen.origin, 'blueveil');
});

test('keeping places the resident at home and clones inherited parent identity', () => {
  const before = start({ ...createBoutiqueSave(), coins: 75 }, 'blueveil', 'keeper');
  before.activeRun.specimen.growth = 80;
  before.activeRun.specimen.inherited.parents = ['parent'];
  const after = settleRun(before, 'keeper', 'keep');
  assert.deepEqual(after.placements, { keeper: 'home' });
  assert.notEqual(after.kept[0].inherited, before.activeRun.specimen.inherited);
  assert.notEqual(after.kept[0].inherited.parents, before.activeRun.specimen.inherited.parents);
  assert.deepEqual(after.kept[0].inherited.parents, ['parent']);
});

test('legacy empty, resident and active saves retain meaningful data with home migration', () => {
  const fish = { id: 'old', name: 'Old Coral', species: 'guppy', growth: 81, health: 73, hunger: 62, traits: ['ornate', 'swift'], color: '#123456', accent: '#abcdef', raisedSeconds: 999 };
  const run = { ...fish, id: 'running' };
  const raw = { version: 1, coins: 123, sales: 4, kept: [fish], activeRun: { specimen: run, x: 321, y: 654, stamina: 56 }, completedRunIds: ['sold'] };
  const loaded = loadBoutique({ getItem: () => JSON.stringify(raw) });
  assert.equal(loaded.kept[0].origin, 'legacy');
  assert.deepEqual(loaded.kept[0], { ...fish, origin: 'legacy' });
  assert.deepEqual(loaded.activeRun, { ...raw.activeRun, specimen: { ...run, origin: 'legacy' } });
  assert.deepEqual(loaded.placements, { old: 'home' });
  assert.equal(loaded.coins, 123);
  assert.equal(loaded.sales, 4);
  assert.deepEqual(loaded.completedRunIds, ['sold']);
  const memory = storage();
  assert.equal(writeBoutique(loaded, memory), true);
  assert.deepEqual(loadBoutique(memory), loaded);
  const empty = loadBoutique({ getItem: () => JSON.stringify({ ...raw, kept: [], activeRun: null }) });
  assert.deepEqual(empty.placements, {});
});

const moduleUrls = new Map<string, string>();
async function moduleUrl(name: string): Promise<string> {
  if (moduleUrls.has(name)) return moduleUrls.get(name)!;
  let source = await readFile(new URL(`../src/games/importedAippy/upstream/src/utils/${name}.ts`, import.meta.url), 'utf8');
  source = source.replace(/import type[\s\S]*?;/g, '');
  for (const match of [...source.matchAll(/from ['"]@\/utils\/([^'"]+)['"]/g)]) {
    source = source.replace(match[0], `from ${JSON.stringify(await moduleUrl(match[1]))}`);
  }
  const url = `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`;
  moduleUrls.set(name, url);
  return url;
}

test('ordinary, fan and veil are visually distinct while legacy ornate fins retain their shape', async () => {
  const { applySpecimenAppearance } = await import(await moduleUrl('specimenAppearance'));
  const { createFish } = await import(await moduleUrl('fishModel'));
  const { STARTER } = await import(await moduleUrl('fishSpecies'));
  const render = (specimen: unknown) => {
    const fish = createFish(640, 480, 80);
    const palette = applySpecimenAppearance(fish, specimen);
    return { tr: fish.tr, palette };
  };
  const ordinary = render((createSpecimen as any)('ordinary', 'short'));
  const fan = render((createSpecimen as any)('sunburst', 'fan'));
  const veil = render((createSpecimen as any)('blueveil', 'veil'));
  assert.ok(ordinary.tr.tail.TH < fan.tr.tail.TH, 'fan must have a visibly broader tail');
  assert.ok(fan.tr.tail.TL < veil.tr.tail.TL, 'veil must have a visibly longer tail');
  assert.notDeepEqual(ordinary.palette, fan.palette);
  assert.notDeepEqual(fan.palette, veil.palette);
  const legacy = render({ ...createSpecimen(), origin: 'legacy', inherited: undefined, traits: ['ornate', 'ornate'] });
  assert.equal(legacy.tr.tail.TH, STARTER.tail.TH * 1.44);
  assert.equal(legacy.tr.tail.TL, STARTER.tail.TL * 1.24);
});
