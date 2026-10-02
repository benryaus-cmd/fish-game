import { spawnShrimp, makeShrimpPalette, type Shrimp, type ShrimpEnv } from '@/utils/shrimpModel';
import { updateShrimp } from '@/utils/shrimpBrain';
import { drawShrimp } from '@/utils/shrimpRender';
import { spawnCrab, makeCrabPalette, type Crab, type CrabEnv } from '@/utils/crabModel';
import { updateCrab } from '@/utils/crabBrain';
import { drawCrab } from '@/utils/crabRender';
import { canEatFood } from '@/utils/foodEcology';
import { WORLD_WIDTH, WORLD_HEIGHT, NURSERY_ZONE, worldSurfaceY } from '@/utils/worldCamera';
export const CRAB_WINDUP_SECONDS = 0.75;
export const CRAB_DAMAGE_COOLDOWN = 2;
export interface BottomPlayer { x:number; y:number; L:number; growth:number; inShelter?:boolean }
export interface BottomDamage { kind:'crab'; amount:number; x:number; y:number }
export interface WildShrimp { rig:Shrimp; active:boolean; respawn:number; homeX:number }
export interface WildCrab { rig:Crab; homeX:number; phase:'idle'|'windup'|'lunge'|'recover'; phaseTime:number; cooldown:number; targetX:number; hit:boolean }
export interface BottomEcology { shrimps:WildShrimp[]; crabs:WildCrab[]; damageCooldown:number }
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const shrimpHooks={onEat:()=>{},onStep:()=>{},onFlick:()=>{}};
const shrimpPal=makeShrimpPalette('#df9678');
const crabPal=makeCrabPalette('#bc7150');
function shrimpEnv(surfaceY:(x:number)=>number):ShrimpEnv {return {w:WORLD_WIDTH,h:WORLD_HEIGHT,sandTop:1580,surfaceY,L:38};}
function crabEnv(surfaceY:(x:number)=>number):CrabEnv {return {w:WORLD_WIDTH,h:WORLD_HEIGHT,sandTop:1580,surfaceY,L:86,span:24,speed:1};}
export function createBottomEcology():BottomEcology {
 const env=shrimpEnv(worldSurfaceY);
 const shrimps=[750,805,890,1030,1320,1560,1750,2210].map((homeX,i)=>{
  const rig=spawnShrimp(env,false,i,8);rig.x=rig.tx=homeX;rig.homeX=homeX/WORLD_WIDTH;rig.y=worldSurfaceY(homeX)-rig.S*.19;
  return {rig,active:true,respawn:0,homeX};
 });
 const crabs=[1180,1910].map((homeX,i)=>{
  const rig=spawnCrab(WORLD_WIDTH,86,false,i,2);rig.x=rig.cx=rig.tx=homeX;rig.home=homeX/WORLD_WIDTH;
  updateCrab(rig,[],.01,crabEnv(worldSurfaceY),()=>{},()=>{});
  return {rig,homeX,phase:'idle' as const,phaseTime:0,cooldown:0,targetX:homeX,hit:false};
 });
 return {shrimps,crabs,damageCooldown:0};
}
/** Only call for a deliberate EAT input. The survival diet supplies the same prey size gate as other food. */
export function biteShrimp(state:BottomEcology,mouth:{x:number;y:number},fish:{L:number},growth:number):boolean {
 const prey=state.shrimps.find(s=>s.active&&canEatFood('prey',growth,s.rig.S,fish.L)&&Math.hypot(s.rig.x-mouth.x,s.rig.y-mouth.y)<=fish.L*.27+s.rig.S*.45);
 if(!prey)return false;
 prey.active=false;prey.respawn=22;return true;
}
function inNursery(p:BottomPlayer){return p.x>=NURSERY_ZONE.x0&&p.x<=NURSERY_ZONE.x1&&p.y>=NURSERY_ZONE.y0&&p.y<=NURSERY_ZONE.y1;}
/** Simulation steps are bounded at 50ms; replenishment uses real elapsed time, capped for tab suspension. */
export function updateBottomEcology(state:BottomEcology,dtRaw:number,player:BottomPlayer,surfaceY:(x:number)=>number=worldSurfaceY):BottomDamage|null {
 const elapsed=Number.isFinite(dtRaw)?clamp(dtRaw,0,1):0;
 for(const s of state.shrimps)if(!s.active){s.respawn-=elapsed;if(s.respawn<=0){s.active=true;s.rig.x=s.rig.tx=s.homeX;s.rig.y=surfaceY(s.homeX)-s.rig.S*.19;s.rig.vx=s.rig.vy=0;s.rig.mode='rest';s.rig.t=0;}}
 let event:BottomDamage|null=null;
 let remaining=elapsed;
 while(remaining>1e-8){const dt=Math.min(.05,remaining);remaining-=dt;state.damageCooldown=Math.max(0,state.damageCooldown-dt);
  for(const s of state.shrimps){if(!s.active)continue;const r=s.rig;
   if(Math.hypot(r.x-player.x,r.y-player.y)<100&&r.mode!=='flick'){r.mode='flick';r.t=0;r.kicked=false;r.flickIn=0;}
   updateShrimp(r,[],dt,shrimpEnv(surfaceY),shrimpHooks);
   r.x=clamp(r.x,Math.max(735,s.homeX-100),Math.min(WORLD_WIDTH-45,s.homeX+100));
   r.tx=clamp(r.tx,Math.max(735,s.homeX-100),Math.min(WORLD_WIDTH-45,s.homeX+100));
  }
  for(const c of state.crabs){const r=c.rig;c.cooldown=Math.max(0,c.cooldown-dt);c.phaseTime+=dt;
   const low=player.y>surfaceY(player.x)-100&&player.y<surfaceY(player.x)+55;
   const safe=!!player.inShelter||inNursery(player);
   const near=Math.abs(player.x-r.x)<115&&Math.abs(player.x-c.homeX)<150;
   if((safe||!low)&&(c.phase==='windup'||c.phase==='lunge')){c.phase='recover';c.phaseTime=0;c.cooldown=CRAB_DAMAGE_COOLDOWN;}
   if(c.phase==='idle'&&low&&!safe&&near&&c.cooldown<=0){c.phase='windup';c.phaseTime=0;c.hit=false;c.targetX=clamp(player.x,c.homeX-85,c.homeX+85);r.mode='idle';r.t=0;r.dur=10;r.vx=0;}
   if(c.phase==='windup'&&c.phaseTime>=CRAB_WINDUP_SECONDS){c.phase='lunge';c.phaseTime=0;r.mode='walk';r.tx=c.targetX;r.dir=c.targetX>=r.x?1:-1;}
   if(c.phase==='lunge'&&c.phaseTime>=.35){c.phase='recover';c.phaseTime=0;c.cooldown=CRAB_DAMAGE_COOLDOWN;}
   if(c.phase==='recover'&&c.phaseTime>=.8){c.phase='idle';c.phaseTime=0;r.mode='walk';r.tx=c.homeX;}
   r.tx=clamp(r.tx,c.homeX-85,c.homeX+85);
   const env=crabEnv(surfaceY);env.speed=c.phase==='lunge'?7:1;
   updateCrab(r,[],dt,env,()=>{},()=>{});
   r.x=clamp(r.x,c.homeX-105,c.homeX+105);r.cx=r.x;r.tx=clamp(r.tx,c.homeX-85,c.homeX+85);
   if(c.phase==='windup'||c.phase==='lunge'){
    const side=c.targetX>=r.x?1:0;const claw=r.claws[side];const k=1-Math.exp(-12*dt);
    claw.y+=(-.17-claw.y)*k;claw.a+=(-1.25-claw.a)*k;claw.open+=(.8-claw.open)*k;r.eyeLift=.85;
   }
   if(c.phase==='lunge'&&!c.hit&&!safe&&low&&state.damageCooldown<=0&&Math.abs(player.x-r.cx)<r.S*.85&&Math.abs(player.y-r.cy)<r.S*.9){
    c.hit=true;c.cooldown=CRAB_DAMAGE_COOLDOWN;state.damageCooldown=CRAB_DAMAGE_COOLDOWN;event={kind:'crab',amount:8,x:r.cx,y:r.cy};
   }
  }
 }
 return event;
}
export function drawBottomEcology(ctx:CanvasRenderingContext2D,state:BottomEcology,_time:number,view:{x:number;y:number;width:number;height:number}){
 const visible=(x:number,y:number,r:number)=>x+r>=view.x&&x-r<=view.x+view.width&&y+r>=view.y&&y-r<=view.y+view.height;
 for(const s of state.shrimps)if(s.active&&visible(s.rig.x,s.rig.y,s.rig.S*2))drawShrimp(ctx,s.rig,shrimpPal);
 for(const c of state.crabs)if(visible(c.rig.cx,c.rig.cy,c.rig.S*1.6))drawCrab(ctx,c.rig,crabPal);
}
