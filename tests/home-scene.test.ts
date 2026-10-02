import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomeResidents, stepHomeResidents, homeBounds, pickHomeResident, canvasHomePoint } from '../src/games/importedAippy/upstream/src/utils/homeScene.ts';
import type { Specimen } from '../src/games/importedAippy/upstream/src/utils/boutique.ts';
const fish = (id: string): Specimen => ({ id, name: id, species: 'guppy', growth: 75, health: 73, hunger: 31, traits: ['ornate'], color: '#ed9479', accent: '#ffd36e', raisedSeconds: 200 });

test('resident identity and initial pose survive array reorder, with controlled fish included in bounded population', () => {
  const specimens = Array.from({length:30}, (_, i) => fish(String(i)));
  const first = createHomeResidents(specimens, 390, 600, '29');
  assert.equal(first.length, 24); assert.ok(first.some(r => r.id === '29'));
  const reordered = createHomeResidents([...specimens].reverse(), 390, 600, '29');
  for (const r of first) assert.deepEqual(reordered.find(other => other.id === r.id), r);
  const stepped = stepHomeResidents(first, 390, 600, 0.1, null, {x:0,y:0});
  const reconciled = createHomeResidents(specimens, 390, 600, '29', stepped);
  for (const r of stepped) assert.deepEqual(reconciled.find(other => other.id === r.id), r);
});
test('controlled fish can move in every direction and diagonal speed stays normalized', () => {
  const [resident] = createHomeResidents([fish('a')], 600, 600, 'a');
  resident.x = 300; resident.y = 300;
  for (const axis of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1},{x:1,y:1}]) {
    const [moved] = stepHomeResidents([resident],600,600,0.1,'a',axis);
    assert.equal(Math.sign(moved.x-resident.x),axis.x);
    assert.equal(Math.sign(moved.y-resident.y),axis.y);
    assert.ok(Math.hypot(moved.x-resident.x,moved.y-resident.y)<=7.01);
  }
});
test('long control and autonomous motion stay safe and never mutate specimen condition or input state', () => {
  const specimen = Object.freeze({...fish('safe'),traits:Object.freeze(['ornate'])}) as unknown as Specimen;
  const before = JSON.stringify(specimen);
  let residents = createHomeResidents([specimen],320,240,'safe');
  const initial = JSON.stringify(residents);
  stepHomeResidents(residents,320,240,0.1,'safe',{x:1,y:1});
  assert.equal(JSON.stringify(residents),initial);
  for (let i=0;i<2000;i++) {
    residents = stepHomeResidents(residents,320,240,0.1,i<1000?'safe':null,{x:-1,y:1});
    const bounds = homeBounds(320,240,residents[0].size);
    assert.ok(residents[0].x>=bounds.left && residents[0].x<=bounds.right);
    assert.ok(residents[0].y>=bounds.top && residents[0].y<=bounds.bottom);
  }
  assert.equal(JSON.stringify(specimen),before);
  assert.equal(residents[0].color,specimen.color);
  assert.equal(residents[0].accent,specimen.accent);
});
test('canvas picking converts CSS coordinates rather than device pixels', () => {
  const [r] = createHomeResidents([fish('picked')],320,400,null); r.x=120; r.y=140;
  const point=canvasHomePoint(70,90,{left:10,top:20,width:160,height:200},320,400);
  assert.deepEqual(point,{x:120,y:140});
  assert.equal(pickHomeResident([r],point.x,point.y),'picked');
  assert.equal(pickHomeResident([r],0,0),null);
});
test('invalid controls cannot poison a safe home pose', () => {
  const residents=createHomeResidents([fish('safe')],320,240,'safe');
  const moved=stepHomeResidents(residents,320,240,Infinity,'safe',{x:NaN,y:Infinity});
  assert.ok(Number.isFinite(moved[0].x)); assert.ok(Number.isFinite(moved[0].y));
});
test('controlled vertical travel holds a depth pose without slowing ascent or descent', () => {
  const seed=createHomeResidents([fish('pose')],600,600,'pose'); seed[0].x=300; seed[0].y=300;
  let up=seed, down=seed;
  for(let i=0;i<20;i++) {
    up=stepHomeResidents(up,600,600,0.05,'pose',{x:0,y:-1});
    down=stepHomeResidents(down,600,600,0.05,'pose',{x:0,y:1});
  }
  assert.ok(up[0].pitch>1.34 && up[0].pitch<1.36);
  assert.ok(down[0].pitch < -1.34 && down[0].pitch > -1.36);
  assert.ok(Math.abs(down[0].yawBody-Math.PI/2)<0.03);
  assert.equal(up[0].vy,-70); assert.equal(down[0].vy,70);
  assert.equal(up[0].y,230); assert.equal(down[0].y,370);
});
test('home direction controls the depth pose while effort controls travel', () => {
  const seed=createHomeResidents([fish('effort')],600,600,'effort'); seed[0].x=300; seed[0].y=300;
  let light=seed, diagonal=seed;
  for(let i=0;i<20;i++) {
    light=stepHomeResidents(light,600,600,0.05,'effort',{x:0,y:-0.25});
    diagonal=stepHomeResidents(diagonal,600,600,0.05,'effort',{x:1,y:1});
  }
  assert.ok(light[0].pitch>1.34 && light[0].pitch<1.36);
  assert.ok(diagonal[0].pitch < -0.78 && diagonal[0].pitch > -0.79);
  assert.equal(light[0].vy,-17.5);
  assert.ok(Math.abs(Math.hypot(diagonal[0].vx,diagonal[0].vy)-70)<0.001);
});
test('home vertical pitch eases to level after control release', () => {
  let residents=createHomeResidents([fish('release')],600,600,'release'); residents[0].x=300; residents[0].y=300;
  for(let i=0;i<20;i++) residents=stepHomeResidents(residents,600,600,0.05,'release',{x:0,y:-1});
  const before=residents[0].pitch;
  residents=stepHomeResidents(residents,600,600,0.1,'release',{x:0,y:0});
  assert.ok(residents[0].pitch>0.73 && residents[0].pitch<0.75);
  assert.ok(residents[0].pitch<before);
  assert.equal(residents[0].vy,0);
});
test('autonomous residents retain vertical wander with restrained velocity-sensitive pitch', () => {
  let residents=createHomeResidents([fish('wander')],600,600,null);
  let verticalDistance=0, peakPitch=0;
  for(let i=0;i<200;i++) {
    const before=residents[0].y;
    residents=stepHomeResidents(residents,600,600,0.1,null,{x:0,y:0});
    verticalDistance+=Math.abs(residents[0].y-before);
    peakPitch=Math.max(peakPitch,Math.abs(residents[0].pitch));
  }
  assert.ok(verticalDistance>40);
  assert.ok(peakPitch>0.01 && peakPitch<0.17);
});
test('reversals retain bounded head body and tail lag without touching resident condition', () => {
  const specimen=fish('turn'); const before=JSON.stringify(specimen);
  let residents=createHomeResidents([specimen],600,600,'turn');
  residents[0].x=300; residents[0].y=300;
  for(let i=0;i<20;i++)residents=stepHomeResidents(residents,600,600,0.05,'turn',{x:1,y:0});
  const start=residents[0]; const [turn]=stepHomeResidents(residents,600,600,0.05,'turn',{x:-1,y:0});
  assert.ok(turn.yaw>start.yaw && turn.yaw < Math.PI);
  assert.ok(turn.yaw>turn.yawBody && turn.yawBody>turn.yawTail);
  for(let i=0;i<40;i++)residents=stepHomeResidents(i===0?[turn]:residents,600,600,0.05,'turn',{x:-1,y:0});
  for(const value of [residents[0].yaw,residents[0].yawBody,residents[0].yawTail])assert.ok(value>=0 && value<=Math.PI);
  assert.equal(JSON.stringify(specimen),before);
});
test('passive residents ease into size-relative relaxed cruising', () => {
  const [initial]=createHomeResidents([fish('calm')],1200,900,null);
  initial.x=900; initial.y=400; initial.seed=0; initial.elapsed=0;
  initial.heading=initial.yaw=initial.yawBody=initial.yawTail=Math.PI;
  const [first]=stepHomeResidents([initial],1200,900,0.1,null,{x:0,y:0});
  assert.ok(Math.hypot(first.vx,first.vy)<2, 'passive acceleration begins gently');
  for(const size of [24,60]) {
    let residents=[{...initial,size}];
    for(let i=0;i<100;i++)residents=stepHomeResidents(residents,1200,900,0.1,null,{x:0,y:0});
    const speed=Math.hypot(residents[0].vx,residents[0].vy);
    assert.ok(speed>size*0.10 && speed<size*0.28, `size ${size} cruises in body lengths per second`);
  }
});
test('passive tail and pectoral fins beat in visible independent cycles', () => {
  const [initial]=createHomeResidents([fish('beat')],600,600,null);
  let residents=[initial];
  for(let i=0;i<10;i++)residents=stepHomeResidents(residents,600,600,0.1,null,{x:0,y:0});
  const moved=residents[0];
  assert.ok(moved.phase-initial.phase>Math.PI*1.4, 'tail completes at least 0.7 cycles per second');
  assert.ok(moved.phase-initial.phase<Math.PI*2.4, 'passive tail remains unhurried');
  assert.ok(moved.amp>=0.2 && moved.amp<0.4, 'lateral flex remains visible');
  assert.ok(moved.finPhase-initial.finPhase>Math.PI, 'pectoral fins keep paddling');
  assert.ok(Math.abs((moved.finPhase-initial.finPhase)-(moved.phase-initial.phase)*0.8)>0.05, 'fins have their own rhythm');
  assert.deepEqual(createHomeResidents([fish('beat')],600,600,null,residents)[0],moved);
});
test('passive reversals turn gradually with head body and tail following in order', () => {
  const [initial]=createHomeResidents([fish('passive-turn')],1200,900,null);
  initial.x=900; initial.y=400; initial.seed=0; initial.elapsed=0;
  initial.heading=initial.yaw=initial.yawBody=initial.yawTail=0;
  initial.vx=8;
  const [turn]=stepHomeResidents([initial],1200,900,0.1,null,{x:0,y:0});
  assert.equal(turn.heading,Math.PI);
  assert.ok(turn.yaw>0 && turn.yaw<0.5, 'home reversal starts with a slow head turn');
  assert.ok(turn.yaw>turn.yawBody && turn.yawBody>turn.yawTail);
  assert.ok(turn.vx>0, 'momentum continues while the body begins to turn');
  assert.deepEqual(createHomeResidents([fish('passive-turn')],1200,900,null,[turn])[0].yawTail,turn.yawTail);
});
