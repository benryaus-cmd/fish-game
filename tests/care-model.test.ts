import test from 'node:test';
import assert from 'node:assert/strict';
import { createBoutiqueSave, createSpecimen, loadBoutique, settleRun, startResidentRun } from '../src/games/importedAippy/upstream/src/utils/boutique.ts';
import { ensureSpecimenCare, advanceSpecimenCare, feedSpecimen } from '../src/games/importedAippy/upstream/src/utils/specimenCare.ts';
import { initialiseCareProfile, advanceProfileCare, sampleWorldClock } from '../src/games/importedAippy/upstream/src/utils/worldClock.ts';
import { startBreeding, claimBreeding } from '../src/games/importedAippy/upstream/src/utils/breeding.ts';
const t = 1_000_000;
test('new fish require ten healthy minutes, meals alone cannot mature them, backward time is inert', () => {
  let fish = ensureSpecimenCare(createSpecimen('ordinary', 'fry'), t);
  fish = {...fish,care:{...fish.care!,nutrition:100}};
  assert.equal(fish.growth, 0);
  fish = advanceSpecimenCare(fish, t+599_000, 'growing');
  assert.ok(fish.growth < 75);
  assert.deepEqual(advanceSpecimenCare(fish, t, 'growing'), fish);
  fish = advanceSpecimenCare(fish, t+600_000, 'growing');
  assert.ok(fish.growth >= 75);
});
test('legacy mature fish retain maturity and long offline care never loses home fish', () => {
  const save = initialiseCareProfile({...createBoutiqueSave(), coins:123, kept:[{...createSpecimen('ordinary','adult'),growth:90}]},t);
  assert.ok(save.kept[0].care!.healthySeconds>=600);
  const later = advanceProfileCare(save,t+7*86400_000);
  assert.equal(later.coins,123); assert.equal(later.kept[0].growth,90); assert.ok(later.kept[0].health>=40);
  assert.equal(sampleWorldClock(save.worldClock!, t+300_000).phase,'night');
  assert.equal(sampleWorldClock(save.worldClock!, t+600_000).phase,'day');
  assert.equal(sampleWorldClock(later.worldClock!,t).elapsedSeconds,sampleWorldClock(later.worldClock!,t+7*86400_000).elapsedSeconds);
});
test('resident transfer round trips an immature individual across old completed IDs and rejects replay', () => {
  const fish=createSpecimen('ordinary','resident');
  const save={...createBoutiqueSave(),kept:[fish],completedRunIds:['resident']};
  const growing=startResidentRun(save,'resident','visit-1',t);
  assert.equal(growing.kept.length,0); assert.equal(growing.activeRun?.source,'resident');
  const loaded=loadBoutique({getItem:()=>JSON.stringify(growing)});
  assert.ok(loaded.activeRun);
  const returned=settleRun(loaded,'resident','keep');
  assert.equal(returned.kept.length,1); assert.equal(returned.kept[0].id,'resident');
  assert.equal(startResidentRun(returned,'resident','visit-1',t),returned);
  assert.ok(startResidentRun(returned,'resident','visit-2',t).activeRun);
});
test('breeding reserves mature parents and persists one free inherited offspring and one claim', () => {
  const parents=['a','b'].map((id,i)=>ensureSpecimenCare({...createSpecimen(i?'blueveil':'sunburst',id),growth:80,traits:['ornate']},t));
  const save=initialiseCareProfile({...createBoutiqueSave(),coins:55,kept:parents},t);
  const cycle=startBreeding(save,'a','b','cycle-1',t);
  assert.ok(cycle.breeding); assert.equal(cycle.coins,55);
  assert.equal(startResidentRun(cycle,'a','v',t),cycle);
  assert.equal(claimBreeding(cycle,t+119_999),cycle);
  const loaded=loadBoutique({getItem:()=>JSON.stringify(cycle)});
  const claimed=claimBreeding(loaded,t+120_000);
  assert.equal(claimed.kept.length,3); assert.deepEqual(claimed.kept[2].inherited?.parents,['a','b']);
  assert.deepEqual(claimed.kept[2].traits,[]); assert.equal(claimed.coins,55);
  assert.equal(claimBreeding(claimed,t+130_000),claimed);
  assert.equal(startBreeding(claimed,'a','b','cycle-1',t+130_000),claimed);
});

test('unhealthy and immature parents cannot breed; capacity includes the pending offspring', () => {
  const adult=ensureSpecimenCare({...createSpecimen('ordinary','a'),growth:80},t);
  const other={...adult,id:'b',health:69};
  const save={...createBoutiqueSave(),kept:[adult,other]};
  assert.equal(startBreeding(save,'a','b','bad',t),save);
  const juvenile={...save,kept:[adult,ensureSpecimenCare({...createSpecimen('ordinary','b'),growth:74},t)]};
  assert.equal(startBreeding(juvenile,'a','b','young',t),juvenile);
  const full={...save,kept:Array.from({length:100},(_,i)=>({...adult,id:String(i)}))};
  assert.equal(startBreeding(full,'0','1','full',t),full);
});

