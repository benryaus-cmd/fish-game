import test from 'node:test';
import assert from 'node:assert/strict';
import { appraiseFish, createBoutiqueSave, createSpecimen, getStage, loadBoutique, settleRun, writeBoutique, sellOwnedFish, ownedFishCount, NURSERY_CAPACITY, purchaseStockRun, selectResidentRun, rewardShrimpCatch, startStockRun, startResidentRun } from '../src/games/importedAippy/upstream/src/utils/boutique.ts';
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

test('stale IDs cannot settle and starter sales release ownership without earning value', () => {
  const save = liveSave(0);
  assert.equal(appraiseFish(save.activeRun!.specimen), 0);
  assert.equal(settleRun(save, save.activeRun!.specimen.id, 'sell').activeRun, null);
  assert.deepEqual(settleRun(save, save.activeRun!.specimen.id, 'keep'), save);
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

test('ten ownership slots include active fish and reserved fry, but resident transfers stay available', () => {
  assert.equal(NURSERY_CAPACITY, 10);
  const fish = Array.from({length:10}, (_,i) => ({...createSpecimen('ordinary',`slot-${i}`),growth:80}));
  const full = {...createBoutiqueSave(), coins:1000, kept:fish};
  assert.equal(ownedFishCount(full),10);
  assert.equal(startStockRun(full,'ordinary','purchase'),full);
  const swim = startResidentRun(full,fish[0].id,'visit',1_000_000);
  assert.equal(ownedFishCount(swim),10);
  assert.equal(swim.kept.length,9);
  assert.equal(settleRun(swim,fish[0].id,'keep').kept.length,10);
  const reserved = {...full, kept:fish.slice(0,9), breeding:{id:'cycle',parentIds:[fish[0].id,fish[1].id] as [string,string],startedAtMs:1,readyAtMs:120001,offspring:createSpecimen('ordinary','child')}};
  assert.equal(ownedFishCount(reserved),10);
  assert.equal(startStockRun(reserved,'ordinary','purchase'),reserved);
  const free = {...full, kept:fish.slice(0,9)};
  assert.equal(ownedFishCount(startStockRun(free,'ordinary','purchase')),10);
});

test('legacy saves above capacity preserve every fish, active run and reserved offspring through writes', () => {
  const kept = Array.from({length:105}, (_,i)=>createSpecimen('ordinary',`legacy-${i}`));
  const save = {...createBoutiqueSave(),coins:900,kept,activeRun:{specimen:createSpecimen('ordinary','active'),x:1,y:2,stamina:100},breeding:{id:'legacy-cycle',parentIds:['legacy-0','legacy-1'] as [string,string],startedAtMs:1,readyAtMs:120001,offspring:createSpecimen('ordinary','legacy-child')}};
  const storage = memoryStorage();
  assert.ok(writeBoutique(save,storage));
  const loaded = loadBoutique(storage);
  assert.equal(loaded.kept.length,105);
  assert.equal(loaded.activeRun!.specimen.id,'active');
  assert.equal(loaded.breeding!.offspring.id,'legacy-child');
  assert.equal(ownedFishCount(loaded),107);
});

test('selling a kept parent pays once, removes placement and cancels its reserved cycle', () => {
  const parent = {...createSpecimen('ordinary','parent'),growth:80};
  const other = createSpecimen('ordinary','other');
  const active = {specimen:createSpecimen('ordinary','swimmer'),x:1,y:2,stamina:100};
  const before = {...createBoutiqueSave(),coins:12,kept:[parent,other],activeRun:active,placements:{parent:'home' as const,other:'home' as const},completedRunIds:['parent'],breeding:{id:'cycle',parentIds:['parent','other'] as [string,string],startedAtMs:1,readyAtMs:120001,offspring:createSpecimen('ordinary','child')}};
  const sold = sellOwnedFish(before,'parent');
  assert.equal(sold.coins,12+appraiseFish(parent));
  assert.equal(sold.sales,1);
  assert.deepEqual(sold.kept,[other]);
  assert.deepEqual(sold.placements,{other:'home'});
  assert.equal(sold.activeRun,active);
  assert.equal(sold.breeding,null);
  assert.ok(sold.completedRunIds.includes('sale:parent'));
  assert.ok(sold.completedRunIds.includes('cycle'));
  assert.equal(sellOwnedFish(sold,'parent'),sold);
  assert.equal(sellOwnedFish({...sold,kept:[parent,other]},'parent').coins,sold.coins);
  const restored = loadBoutique({getItem:()=>JSON.stringify({...sold,kept:[parent,other]})});
  assert.deepEqual(restored.kept,[other]);
  assert.equal(before.kept.length,2);
  assert.ok(before.breeding);
});

test('sales work at fry, juvenile and adult growth for stock and resident sessions', () => {
  for (const growth of [0,9,35,80]) {
    const save = liveSave(growth);
    const fish = save.activeRun!.specimen;
    const sold = sellOwnedFish(save,fish.id);
    assert.equal(sold.activeRun,null);
    assert.equal(sold.coins,appraiseFish(fish));
    assert.equal(sold.sales,1);
    const resident = {...save,activeRun:{...save.activeRun!,source:'resident' as const,visitId:'resident-visit'},completedRunIds:[fish.id]};
    const soldResident = settleRun(resident,'resident-visit','sell');
    assert.equal(soldResident.activeRun,null);
    assert.equal(soldResident.coins,appraiseFish(fish));
    assert.ok(soldResident.completedRunIds.includes('resident-visit'));
    const restored = {...soldResident,activeRun:resident.activeRun};
    assert.equal(sellOwnedFish(restored,fish.id),restored);
    assert.equal(loadBoutique({getItem:()=>JSON.stringify(restored)}).activeRun,null);
  }
});

test('View purchase preserves an active fry and starts new stock atomically',()=>{
 const before={...liveSave(0),coins:100},id=before.activeRun!.specimen.id;
 const after=purchaseStockRun(before,'sunburst','next-fish',1000000);
 assert.equal(after.coins,60);assert.equal(after.kept[0].id,id);assert.equal(after.kept[0].growth,0);assert.equal(after.activeRun!.specimen.id,'next-fish');assert.equal(after.sales,0);
 const storage=memoryStorage();writeBoutique(after,storage);const restored=loadBoutique(storage);assert.equal(restored.kept[0].id,id);assert.equal(restored.activeRun!.specimen.id,'next-fish');
 assert.equal(purchaseStockRun(before,'rainbowangel','expensive',1000000),before);
 const full={...before,kept:Array.from({length:9},(_,i)=>createSpecimen('ordinary',`full-${i}`))};assert.equal(purchaseStockRun(full,'ordinary','eleventh'),full);
});
test('selecting a kept adult preserves the earlier active individual and total ownership',()=>{
 const adult={...createSpecimen('ordinary','adult-to-swim'),growth:80};const before={...liveSave(0),kept:[adult]};
 const after=selectResidentRun(before,adult.id,'new-visit',1000000);
 assert.equal(after.activeRun!.specimen.id,adult.id);assert.equal(after.kept[0].id,before.activeRun!.specimen.id);assert.equal(ownedFishCount(after),ownedFishCount(before));assert.equal(after.coins,before.coins);
});
test('shrimp reward checkpoints live care and exactly one credit without changing sales',()=>{
 const before={...liveSave(),coins:20};const active={...before.activeRun!,specimen:{...before.activeRun!.specimen,hunger:95,health:90}};
 const after=rewardShrimpCatch(before,active);assert.equal(after.coins,21);assert.equal(after.activeRun!.specimen.hunger,95);assert.equal(after.sales,0);assert.equal(before.coins,20);
 const storage=memoryStorage();writeBoutique(after,storage);assert.equal(loadBoutique(storage).coins,21);
 assert.equal(rewardShrimpCatch({...before,activeRun:null},active).activeRun,null);
 assert.equal(rewardShrimpCatch(before,{...active,visitId:'stale-visit'}),before);
});
