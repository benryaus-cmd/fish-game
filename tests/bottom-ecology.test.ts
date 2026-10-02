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
test('crabs wind up then hop with one hit per attack and a two second cooldown',()=>{
 const state=createBottomEcology();const c=state.crabs[0];let hits=0;const times=[];let airborne=0;
 for(let i=0;i<180;i++){
  const damage=updateBottomEcology(state,.05,player(c.rig.x,1540),floor);
  if(damage){hits++;times.push(i*.05);}
  airborne=Math.max(airborne,1580-c.rig.cy);
  assert.ok(c.rig.x>=800&&c.rig.x<=3500);
 }
 assert.ok(airborne>200);assert.ok(hits>0&&hits<=3);
 for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]>=2);
});
test('crabs cannot attack the nursery but castle shelter does not stop their windup',()=>{
 const state=createBottomEcology();const c=state.crabs[0];
 for(let i=0;i<50;i++)assert.equal(updateBottomEcology(state,.05,player(450),floor),null);
 updateBottomEcology(state,.05,{...player(c.rig.x),inShelter:true},floor);
 assert.equal(c.phase,'windup');
});
test('neutral viewing disables crab attacks while allowing roaming beyond old home bounds',()=>{
 const state=createBottomEcology();const c=state.crabs[0];c.rig.mode='walk';c.rig.tx=2800;c.rig.dir=1;
 const start=c.rig.x;
 for(let i=0;i<500;i++)assert.equal(updateBottomEcology(state,.05,player(c.rig.x),floor,{damageEnabled:false}),null);
 assert.equal(c.phase,'idle');assert.ok(c.rig.x>start+105);
});
test('shrimp occupy the water column and dodge quickly away from an approaching fish',()=>{
 const state=createBottomEcology();assert.ok(state.shrimps.some(s=>s.rig.y<500));assert.ok(state.shrimps.some(s=>s.rig.y>1200));
 const s=state.shrimps[0];const x=s.rig.x,y=s.rig.y;
 updateBottomEcology(state,.1,player(x-20,y),floor);
 assert.ok(s.rig.x>x+15);assert.ok(Math.hypot(s.rig.vx,s.rig.vy)>120);
 for(let i=0;i<300;i++)updateBottomEcology(state,.05,player(450,1500),floor);
 for(const prey of state.shrimps){assert.ok(prey.rig.y>=80&&prey.rig.y<=1580);for(const v of [prey.rig.x,prey.rig.y,prey.rig.vx,prey.rig.vy])assert.ok(Number.isFinite(v));}
});

test('swimming over shrimp never eats them without an explicit bite call',()=>{
 const state=createBottomEcology();const s=state.shrimps[0];
 for(let i=0;i<80;i++)updateBottomEcology(state,.05,player(s.rig.x,s.rig.y),floor);
 assert.ok(state.shrimps.every(s=>s.active));
});

// The larger arc can reach fish formerly outside the old floor band.
test('crab telegraph reaches the new higher hop band',()=>{
 const state=createBottomEcology();const c=state.crabs[0];
 updateBottomEcology(state,.05,player(c.rig.x,1320),floor);
 assert.equal(c.phase,'windup');
 let peak=0,hits=0;
 for(let i=0;i<45;i++){
  if(updateBottomEcology(state,.05,player(c.rig.x,1320),floor))hits++;
  peak=Math.max(peak,c.hopHeight);
 }
 assert.ok(peak>200&&peak<=210);assert.equal(hits,1);
});

test('jump raises both articulated claws after its one-claw warning',()=>{
 const state=createBottomEcology(),crab=state.crabs[0];
 for(let i=0;i<30&&crab.phase!=='lunge';i++)updateBottomEcology(state,.05,player(crab.rig.x,1470),floor);
 assert.equal(crab.phase,'lunge');
 for(let i=0;i<4;i++)updateBottomEcology(state,.05,player(crab.rig.x,1470),floor);
 assert.ok(crab.hopHeight>0);
 for(const claw of crab.rig.claws){assert.ok(claw.y<-.15,'both wrists rise above the shell');assert.ok(claw.open>.3);}
});
