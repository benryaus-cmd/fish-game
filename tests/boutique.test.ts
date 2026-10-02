import test from 'node:test';
import assert from 'node:assert/strict';
import { appraiseFish, createBoutiqueSave, createSpecimen, getStage, loadBoutique, settleRun, writeBoutique } from '../src/games/importedAippy/upstream/src/utils/boutique.ts';
import type { BoutiqueSave } from '../src/games/importedAippy/upstream/src/utils/boutique.ts';

function liveSave(growth = 80): BoutiqueSave {
  const specimen = { ...createSpecimen(), growth, traits: ['ornate'] as const };
  return { ...createBoutiqueSave(), activeRun: { specimen: { ...specimen, traits: [...specimen.traits] }, x: 120, y: 250, stamina: 80 } };
}
function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

test('sale pays the appraisal once and leaves the input unchanged', () => {
  const before = liveSave();
  const id = before.activeRun!.specimen.id;
  const after = settleRun(before, id, 'sell');
  assert.equal(after.coins, appraiseFish(before.activeRun!.specimen));
  assert.equal(after.sales, 1);
  assert.equal(after.activeRun, null);
  assert.deepEqual(after.completedRunIds, [id]);
  assert.equal(before.coins, 0);
  assert.ok(before.activeRun);
  assert.deepEqual(settleRun(after, id, 'sell'), after);
  assert.deepEqual(settleRun({ ...after, activeRun: before.activeRun }, id, 'sell'), { ...after, activeRun: before.activeRun });
});

test('keeping preserves the full individual without paying coins', () => {
  const before = liveSave();
  const specimen = before.activeRun!.specimen;
  const after = settleRun(before, specimen.id, 'keep');
  assert.equal(after.coins, 0);
  assert.equal(after.sales, 0);
  assert.deepEqual(after.kept, [specimen]);
  assert.notEqual(after.kept[0], specimen);
  assert.notEqual(after.kept[0].traits, specimen.traits);
  assert.equal(after.activeRun, null);
});

test('stale IDs and untouched starter fish cannot settle or earn value', () => {
  const save = liveSave(0);
  assert.equal(appraiseFish(save.activeRun!.specimen), 0);
  assert.deepEqual(settleRun(save, save.activeRun!.specimen.id, 'sell'), save);
  const grown = liveSave();
  assert.deepEqual(settleRun(grown, 'stale', 'sell'), grown);
  assert.deepEqual(settleRun(grown, 'stale', 'keep'), grown);
});

test('one JSON profile round-trips the payout and ended run together', () => {
  const storage = memoryStorage();
  const save = liveSave();
  assert.ok(writeBoutique(save, storage));
  assert.deepEqual(loadBoutique(storage), save);
  const sold = settleRun(save, save.activeRun!.specimen.id, 'sell');
  assert.ok(writeBoutique(sold, storage));
  assert.deepEqual(loadBoutique(storage), sold);
  assert.deepEqual(settleRun(loadBoutique(storage), save.activeRun!.specimen.id, 'sell'), sold);
});

test('bad JSON, unknown versions, and inaccessible storage recover safely', () => {
  for (const value of ['{broken', 'null', '{"version":2}', '{"version":1,"coins":"lots"}']) {
    assert.deepEqual(loadBoutique({ getItem: () => value }), createBoutiqueSave());
  }
  assert.deepEqual(loadBoutique({ getItem: () => { throw new Error('blocked'); } }), createBoutiqueSave());
  assert.equal(writeBoutique(createBoutiqueSave(), { setItem: () => { throw new Error('full'); } }), false);
});

test('loaded numbers are bounded and duplicate or ended specimens are removed', () => {
  const save = liveSave();
  const fish = save.activeRun!.specimen;
  const raw = { ...save, coins: -200, sales: 1e20, kept: [fish, fish], activeRun: { ...save.activeRun, specimen: { ...fish, id: 'live', growth: 999, health: -10, hunger: 120, raisedSeconds: -40, traits: ['swift', 'swift', 'invalid'], color: '<bad>' }, x: Infinity, y: -9999, stamina: 999 }, completedRunIds: ['ended', 'ended'] };
  const loaded = loadBoutique({ getItem: () => JSON.stringify(raw) });
  assert.equal(loaded.coins, 0);
  assert.ok(loaded.sales <= 1e6);
  assert.equal(loaded.kept.length, 1);
  assert.deepEqual(loaded.completedRunIds, ['ended']);
  assert.equal(loaded.activeRun!.specimen.growth, 100);
  assert.equal(loaded.activeRun!.specimen.health, 0);
  assert.equal(loaded.activeRun!.specimen.hunger, 100);
  assert.equal(loaded.activeRun!.specimen.raisedSeconds, 0);
  assert.deepEqual(loaded.activeRun!.specimen.traits, ['swift', 'swift']);
  assert.match(loaded.activeRun!.specimen.color, /^#[a-f0-9]{6}$/i);
  assert.ok(Number.isFinite(loaded.activeRun!.x));
  assert.ok(loaded.activeRun!.y >= 0);
  assert.equal(loaded.activeRun!.stamina, 100);
  const ended = { ...save, completedRunIds: [fish.id] };
  assert.equal(loadBoutique({ getItem: () => JSON.stringify(ended) }).activeRun, null);
});

test('stage boundaries and appraisal reward development and condition', () => {
  assert.deepEqual([0, 34, 35, 74, 75, 100].map(getStage), ['fry', 'fry', 'juvenile', 'juvenile', 'adult', 'adult']);
  const specimen = createSpecimen();
  assert.notEqual(specimen.id, createSpecimen().id);
  assert.ok(appraiseFish({ ...specimen, growth: 80 }) > appraiseFish({ ...specimen, growth: 35 }));
  assert.ok(appraiseFish({ ...specimen, growth: 80, traits: ['ornate'] }) > appraiseFish({ ...specimen, growth: 80 }));
  assert.ok(appraiseFish({ ...specimen, growth: 80 }) > appraiseFish({ ...specimen, growth: 80, health: 20 }));
});

test('both growth choices can repeat an adaptation and each earns its premium', () => {
  const save = liveSave();
  const fish = save.activeRun!.specimen;
  fish.traits = ['ornate', 'ornate'];
  const storage = memoryStorage();
  assert.ok(writeBoutique(save, storage));
  assert.deepEqual(loadBoutique(storage).activeRun!.specimen.traits, ['ornate', 'ornate']);
  assert.equal(appraiseFish(fish) - appraiseFish({ ...fish, traits: ['ornate'] }), 24);
  const swift = { ...fish, traits: ['swift', 'swift'] as ('swift')[] };
  assert.equal(appraiseFish(swift) - appraiseFish({ ...swift, traits: ['swift'] }), 12);
  const overfull = { ...save, activeRun: { ...save.activeRun!, specimen: { ...fish, traits: ['ornate', 'invalid', 'swift', 'ornate'] } } };
  assert.deepEqual(loadBoutique({ getItem: () => JSON.stringify(overfull) }).activeRun!.specimen.traits, ['ornate', 'swift', 'ornate']);
});