test('healthy time stops when unfed and real-time care is independent of invocation count', () => {
  const fish=ensureSpecimenCare(createSpecimen('ordinary','time'),t);
  const once=advanceSpecimenCare(fish,t+120_000,'growing');
  let many=fish;
  for(let i=1;i<=120;i++) many=advanceSpecimenCare(many,t+i*1000,'growing');
  assert.ok(Math.abs(many.care!.healthySeconds-once.care!.healthySeconds)<.0001);
  assert.ok(Math.abs(many.hunger-once.hunger)<.0001);
  const starving=advanceSpecimenCare({...fish,hunger:0},t+600_000,'growing');
  assert.equal(starving.care!.healthySeconds,0); assert.equal(starving.growth,0);
});

test('vitality improves meal efficiency without instant meal healing', () => {
  const base=ensureSpecimenCare({...createSpecimen('ordinary','vital'),hunger:30,health:60},t);
  const ordinary=feedSpecimen(base,'flake',t,'day');
  const vital=feedSpecimen({...base,traits:['vital']},'flake',t,'day');
  assert.ok(vital.hunger>ordinary.hunger); assert.equal(vital.health,ordinary.health);
  assert.equal(vital.growth,0); assert.equal(vital.care!.healthySeconds,15);
});

test('recovering fish receive identical healthy credit across coarse and frequent ticks', () => {
  const fish=ensureSpecimenCare({...createSpecimen('ordinary','recover'),health:59},t);
  const once=advanceSpecimenCare(fish,t+600_000,'growing');
  let many=fish;
  for(let i=1;i<=600;i++) many=advanceSpecimenCare(many,t+i*1000,'growing');
  assert.ok(Math.abs(once.care!.healthySeconds-many.care!.healthySeconds)<.001);
  assert.ok(Math.abs(once.health-many.health)<.001);
});

test('diet and shared clock phase remain explicit across backwards samples', () => {
  const fish=ensureSpecimenCare(createSpecimen('ordinary','diet'),t);
  assert.deepEqual(feedSpecimen(fish,'prey',t,'day'),fish);
  const hungry={...fish,hunger:0};
  assert.ok(feedSpecimen(hungry,'flake',t,'day').hunger>feedSpecimen(hungry,'flake',t,'night').hunger);
  const clock={startedAtMs:t,lastSeenMs:t+350_000};
  assert.equal(sampleWorldClock(clock,t+100_000).phase,'night');
});

test('world badge time tracks shared day boundaries; stock authors different feeding preferences', () => {
  const clock={startedAtMs:t,lastSeenMs:t};
  assert.equal(sampleWorldClock(clock,t).label,'D1 06:00');
  assert.equal(sampleWorldClock(clock,t+300_000).label,'D1 18:00');
  assert.equal(sampleWorldClock(clock,t+600_000).label,'D2 06:00');
  assert.equal(ensureSpecimenCare(createSpecimen('blueveil'),t).care!.feedingPreference,'night');
  assert.equal(ensureSpecimenCare(createSpecimen('sunburst'),t).care!.feedingPreference,'day');
});

test('backward breeding start uses last observed time and incubation grants no raising age', () => {
  const at=t+300_000;
  const parents=['a','b'].map(id=>ensureSpecimenCare({...createSpecimen('ordinary',id),growth:80},at));
  const save={...createBoutiqueSave(),kept:parents,worldClock:{startedAtMs:t,lastSeenMs:at}};
  const cycle=startBreeding(save,'a','b','monotonic',t);
  assert.equal(cycle.breeding!.startedAtMs,at); assert.equal(cycle.breeding!.readyAtMs,at+120_000);
  assert.equal(cycle.breeding!.offspring.care!.bornAtMs,at+120_000);
  const claimed=claimBreeding(cycle,at+120_000);
  assert.equal(claimed.kept[2].growth,0); assert.equal(claimed.kept[2].care!.healthySeconds,0);
  const seen={...cycle,worldClock:{startedAtMs:t,lastSeenMs:at+120_000}};
  assert.equal(claimBreeding(seen,t).kept.length,3);
});

test('saving and loading preserve acquired vitality alongside the other development choices', () => {
  const fish={...createSpecimen('ordinary','paths'),growth:80,traits:['ornate','vital'] as const};
  const profile={...createBoutiqueSave(),kept:[{...fish,traits:[...fish.traits]}]};
  const loaded=loadBoutique({getItem:()=>JSON.stringify(profile)});
  assert.deepEqual(loaded.kept[0].traits,['ornate','vital']);
});

test('recovery at full health cannot bank surplus against later starvation in a coarse gap', () => {
  const fish=ensureSpecimenCare(createSpecimen('ordinary','gap'),t);
  const once=advanceSpecimenCare(fish,t+2_000_000,'growing');
  let many=fish;
  for(let i=1;i<=2000;i++) many=advanceSpecimenCare(many,t+i*1000,'growing');
  assert.ok(Math.abs(once.health-many.health)<.001, `${once.health} differs from ${many.health}`);
});
