import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpecimen,createBoutiqueSave,loadBoutique,finishDeath,appraiseFish} from '../src/games/importedAippy/upstream/src/utils/boutique.ts';
import {ensureSpecimenCare,advanceSpecimenCare,feedSpecimen,chooseDevelopment} from '../src/games/importedAippy/upstream/src/utils/specimenCare.ts';
import {buyTankPellets,cleanTank,advanceTankCare,PELLET_PRICE,CLEAN_PRICE} from '../src/games/importedAippy/upstream/src/utils/tankCare.ts';
const t=1_000_000;
const fry=()=>ensureSpecimenCare(createSpecimen('ordinary','fish'),t);
test('present milestones queue choices once, requiring exact distinct selections',()=>{
 const fish=advanceSpecimenCare(fry(),t+300_000,'home','present');
 const pending=fish.care!.development!.pending[0]; assert.equal(pending.stage,35); assert.equal(pending.slots,3); assert.equal(new Set(pending.options).size,4);
 assert.equal(chooseDevelopment(fish,35,['swift']),fish);
 const chosen=chooseDevelopment(fish,35,pending.options.slice(0,3)); assert.equal(chosen.traits.length,3); assert.equal(chosen.care!.development!.pending.length,0);
 assert.equal(chooseDevelopment(chosen,35,pending.options.slice(0,3)),chosen);
});
test('away milestone awards are deterministic and coarse elapsed matches frames',()=>{
 const nourished={...fry(),care:{...fry().care!,nutrition:100}}; const once=advanceSpecimenCare(nourished,t+600_000,'home','away'); let frames=nourished;
 for(let i=1;i<=600;i++) frames=advanceSpecimenCare(frames,t+i*1000,'home','away');
 assert.deepEqual(once.traits,frames.traits); assert.deepEqual(once.care!.development,frames.care!.development); assert.ok(once.traits.length>=4);
});
test('legacy adult migration never awards forgotten milestones and persists six traits',()=>{
 const old=ensureSpecimenCare({...createSpecimen('ordinary','old'),growth:90,traits:['swift','ornate','vital','vibrancy','swift','vital']},t);
 const later=advanceSpecimenCare(old,t+300_000,'home'); assert.deepEqual(later.traits,old.traits); assert.deepEqual(later.care!.development!.resolvedStages,[35,75]);
 const loaded=loadBoutique({getItem:()=>JSON.stringify({...createBoutiqueSave(),kept:[later]})}); assert.deepEqual(loaded.kept[0].traits,later.traits); assert.ok(appraiseFish(later)>appraiseFish({...later,traits:[]}));
});
test('all eligible meals add bounded age, overfeeding trades health for growth credit',()=>{
 const base={...fry(),hunger:70,health:80}; const meal=feedSpecimen(base,'flake',t); assert.ok(meal.care!.healthySeconds>0); assert.equal(meal.health,80);
 const full={...fry(),health:80}; const over=feedSpecimen(full,'flake',t); assert.ok(over.health<80); assert.equal(over.care!.healthySeconds,15);
 let spam=fry(); for(let i=0;i<40;i++) spam=feedSpecimen(spam,'flake',t); assert.ok(spam.growth<75);
 const credited={...fry(),care:{...fry().care!,healthySeconds:600,nutrition:100}}; assert.ok(advanceSpecimenCare(credited,t+449_000,'home').growth<75); assert.ok(advanceSpecimenCare(credited,t+450_000,'home').growth>=75);
});
test('dead home fish stay dead and death closes resident history and breeding once',()=>{
 const dead={...fry(),health:0}; assert.equal(advanceSpecimenCare(dead,t+10_000,'home').health,0);
 const living={...createBoutiqueSave(),kept:[fry()]}; assert.equal(finishDeath(living,'fish',t),living);
 const save={...createBoutiqueSave(),placements:{fish:'home' as const},activeRun:{specimen:dead,x:0,y:0,stamina:0,source:'resident' as const,visitId:'visit'}};
 const ended=finishDeath(save,'fish',t); assert.equal(ended.activeRun,null); assert.deepEqual(ended.completedRunIds,['death:fish','visit']); assert.deepEqual(ended.placements,{}); assert.equal(finishDeath(ended,'fish',t),ended);
});
test('tank purchases and cleaning debit atomically and dirt survives reload',()=>{
 const save={...createBoutiqueSave(),coins:20,kept:[{...fry(),hunger:70}]};
 assert.equal(buyTankPellets({...save,coins:PELLET_PRICE-1},'fish',t).coins,PELLET_PRICE-1); assert.equal(buyTankPellets(save,'missing',t),save);
 const bought=buyTankPellets(save,'fish',t); assert.equal(bought.coins,20-PELLET_PRICE); assert.equal(bought.tankCare!.pellets,1); assert.ok(bought.kept[0].hunger>70);
 const dirty=advanceTankCare(bought,t+600_000); assert.ok(dirty.tankCare!.dirt>0); const loaded=loadBoutique({getItem:()=>JSON.stringify(dirty)}); assert.deepEqual(loaded.tankCare,dirty.tankCare);
 const clean=cleanTank(dirty,true,t+600_000); assert.equal(clean.coins,20-PELLET_PRICE-CLEAN_PRICE); assert.equal(clean.tankCare!.dirt,0); assert.equal(cleanTank(clean,true,t+600_000),clean);
});
test('pending choices roundtrip and an away return resolves them once even without a new tick',()=>{
 const present=advanceSpecimenCare(fry(),t+300_000,'home','present');
 const save={...createBoutiqueSave(),kept:[present]};
 const loaded=loadBoutique({getItem:()=>JSON.stringify(save)}).kept[0]; assert.deepEqual(loaded.care!.development,present.care!.development);
 const away=advanceSpecimenCare(loaded,t+300_000,'home','away'); assert.equal(away.care!.development!.pending.length,0); assert.equal(away.traits.length,present.care!.development!.pending[0].slots);
 assert.deepEqual(advanceSpecimenCare(away,t+300_000,'home','away'),away);
});
test('active fish pellet purchase feeds the same identity and dead fish cannot spend',()=>{
 const specimen={...fry(),hunger:70}; const save={...createBoutiqueSave(),coins:15,activeRun:{specimen,x:1,y:2,stamina:80}};
 const after=buyTankPellets(save,'fish',t); assert.equal(after.coins,10); assert.equal(after.activeRun!.specimen.id,'fish'); assert.ok(after.activeRun!.specimen.hunger>70);
 const dead={...save,activeRun:{...save.activeRun,specimen:{...specimen,health:0}}}; assert.equal(buyTankPellets(dead,'fish',t),dead);
});
test('legacy choices infer already earned stages without rerolling their traits',()=>{
 const legacy={...createSpecimen('ordinary','legacy-choice'),growth:35,traits:['swift','ornate'] as ('swift'|'ornate')[]};
 assert.deepEqual(ensureSpecimenCare(legacy,t).care!.development!.resolvedStages,[35,75]);
});
test('starvation stores a death timestamp and cleanup cancels a reserved parent cycle',()=>{
 const dead=advanceSpecimenCare({...fry(),health:1,hunger:0},t+60_000,'growing'); assert.equal(dead.health,0); assert.equal(dead.deathAtMs,t+30_000);
 const save={...createBoutiqueSave(),kept:[dead],breeding:{id:'cycle',parentIds:['fish','other'] as [string,string],startedAtMs:t,readyAtMs:t+120_000,offspring:createSpecimen('ordinary','child')}};
 assert.equal(finishDeath(save,'fish',t+60_000).breeding,null);
});
test('present profile ticks and explicit pellets preserve earned pending development', async()=>{
 const {advanceProfileCare}=await import('../src/games/importedAippy/upstream/src/utils/worldClock.ts');
 const pending=advanceSpecimenCare(fry(),t+300_000,'home','present');
 const save={...createBoutiqueSave(),coins:10,kept:[pending]};
 const shown=advanceProfileCare(save,t+301_000,false,'present'); assert.deepEqual(shown.kept[0].care!.development!.pending,pending.care!.development!.pending);
 const fed=buyTankPellets(shown,'fish',t+301_000); assert.deepEqual(fed.kept[0].care!.development!.pending,pending.care!.development!.pending);
 const away=advanceProfileCare(shown,t+302_000,false,'away'); assert.equal(away.kept[0].care!.development!.pending.length,0); assert.ok(away.kept[0].traits.length>0);
});
test('death history prevents restored active or owned fish from resurrecting on reload',()=>{
 const save={...createBoutiqueSave(),completedRunIds:['death:fish'],kept:[fry()],activeRun:{specimen:{...fry(),id:'other'},x:0,y:0,stamina:1}};
 const loaded=loadBoutique({getItem:()=>JSON.stringify(save)}); assert.equal(loaded.kept.length,0);
 const active=loadBoutique({getItem:()=>JSON.stringify({...save,kept:[],activeRun:{...save.activeRun,specimen:fry()}})}); assert.equal(active.activeRun,null);
});
test('new outing stock starts hungry enough for its first worthwhile bite', async()=>{
 const {startStockRun}=await import('../src/games/importedAippy/upstream/src/utils/boutique.ts');
 const save=startStockRun({...createBoutiqueSave(),coins:1000},'ordinary','first-bite',t); assert.equal(save.activeRun!.specimen.hunger,70);
 const fed=feedSpecimen(save.activeRun!.specimen,'flake',t); assert.equal(fed.health,100); assert.ok(fed.care!.nutrition>save.activeRun!.specimen.care!.nutrition);
});
test('eating algae cleans only part of the glass for free and preserves owned fish', async()=>{
 const {grazeTankAlgae}=await import('../src/games/importedAippy/upstream/src/utils/tankCare.ts');
 const fish=fry(),save={...createBoutiqueSave(),coins:42,kept:[fish],tankCare:{dirt:40,lastUpdatedMs:t,pellets:2}};
 const cleaned=grazeTankAlgae(save,t);assert.equal(cleaned.tankCare!.dirt,35);assert.equal(cleaned.coins,42);assert.deepEqual(cleaned.kept,[fish]);assert.equal(cleaned.tankCare!.pellets,2);
 assert.equal(grazeTankAlgae({...save,tankCare:{...save.tankCare,dirt:2}},t).tankCare!.dirt,0);
});
test('Vitality increases feeding growth credit even when the fish is full',()=>{
 const full={...fry(),hunger:100,health:100};
 const normal=feedSpecimen(full,'flake',t),vital=feedSpecimen({...full,traits:['vital']},'flake',t);
 assert.ok(Math.abs(vital.care!.healthySeconds-normal.care!.healthySeconds*1.12)<1e-8);
 assert.ok(vital.health<100);assert.equal(vital.hunger,100);
});

test('blue food restores five health without fullness penalties or growth credit',()=>{
 const full={...fry(),health:60,hunger:100};const healed=feedSpecimen(full,'blue',t);
 assert.equal(healed.health,65);assert.equal(healed.hunger,100);assert.equal(healed.care!.healthySeconds,full.care!.healthySeconds);
 assert.equal(feedSpecimen({...full,health:98},'blue',t).health,100);
 assert.equal(feedSpecimen({...full,health:0},'blue',t).health,0);
});
