import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const utils = new URL('../src/games/importedAippy/upstream/src/utils/', import.meta.url);
const memo = new Map();
async function moduleURL(name) {
  if(memo.has(name)) return memo.get(name);
  let source = stripTypeScriptTypes(await readFile(new URL(`${name}.ts`, utils), 'utf8'));
  const paths = [...new Set([...source.matchAll(/['"]@\/utils\/([^'"]+)['"]/g)].map(m=>m[1]))];
  for(const path of paths) source=source.replaceAll(`'@/utils/${path}'`, JSON.stringify(await moduleURL(path)));
  const result=`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;memo.set(name,result); return result;
}
const {createBottomEcology,updateBottomEcology,biteShrimp,CRAB_WINDUP_SECONDS}=await import(await moduleURL('bottomEcology'));
const floor=()=>1580;
const player=(x,y=1550)=>({x,y,L:72,growth:40});
test('shrimp prey obeys growth and mouth size, and respawns in a bounded population',()=>{
 const state=createBottomEcology(); const s=state.shrimps[0]; const count=state.shrimps.length;
 assert.ok(count>=6&&count<=10); assert.equal(biteShrimp(state,s.rig,{L:72},34.9),false);
 assert.equal(biteShrimp(state,s.rig,{L:10},40),false);
 assert.equal(biteShrimp(state,s.rig,{L:72},40),true); assert.equal(s.active,false);
 updateBottomEcology(state,1,player(450),floor); assert.equal(s.active,false);
 for(let i=0;i<25;i++)updateBottomEcology(state,1,player(450),floor);
 assert.equal(s.active,true);assert.equal(state.shrimps.length,count);
});
test('crabs telegraph, stay local, disengage high fish and respect nursery and shelter',()=>{
 const state=createBottomEcology();const c=state.crabs[0];c.rig.x=c.homeX;
 assert.ok(CRAB_WINDUP_SECONDS>=.6);
 for(let i=0;i<10;i++)assert.equal(updateBottomEcology(state,.05,player(c.homeX),floor),null);
 assert.equal(c.phase,'windup');assert.ok(c.rig.claws.some(p=>p.open>.3&&p.a<-.6));
 let hits=0; const hitTimes=[];
 for(let i=0;i<100;i++){if(updateBottomEcology(state,.05,player(c.rig.x),floor)){hits++;hitTimes.push(i*.05);}assert.ok(Math.abs(c.rig.x-c.homeX)<=105);}
 assert.ok(hits>0&&hits<=3);
 for(let i=1;i<hitTimes.length;i++)assert.ok(hitTimes[i]-hitTimes[i-1]>=1.5);
 for(let i=0;i<80;i++)assert.equal(updateBottomEcology(state,.05,player(c.homeX,1100),floor),null);
 assert.notEqual(c.phase,'windup');
 for(let i=0;i<80;i++)assert.equal(updateBottomEcology(state,.05,{...player(c.homeX),inShelter:true},floor),null);
 for(let i=0;i<80;i++)assert.equal(updateBottomEcology(state,.05,player(450),floor),null);
 assert.ok(state.crabs.every(c=>c.homeX-105>720));
});

test('swimming over shrimp never eats them without an explicit bite call',()=>{
 const state=createBottomEcology();const s=state.shrimps[0];
 for(let i=0;i<80;i++)updateBottomEcology(state,.05,player(s.rig.x,s.rig.y),floor);
 assert.ok(state.shrimps.every(s=>s.active));
});
