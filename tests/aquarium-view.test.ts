import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const utils = new URL('../src/games/importedAippy/upstream/src/utils/', import.meta.url);
const moduleURL = (s:string) => `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(s)).toString('base64')}`;
const homeURL=moduleURL(await readFile(new URL('homeScene.ts',utils),'utf8'));
let source=await readFile(new URL('aquariumView.ts',utils),'utf8');
source=source.replace(/import[^;]+;/g,'');
source=`
import {createHomeResidents,stepHomeResidents} from '${homeURL}';
const createFish=()=>({}); const applySpecimenAppearance=()=>({});
const drawFish=(ctx,fish,palette)=>ctx.predators.push([fish,palette]);
const drawRock=()=>{},buildWorldScene=()=>({rocks:[],decorPlants:[]});
const drawFishShadow=()=>{},drawSpecimenFish=()=>{},drawPlant=()=>{},drawCastle=()=>{},drawCrab=(ctx,crab)=>ctx.crabs.push(crab),drawCastleBubbles=()=>{},drawFoodEcology=()=>{};
const makeCrabPalette=()=>({});
const WORLD_WIDTH=3600,WORLD_HEIGHT=1800,CASTLE_LANDMARK={cx:3200};const worldSurfaceY=()=>1580;
const drawWaterBackground=()=>{},drawSandCaustics=()=>{},drawCycleTint=()=>{},getCausticPattern=()=>null,drawWaterCaustics=()=>{};
const getTankPalette=()=>({sand:'#eee',plant:'#abc'});
`+source;
const {createAquariumView,updateAquariumView,drawAquariumView}=await import(moduleURL(source));
const profile=()=>({kept:[],activeRun:{specimen:{id:'active',color:'#abc',accent:'#def',growth:40,health:100,hunger:100,traits:[]},x:1800,y:900}});
test('active View fish drifts from its saved Swim origin without changing the save',()=>{
 const save=profile(),before=JSON.stringify(save),state=createAquariumView();
 updateAquariumView(state,save,800,600,0);
 assert.equal(state.residents[0].x,1800);assert.equal(state.residents[0].y,900);
 for(let i=0;i<100;i++)updateAquariumView(state,save,800,600,.05);
 assert.ok(Math.hypot(state.residents[0].x-1800,state.residents[0].y-900)>5);
 assert.equal(JSON.stringify(save),before);
 save.activeRun.x=2300;save.activeRun.y=700;
 updateAquariumView(state,save,800,600,0);
 assert.equal(state.residents[0].x,2300);assert.equal(state.residents[0].y,700);
});
test('zero animation delta freezes overview fish and suspended water motion',()=>{
 const state=createAquariumView(),save=profile();updateAquariumView(state,save,800,600,0);
 const before=JSON.stringify(state.residents);
 for(let i=0;i<20;i++)updateAquariumView(state,save,800,600,0);
 assert.equal(JSON.stringify(state.residents),before);assert.equal(state.waterTime,0);
});
function context(){return {predators:[],crabs:[],arcs:[],save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},translate(){},scale(){},arc(...args){this.arcs.push(args);}};}
test('overview renders both native predators with default shared palette and sparse specks',()=>{
 const state=createAquariumView(),save={kept:[]},first={fish:{x:1200,y:800,L:140}},second={fish:{x:2700,y:600,L:140}},palette={body:'#f00'},ctx=context();
 drawAquariumView(ctx,state,save,{crabs:[]},first,palette,800,600,4,1,second);
 assert.deepEqual(ctx.predators,[[first.fish,palette],[second.fish,palette]]);
 assert.ok(ctx.arcs.length>=14&&ctx.arcs.length<=32);
 state.waterTime=20;const still=context();drawAquariumView(still,state,save,{crabs:[]},first,palette,800,600,0,1,second);
 state.waterTime=40;const later=context();drawAquariumView(later,state,save,{crabs:[]},first,palette,800,600,0,1,second);
 assert.deepEqual(still.arcs,later.arcs);
});

test('View renders both neutral resident crabs',()=>{
 const state=createAquariumView(),ctx=context(),crabs=[{rig:{cx:1200,cy:1550,S:100}},{rig:{cx:2800,cy:1520,S:100}}];
 drawAquariumView(ctx,state,{kept:[]},{crabs},null,null,390,844,4,1);
 assert.deepEqual(ctx.crabs,crabs.map(c=>c.rig));
});
