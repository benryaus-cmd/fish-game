import { drawAerator } from '@/utils/aeratorHealing';
import { drawShrimp } from '@/utils/shrimpRender';
import { makeShrimpPalette } from '@/utils/shrimpModel';
import { drawWaterAtmosphere } from '@/utils/waterAtmosphere';
import type { BoutiqueSave, Specimen } from '@/utils/boutique';
import { createFish, type Fish, type FishPalette } from '@/utils/fishModel';
import { drawFish, drawFishShadow } from '@/utils/fishRender';
import { drawSpecimenFish } from '@/utils/specimenRender';
import { applySpecimenAppearance } from '@/utils/specimenAppearance';
import { createHomeResidents, stepHomeResidents, type HomeResident } from '@/utils/homeScene';
import { drawRock } from '@/utils/rockRender';
import { drawPlant } from '@/utils/plantRender';
import { drawCastle } from '@/utils/castleRender';
import { drawCrab } from '@/utils/crabRender';
import { makeCrabPalette } from '@/utils/crabModel';
import type { BottomEcology } from '@/utils/bottomEcology';
import type { PredatorEntity, PreyEntity } from '@/utils/survivalEcology';
import { WORLD_WIDTH,WORLD_HEIGHT,CASTLE_LANDMARK,worldSurfaceY,buildWorldScene } from '@/utils/worldCamera';
import { drawWaterBackground, drawSandCaustics, drawCycleTint, getTankPalette } from '@/utils/tankLighting';
import { getCausticPattern, drawWaterCaustics, drawRays } from '@/utils/aquaScene';
import { drawCastleBubbles } from '@/utils/castleHealing';
import { drawFoodEcology, type FoodParticle } from '@/utils/foodEcology';

