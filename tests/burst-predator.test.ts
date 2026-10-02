import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const utils = new URL('../src/games/importedAippy/upstream/src/utils/', import.meta.url);
const memo = new Map();
async function moduleURL(name) {
  if (memo.has(name)) return memo.get(name);
  let source = stripTypeScriptTypes(await readFile(new URL(`${name}.ts`, utils), 'utf8'));
  for (const path of [...new Set([...source.matchAll(/['"]@\/utils\/([^'"]+)['"]/g)].map(m => m[1]))]) {
    source = source.replaceAll(`'@/utils/${path}'`, JSON.stringify(await moduleURL(path)));
  }
  const result = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  memo.set(name, result); return result;
}
const { createPlayerSurvival, updatePlayerFish } = await import(await moduleURL('playerSurvival'));
const { createPredatorFish, updatePredator } = await import(await moduleURL('survivalEcology'));
const { createFish } = await import(await moduleURL('fishModel'));
const { SPECIES } = await import(await moduleURL('fishSpecies'));
const bounds = { w:3600,h:1800,surfaceY:()=>1780 };
function player() { const f=createFish(3600,1800,60,SPECIES.starter);f.x=1500;f.y=800;return f; }
const input = { x:1,y:0,active:true,burst:true };
test('release starts cooldown and halves moving and resting recharge',()=>{
 const f=player(),s=createPlayerSurvival();
 updatePlayerFish(f,input,s,.05,bounds,false);
 const after=s.stamina;
 updatePlayerFish(f,{...input,burst:false},s,.05,bounds,false);
 assert.ok(s.burstCooldown>=.95);assert.ok(Math.abs(s.stamina-after-.55)<1e-8);
 updatePlayerFish(f,input,s,.05,bounds,false);assert.equal(s.isBursting,false);
 const before=s.stamina;
 updatePlayerFish(f,{...input,active:false,burst:false},s,.05,bounds,false);
 assert.ok(Math.abs(s.stamina-before-.95)<1e-8);
});
test('holding burst reaches zero, locks until strictly above twenty and never charges at zero',()=>{
 const f=player(),s=createPlayerSurvival();let reachedZero=false;
 for(let i=0;i<80;i++){
  updatePlayerFish(f,input,s,.05,bounds,false);
  if(s.stamina===0){reachedZero=true;assert.equal(s.isBursting,false);assert.equal(s.burstExhausted,true);break;}
 }
 assert.equal(reachedZero,true);
 s.stamina=20;s.burstCooldown=0;updatePlayerFish(f,input,s,.01,bounds,false);
 assert.equal(s.isBursting,false);assert.equal(s.burstExhausted,true);
 updatePlayerFish(f,input,s,.01,bounds,false);assert.equal(s.burstExhausted,false);assert.equal(s.isBursting,true);
});
test('burst starts only above twenty percent and cannot activate on a dead fish',()=>{
 for(const stamina of [0,19.9,20]){const s=createPlayerSurvival();s.stamina=stamina;updatePlayerFish(player(),input,s,.01,bounds,false);assert.equal(s.isBursting,false);}
 const s=createPlayerSurvival();s.health=0;updatePlayerFish(player(),input,s,.01,bounds,false);assert.equal(s.isBursting,false);
});
test('predator steep climbs and dives use continuous dorsal yaw and capped local pitch',()=>{
 for(const dy of [-1,1])for(const dir of [-1,1]){
  const pred=createPredatorFish(1800,900,100),s=createPlayerSurvival();s.isInNursery=false;
  const f=pred.fish;f.dir=dir;f.yaw=f.yawBody=f.yawTail=dir===1?0:Math.PI;
  pred.state='charge';pred.stateTimer=20;
  for(let i=0;i<90;i++){const p=player();p.x=f.x;p.y=f.y+dy*500;updatePredator(pred,p,s,1/60,bounds.surfaceY,()=>{});}
  assert.ok(Math.abs(f.pitch)<=50*Math.PI/180+1e-8);assert.ok(Math.abs(f.pitch+dy*50*Math.PI/180)<.01);
  assert.ok(Math.abs(f.yawBody-Math.PI/2)<.03);
 }
});
test('charge accelerates decisively above player burst speed and bites once with invulnerability guard',()=>{
 const pred=createPredatorFish(1500,800,100),s=createPlayerSurvival();s.isInNursery=false;
 pred.state='charge';pred.stateTimer=10;const p=player();let hits=0;
 for(let i=0;i<20;i++){p.x=pred.fish.x+500;p.y=pred.fish.y;updatePredator(pred,p,s,.05,bounds.surfaceY,()=>hits++);}
 assert.ok(pred.fish.speed>100*1.36*1.85);
 p.x=pred.fish.x+42;p.y=pred.fish.y;s.invulnerableTime=1;
 updatePredator(pred,p,s,.01,bounds.surfaceY,()=>hits++);assert.equal(hits,0);
 s.invulnerableTime=0;updatePredator(pred,p,s,.01,bounds.surfaceY,()=>hits++);assert.equal(hits,1);
 for(let i=0;i<30;i++){p.x=pred.fish.x+42;p.y=pred.fish.y;updatePredator(pred,p,s,.01,bounds.surfaceY,()=>hits++);}
 assert.equal(hits,1);
});
test('nursery and neutral view prevent predator bites',()=>{
 const pred=createPredatorFish(450,1500,100),s=createPlayerSurvival();pred.state='charge';pred.stateTimer=10;
 let hits=0;for(let i=0;i<120;i++){const p=player();p.x=pred.fish.x+42;p.y=pred.fish.y;updatePredator(pred,p,s,1/60,bounds.surfaceY,()=>hits++);}
 assert.equal(hits,0);assert.notEqual(pred.state,'charge');
});
test('predators only notice exposed fish within four hundred eighty world units',()=>{
 for(const [distance,expected] of [[479,'stalk'],[481,'patrol'],[700,'patrol']]){
  const pred=createPredatorFish(1800,800,100),s=createPlayerSurvival();s.isInNursery=false;
  const p=player();p.x=1800+distance;p.y=800;
  updatePredator(pred,p,s,.01,bounds.surfaceY,()=>{});assert.equal(pred.state,expected);
 }
});
test('ending a chase keeps its forward heading and a stable destination while slowing',()=>{
 for(const direction of [-1,1]){
  const pred=createPredatorFish(1800,800,100),s=createPlayerSurvival();s.isInNursery=true;
  pred.state='charge';pred.stateTimer=1;pred.fish.tx=1800+direction*500;pred.fish.ty=800;
  pred.fish.speed=300;const p=player();
  updatePredator(pred,p,s,.01,bounds.surfaceY,()=>{});
  assert.equal(pred.state,'disengage');assert.ok((pred.fish.tx-pred.fish.x)*direction>0);
  const tx=pred.fish.tx,ty=pred.fish.ty,speed=pred.fish.speed;
  for(let i=0;i<60;i++)updatePredator(pred,p,s,1/60,bounds.surfaceY,()=>{});
  assert.equal(pred.fish.tx,tx);assert.equal(pred.fish.ty,ty);
  assert.ok((pred.fish.tx-pred.fish.x)*direction>0);assert.ok(pred.fish.speed<speed);
 }
});
test('a full default Burst lasts fifty percent longer before exhaustion',()=>{
 const f=player(),s=createPlayerSurvival();let elapsed=0;
 while(s.stamina>0&&elapsed<5){updatePlayerFish(f,input,s,.01,bounds,false);elapsed+=.01;}
 assert.ok(Math.abs(elapsed-150/65)<.011,`full charge lasted ${elapsed}s`);
});
test('a successful predator bite blocks another attack for at least nine seconds',()=>{
 const pred=createPredatorFish(1800,800,100),s=createPlayerSurvival();s.isInNursery=false;
 pred.state='charge';pred.stateTimer=1;const p=player();p.x=1758;p.y=800;let hits=0;
 updatePredator(pred,p,s,.01,bounds.surfaceY,()=>hits++);assert.equal(hits,1);assert.equal(pred.attackCooldown,9);
 for(let i=0;i<179;i++){p.x=pred.fish.x+42;p.y=pred.fish.y;updatePredator(pred,p,s,.05,bounds.surfaceY,()=>hits++);}
 assert.equal(hits,1);assert.equal(pred.state,'patrol');assert.ok(pred.attackCooldown>0);
});

test('predator ordinary patrol destinations favour the upper half',()=>{
 const pred=createPredatorFish(1800,800,100),s=createPlayerSurvival();s.isInNursery=true;
 for(let i=0;i<30;i++){pred.state='patrol';pred.stateTimer=0;updatePredator(pred,player(),s,.01,bounds.surfaceY,()=>{});assert.ok(pred.fish.ty<900);}
});
