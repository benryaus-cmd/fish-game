import test from 'node:test';
import assert from 'node:assert/strict';
import * as catalog from '../src/games/importedAippy/upstream/src/utils/stockCatalog.ts';
import { createBoutiqueSave, createSpecimen, loadBoutique, writeBoutique } from '../src/games/importedAippy/upstream/src/utils/boutique.ts';
import { startBreeding, claimBreeding, breedingEligibility } from '../src/games/importedAippy/upstream/src/utils/breeding.ts';
import * as care from '../src/games/importedAippy/upstream/src/utils/specimenCare.ts';
const at = 1_000_000;
const roundTrip = (save) => { let json=''; assert.ok(writeBoutique(save,{setItem:(_key,value)=>{json=value;}})); return loadBoutique({getItem:()=>json}); };
test('authored stock exposes three bodies and persists all seven families', () => {
  assert.equal(catalog.STOCK_CATALOG.length,7);
  const fish = catalog.STOCK_CATALOG.map(stock=>createSpecimen(stock.id,stock.id));
  const loaded=roundTrip({...createBoutiqueSave(),kept:fish});
  assert.deepEqual(loaded.kept,fish);
  assert.deepEqual(catalog.STOCK_CATALOG.slice(3).map(s=>[s.id,s.price,s.bodyShape,s.finStyle,s.colorPattern,s.species]),[
    ['rainbow',80,'colorful','triangle','rainbow','tropical'],['neon',110,'colorful','triangle','banded','tropical'],
    ['pearlangel',160,'angel','sail','banded','angelfish'],['koiangel',200,'angel','sail','koi','angelfish'],
  ]);
});
test('hybrid draws each axis once, preserves it across reload and claims once', () => {
  const parents=['a','b'].map((id,i)=>care.ensureSpecimenCare({...createSpecimen(i?'koiangel':'rainbow',id),growth:80},at));
  const save={...createBoutiqueSave(),kept:parents};
  assert.ok(breedingEligibility(save,'a','b',at).eligible);
  const original=Math.random; const values=[.9,.1,.9,.1,.9]; let calls=0;
  Math.random=()=>values[calls++] ?? .9;
  let cycle;
  try { cycle=startBreeding(save,'a','b','hybrid',at); } finally { Math.random=original; }
  const child=cycle.breeding.offspring;
  assert.equal(calls,5);
  assert.deepEqual(child.inherited,{colorFamily:parents[0].inherited.colorFamily,finForm:parents[1].inherited.finForm,parents:['a','b'],bodyShape:'angel',finStyle:'triangle',colorPattern:'koi'});
  assert.equal(child.species,'angelfish'); assert.match(child.name,/hybrid/i); assert.equal(child.color,parents[0].color);
  const loaded=roundTrip(cycle); assert.deepEqual(loaded.breeding.offspring,child);
  const claimed=claimBreeding(loaded,at+120000); assert.equal(claimed.kept.length,3); assert.equal(claimBreeding(claimed,at+120001),claimed);
  assert.equal(startBreeding(cycle,'a','b','second',at),cycle);
});
test('legacy fish survive migration and invalid new axes are discarded individually', () => {
  const legacy={...createSpecimen('ordinary','old'),inherited:{colorFamily:'warm',finForm:'veil',parents:['mum']}};
  const invalid={...createSpecimen('koiangel','bad'),inherited:{...createSpecimen('koiangel','bad').inherited,bodyShape:'bogus',finStyle:'bogus',colorPattern:'bogus'}};
  const loaded=roundTrip({...createBoutiqueSave(),kept:[legacy,invalid]});
  assert.equal(loaded.kept.length,2); assert.deepEqual(loaded.kept[0].inherited,legacy.inherited);
  assert.equal(catalog.specimenBodyShape(loaded.kept[0]),'starter'); assert.equal(catalog.specimenFinStyle(loaded.kept[0]),'rounded'); assert.equal(catalog.specimenPattern(loaded.kept[0]),'solid');
  assert.equal(loaded.kept[1].inherited.bodyShape,undefined); assert.equal(catalog.specimenBodyShape(loaded.kept[1]),'angel');
});
test('healthy care slowly reveals colour and condition dulling is reversible without changing heredity', () => {
  let fed=care.ensureSpecimenCare(createSpecimen('rainbow','fed'),at);
  const neglected=care.advanceSpecimenCare({...fed,hunger:0,health:40},at+600000,'home');
  for(let i=0;i<5;i++) fed=care.feedSpecimen(fed,'flake',at);
  fed=care.advanceSpecimenCare(fed,at+600000,'home');
  assert.ok(care.careColourQuality(fed)>care.careColourQuality(neglected));
  assert.ok(care.careColourQuality(fed)>care.careColourQuality(care.ensureSpecimenCare(createSpecimen('rainbow','new'),at)));
  const dull={...fed,health:40,hunger:0}; assert.ok(care.careColourQuality(dull)<care.careColourQuality(fed));
  assert.equal(care.careColourQuality({...dull,health:fed.health,hunger:fed.hunger}),care.careColourQuality(fed));
  assert.deepEqual(fed.inherited,neglected.inherited);
  assert.deepEqual(roundTrip({...createBoutiqueSave(),kept:[fed]}).kept[0].care,fed.care);
  const old={...createSpecimen('ordinary','legacy'),inherited:{colorFamily:'silver',finForm:'short',parents:[]}};
  assert.equal(care.careColourQuality(old),1);
});