/** A composed overview of the same aquarium; it never moves or copies saved fish. */
export interface AquariumViewState { residents: HomeResident[]; width:number;height:number; rigs: Map<string, {fish: Fish; palette: FishPalette; appearance: string}>; waterTime:number; activeSwimOrigin:string|null }
export const createAquariumView = (): AquariumViewState => ({ residents: [], width:1,height:1,rigs: new Map(), waterTime:0, activeSwimOrigin:null });
export function ownedAquariumFish(profile: BoutiqueSave): Specimen[] {
  const fish = profile.activeRun ? [...profile.kept, profile.activeRun.specimen] : profile.kept;
  return [...new Map(fish.map(f => [f.id, f])).values()];
}
export function updateAquariumView(state: AquariumViewState, profile: BoutiqueSave, w: number, h: number, dt: number) {
  const specimens = ownedAquariumFish(profile);
  state.width=w;state.height=h;
  const residents = createHomeResidents(specimens, WORLD_WIDTH,WORLD_HEIGHT, null, state.residents);
  const active=profile.activeRun;
  const origin=active ? `${active.specimen.id}:${active.x}:${active.y}` : null;
  const activePose=residents.find(r=>r.id===active?.specimen.id);
  // Seed the overview from the latest Swim position, then let its display pose cruise.
  // The save remains the source of truth when returning to Swim.
  if(active&&activePose&&state.activeSwimOrigin!==origin){activePose.x=active.x;activePose.y=active.y;}
  state.activeSwimOrigin=origin;
  state.residents = stepHomeResidents(residents, WORLD_WIDTH,WORLD_HEIGHT, dt, null, {x:0,y:0});
  const seconds=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
  state.waterTime+=seconds;
  const ids = new Set(specimens.map(f => f.id));
  for (const id of state.rigs.keys()) if (!ids.has(id)) state.rigs.delete(id);
  for (const s of specimens) {
    const r = state.residents.find(r => r.id === s.id);
    if (!r) continue;
    const appearance = JSON.stringify([s.color,s.accent,s.traits,s.growth,s.inherited,Math.round(s.health),Math.round(s.hunger),Math.round((s.care?.colourQuality ?? 1)*100)]);
    let rig = state.rigs.get(s.id);
    if (!rig || rig.appearance !== appearance) {
      const fish = rig?.fish ?? createFish(w,h,r.size);
      rig = {fish,palette:applySpecimenAppearance(fish,s),appearance}; state.rigs.set(s.id,rig);
    }
    const displaySize=Math.min(r.size,w*.16,h*.13);
    Object.assign(rig.fish,{x:r.x/WORLD_WIDTH*w,y:r.y/WORLD_HEIGHT*h*.94,L:displaySize,phase:r.phase,finPhase:r.finPhase,amp:r.amp,pitch:r.pitch,yaw:r.yaw,yawBody:r.yawBody,yawTail:r.yawTail,dir:r.heading===0?1:-1});
  }
}
export function pickAquariumViewFish(state: AquariumViewState,x:number,y:number){let id:string|null=null,distance=Infinity;for(const [key,rig] of state.rigs){const d=Math.hypot(x-rig.fish.x,y-rig.fish.y);if(d<Math.max(24,rig.fish.L*.8)&&d<distance){id=key;distance=d;}}return id;}
const overviewRays=Array.from({length:5},(_,i)=>({x:(i+.35)/5*WORLD_WIDTH,width:390+i%2*120,len:WORLD_HEIGHT*1.6,angle:.1,alpha:.05,ph:i*1.7,sp:.025}));
const overviewDecor=buildWorldScene();
const shrimpPalette=makeShrimpPalette('#df9678');
const crabPalette = makeCrabPalette('#bc7150');
export function drawAquariumView(ctx: CanvasRenderingContext2D, state: AquariumViewState, profile: BoutiqueSave, bottom: BottomEcology, predator: PredatorEntity | null, predatorPalette: FishPalette | null, w: number,h:number,time:number,daylight:number, secondPredator:PredatorEntity|null=null, secondPredatorPalette:FishPalette|null=predatorPalette,ambient:PreyEntity[]=[],angel:PreyEntity|null=null) {
  const palette = getTankPalette(Math.round(daylight*2)/2), sandY=h*.82;
  const surface=(x:number)=>worldSurfaceY(x/w*WORLD_WIDTH)/WORLD_HEIGHT*h*.94;
  drawWaterBackground(ctx,w,h,daylight);
  drawWaterAtmosphere(ctx,w,h,time===0?0:state.waterTime,daylight);
  ctx.save();ctx.scale(w/WORLD_WIDTH,h/WORLD_HEIGHT);ctx.globalCompositeOperation='lighter';drawRays(ctx,overviewRays,time,.15+daylight*.85);ctx.restore();
  ctx.fillStyle=getTankPalette(daylight).sand; ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,surface(0));
  for(let x=0;x<=w+8;x+=8)ctx.lineTo(x,surface(x));ctx.lineTo(w,h);ctx.closePath();ctx.fill();
  const pattern=getCausticPattern(ctx);
  if(pattern){drawWaterCaustics(ctx,pattern,time,0,0,w,h,.013*(.2+daylight*.8),h);drawSandCaustics(ctx,pattern,time,{x:0,y:0,width:w,height:h},surface,daylight,h);}
  const plantScale=Math.min(50,w*.11,h*.09);
  for(let i=0;i<7;i++){const x=w*(.015+i*.033);drawPlant(ctx,x,surface(x)+3,{kind:i%2?'leafy':'tall',h:1.7+i%3*.45,seed:43+i*7,tone:i%3},plantScale,palette.plant,time,.8,'back');}
  const overviewScale=Math.min(w/WORLD_WIDTH*2,h/WORLD_HEIGHT*.45);
  for(const rock of overviewDecor.rocks){const x=rock.x/WORLD_WIDTH*w;if(x>w*.22&&x<w*.89)drawRock(ctx,x,surface(x)+2,rock,rock.S*overviewScale,palette.rock);}
  for(const plant of overviewDecor.decorPlants){const x=plant.x/WORLD_WIDTH*w;drawPlant(ctx,x,surface(x)+2,{...plant,kind:'grass'},plant.S*overviewScale,palette.plant,time,.85,'back');}
  const castle={cx:CASTLE_LANDMARK.cx/WORLD_WIDTH*w,baseY:surface(CASTLE_LANDMARK.cx/WORLD_WIDTH*w)+3,size:Math.min(45,w*.09)*1.7};
  drawCastle(ctx,castle.cx,castle.baseY,castle.size,'#a59c87',1,1);
  ctx.save();ctx.translate(castle.cx,castle.baseY);ctx.scale(castle.size/210,castle.size/210);drawCastleBubbles(ctx,time,{cx:0,baseY:0,size:210});ctx.restore();
  const airW=Math.min(42,w*.1);drawAerator(ctx,time,{x:0,y:0,W:airW,H:airW*1.42});
  const dirt=profile.tankCare?.dirt ?? 0;
  if(dirt>15){ctx.save();ctx.globalAlpha=Math.min(.8,(dirt-15)/60);for(const right of [false,true]){ctx.save();if(right)ctx.translate(w-WORLD_WIDTH,0);const algae:FoodParticle[]=Array.from({length:13},(_,i)=>({x:right?WORLD_WIDTH-2:2,y:h*(.18+i*.047),size:13,kind:'algae',active:true,respawn:0,seed:i*2.13}));drawFoodEcology(ctx,algae,time);ctx.restore();}ctx.restore();}
  for(const residentCrab of bottom.crabs){
  const crab=residentCrab.rig;
  if(crab){const scale=Math.min(38,w*.09)/crab.S;ctx.save();ctx.translate(w*crab.cx/WORLD_WIDTH-crab.cx*scale,crab.cy/WORLD_HEIGHT*h*.94-crab.cy*scale);ctx.scale(scale,scale);drawCrab(ctx,crab,crabPalette);ctx.restore();}
  }
  for(const [entity,colors] of [[predator,predatorPalette],[secondPredator,secondPredatorPalette]] as const){if(entity&&colors){const fish=entity.fish,scale=Math.min(55,w*.14)/fish.L;ctx.save();ctx.translate(fish.x/WORLD_WIDTH*w-fish.x*scale,fish.y/WORLD_HEIGHT*h*.94-fish.y*scale);ctx.scale(scale,scale);drawFish(ctx,fish,colors);ctx.restore();}}
  for(const shrimp of (bottom.shrimps??[]).slice(0,8)){if(!shrimp.active)continue;const rig=shrimp.rig,scale=Math.min(20,w*.045)/rig.S;ctx.save();ctx.translate(rig.x/WORLD_WIDTH*w-rig.x*scale,rig.y/WORLD_HEIGHT*h*.94-rig.y*scale);ctx.scale(scale,scale);drawShrimp(ctx,rig,shrimpPalette);ctx.restore();}
  for(const resident of ambient.slice(0,30)){if(!resident.active)continue;const fish=resident.fish,scale=Math.min(23,w*.055)*(.5+((fish.id*37)%101)/200)/fish.L;ctx.save();ctx.translate(fish.x/WORLD_WIDTH*w-fish.x*scale,fish.y/WORLD_HEIGHT*h*.94-fish.y*scale);ctx.scale(scale,scale);const colors=resident.palette??predatorPalette;if(colors){if(resident.specimen)drawSpecimenFish(ctx,fish,colors,resident.specimen);else drawFish(ctx,fish,colors);}ctx.restore();}
  if(angel?.specimen&&angel.palette){const fish=angel.fish,scale=Math.min(68,w*.17)/fish.L;ctx.save();ctx.translate(fish.x/WORLD_WIDTH*w-fish.x*scale,fish.y/WORLD_HEIGHT*h*.94-fish.y*scale);ctx.scale(scale,scale);drawSpecimenFish(ctx,fish,angel.palette,angel.specimen);ctx.restore();}
  const owned=new Map(ownedAquariumFish(profile).map(f=>[f.id,f]));
  for(const r of [...state.residents].sort((a,b)=>a.y-b.y)){const rig=state.rigs.get(r.id),s=owned.get(r.id);if(!rig||!s)continue;ctx.save();if(s.health<=0){const rise=Math.max(0,Date.now()-(s.deathAtMs??Date.now()))/1000*55;ctx.translate(rig.fish.x,Math.max(30,rig.fish.y-rise));ctx.rotate(Math.PI);ctx.translate(-rig.fish.x,-rig.fish.y);}else {drawFishShadow(ctx,rig.fish,surface);const f=rig.fish,glow=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.L*.85);glow.addColorStop(0,'rgba(213,245,213,.03)');glow.addColorStop(.55,'rgba(213,245,213,.15)');glow.addColorStop(1,'rgba(213,245,213,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(f.x,f.y,f.L*.85,f.L*(s.species==='angelfish'?.85:.48),0,0,Math.PI*2);ctx.fill();}drawSpecimenFish(ctx,rig.fish,rig.palette,s);ctx.restore();}
  for(let i=0;i<7;i++){const x=w*(.015+i*.033);drawPlant(ctx,x,surface(x)+3,{kind:i%2?'leafy':'tall',h:1.7+i%3*.45,seed:43+i*7,tone:i%3},plantScale,palette.plant,time,.8,'front');}
  drawCycleTint(ctx,w,h,daylight);
  // Quiet, screen-sized labels distinguish owned individuals from ambient life.
  ctx.save();ctx.font='500 11px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  for(const [id,rig]of state.rigs){const s=owned.get(id);if(!s||s.health<=0)continue;
    const name=s.name.length>24?s.name.slice(0,23)+'…':s.name;
    const tw=ctx.measureText(name).width+16;
    const x=Math.max(tw/2+4,Math.min(w-tw/2-4,rig.fish.x)),y=Math.max(13,rig.fish.y-rig.fish.L*.65-9);
    ctx.fillStyle='rgba(8,38,43,.42)';ctx.beginPath();ctx.roundRect(x-tw/2,y-10,tw,20,10);ctx.fill();
    ctx.fillStyle='rgba(240,245,216,.9)';ctx.fillText(name,x,y);
  }ctx.restore();
}
