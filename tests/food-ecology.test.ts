import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const utils = new URL('../src/games/importedAippy/upstream/src/utils/', import.meta.url);
const url = s => `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(s)).toString('base64')}`;
const textures = url(await readFile(new URL('aquaTextures.ts', utils), 'utf8'));
const camera = url((await readFile(new URL('worldCamera.ts', utils), 'utf8')).replace("'@/utils/aquaTextures'", JSON.stringify(textures)));
const foodSource = (await readFile(new URL('foodEcology.ts', utils), 'utf8')).replace("'@/utils/aquaTextures'", JSON.stringify(textures)).replace("'@/utils/worldCamera'", JSON.stringify(camera));
const { canEatFood, createFoodEcology, biteFood, updateFoodEcology, BITE_INTERVAL_SECONDS, foodIsNearbyEdible, drawFoodEcology } = await import(url(foodSource));
test('guppy fry food and juvenile mouth limits are authored and extensible', () => {
  assert.equal(canEatFood('flake', 0, 8, 72), true);
  assert.equal(canEatFood('prey', 34.9, 20, 72), false);
  assert.equal(canEatFood('prey', 35, 32.4, 72), true);
  assert.equal(canEatFood('prey', 35, 33, 72), false);
  assert.equal(canEatFood('prey', 100, 20, 72, {foods:['algae'],preyMinimumGrowth:0,mouthSizeRatio:.5}), false);
});
test('bounded ecology replenishes nursery food after one deliberate bite', () => {
  const food = createFoodEcology(); const flake = food.find(f => f.kind === 'flake');
  const count = food.length;
  assert.equal(biteFood(food, flake, {L:72}, 0), 'flake');
  assert.equal(flake.active, false);
  updateFoodEcology(food, 20);
  assert.equal(flake.active, true); assert.equal(food.length, count);
  assert.ok(BITE_INTERVAL_SECONDS >= .35 && BITE_INTERVAL_SECONDS <= .5);
});
test('tutorial flake stays at the newborn mouth while other flakes drift and algae stay attached', () => {
  const food=createFoodEcology(); const algae=food.filter(f=>f.kind==='algae').map(f=>({f,x:f.x,y:f.y}));
  const other={x:food[1].x,y:food[1].y};
  for(let i=0;i<300;i++)updateFoodEcology(food,1/60);
  assert.equal(food[0].x,414);assert.equal(food[0].y,1520);
  assert.ok(food[1].y>other.y);assert.ok(Math.abs(food[1].x-other.x)<15);
  for(const a of algae){assert.equal(a.f.x,a.x);assert.equal(a.f.y,a.y);}
});

test('algae grows flush against both walls and remains attached after replenishing',()=>{
 const food=createFoodEcology();const algae=food.filter(f=>f.kind==='algae');
 assert.ok(algae.some(f=>f.x===2));assert.ok(algae.some(f=>f.x===3598));
 for(const f of algae){assert.ok(f.x===2||f.x===3598);assert.ok(f.y>100&&f.y<1450);}
});
test('food discovery glow uses the diet, mouth size and nearby gates',()=>{
 const consumer={x:100,y:100,L:72,growth:0};
 assert.equal(foodIsNearbyEdible({x:140,y:100,size:8,kind:'flake',active:true},consumer),true);
 assert.equal(foodIsNearbyEdible({x:500,y:100,size:8,kind:'flake',active:true},consumer),false);
 assert.equal(foodIsNearbyEdible({x:100,y:100,size:40,kind:'pellet',active:true},consumer),false);
 assert.equal(foodIsNearbyEdible({x:100,y:100,size:20,kind:'prey',active:true},consumer),false);
 assert.equal(foodIsNearbyEdible({x:100,y:100,size:20,kind:'prey',active:true},{...consumer,growth:35}),true);
});

test('wall algae filaments reach into water on each wall',()=>{
 const endpoints=[];let x=0,y=0,angle=0;
 const gradient={addColorStop(){}};
 const ctx=new Proxy({
  save(){},restore(){},translate(a,b){x=a;y=b;angle=0;},rotate(a){angle+=a;},
  createRadialGradient(){return gradient;},createLinearGradient(){return gradient;},
  bezierCurveTo(a,b,c,d,e,f){endpoints.push({rootX:x,x:x+e*Math.cos(angle)-f*Math.sin(angle),y:y+e*Math.sin(angle)+f*Math.cos(angle)});}
 },{get(target,key){return key in target?target[key]:()=>{};},set(target,key,value){target[key]=value;return true;}});
 const food=createFoodEcology().filter(f=>f.kind==='algae');
 drawFoodEcology(ctx,food,1);
 assert.ok(endpoints.some(p=>p.rootX===2));assert.ok(endpoints.some(p=>p.rootX===3598));
 for(const point of endpoints)assert.ok(point.rootX===2?point.x>2:point.x<3598);
});
test('invalid food elapsed time cannot poison a consumed particle or motion',()=>{
 const food=createFoodEcology();biteFood(food,food[0],{L:72},0);
 updateFoodEcology(food,NaN);updateFoodEcology(food,Infinity);updateFoodEcology(food,-3);
 assert.equal(food[0].respawn,8);
 assert.ok(food.every(f=>[f.x,f.y,f.seed,f.respawn].every(Number.isFinite)));
});
