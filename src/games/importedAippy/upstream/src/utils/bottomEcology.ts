import { spawnShrimp, makeShrimpPalette, type Shrimp, type ShrimpEnv } from '@/utils/shrimpModel';
import { animate } from '@/utils/shrimpMotion';
import { stepTurn } from '@/utils/shrimpTurn';
import { drawShrimp } from '@/utils/shrimpRender';
import { spawnCrab, makeCrabPalette, type Crab, type CrabEnv } from '@/utils/crabModel';
import { updateCrab } from '@/utils/crabBrain';
import { drawCrab } from '@/utils/crabRender';
import { canEatFood, foodIsNearbyEdible, drawEdibleGlow, type FoodConsumer } from '@/utils/foodEcology';
import { WORLD_WIDTH, WORLD_HEIGHT, NURSERY_ZONE, worldSurfaceY } from '@/utils/worldCamera';
export const CRAB_WINDUP_SECONDS = 0.75;
export const CRAB_HOP_HEIGHT = 210;
export const CRAB_DAMAGE_COOLDOWN = 2;
export interface BottomPlayer { x:number; y:number; L:number; growth:number; inShelter?:boolean }
export interface BottomDamage { kind:'crab'; amount:number; x:number; y:number }
export interface WildShrimp { rig:Shrimp; active:boolean; respawn:number; homeX:number; homeY:number; fleeCooldown:number }
export interface WildCrab { rig:Crab; homeX:number; phase:'idle'|'windup'|'lunge'|'recover'; phaseTime:number; cooldown:number; targetX:number; hit:boolean; hopHeight:number }
export interface BottomEcology { shrimps:WildShrimp[]; crabs:WildCrab[]; damageCooldown:number }
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const shrimpPal=makeShrimpPalette('#df9678');
const crabPal=makeCrabPalette('#bc7150');
function shrimpEnv(surfaceY:(x:number)=>number):ShrimpEnv {return {w:WORLD_WIDTH,h:WORLD_HEIGHT,sandTop:1580,surfaceY,L:38};}
function crabEnv(surfaceY:(x:number)=>number):CrabEnv {return {w:WORLD_WIDTH,h:WORLD_HEIGHT,sandTop:1580,surfaceY,L:86,span:24,speed:1};}
export function createBottomEcology():BottomEcology {
 const env=shrimpEnv(worldSurfaceY);
 const shrimps=[320,740,1160,1580,2000,2420,2840,3260].map((homeX,i)=>{
  const rig=spawnShrimp(env,false,i,8);rig.x=rig.tx=homeX;rig.homeX=homeX/WORLD_WIDTH;rig.y=150+(i*431)%1300;rig.ty=rig.y;rig.mode='hover';rig.ground=0;rig.swim=1;
  return {rig,active:true,respawn:0,homeX,homeY:rig.y,fleeCooldown:0};
 });
 const crabs=[1180,2940].map((homeX,i)=>{
  const rig=spawnCrab(WORLD_WIDTH,86,false,i,2);rig.x=rig.cx=rig.tx=homeX;rig.home=homeX/WORLD_WIDTH;
  updateCrab(rig,[],.01,crabEnv(worldSurfaceY),()=>{},()=>{});
  return {rig,homeX,phase:'idle' as const,phaseTime:0,cooldown:0,targetX:homeX,hit:false,hopHeight:0};
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
export interface BottomEcologyOptions { damageEnabled?:boolean }
/** Bound integration while replenishing the finite prey population using elapsed seconds. */
export function updateBottomEcology(state:BottomEcology,dtRaw:number,player:BottomPlayer,surfaceY:(x:number)=>number=worldSurfaceY,options:BottomEcologyOptions={}):BottomDamage|null {
 const elapsed=Number.isFinite(dtRaw)?clamp(dtRaw,0,1):0;
 for(const s of state.shrimps)if(!s.active){s.respawn-=elapsed;if(s.respawn<=0){s.active=true;s.rig.x=s.rig.tx=s.homeX;s.rig.y=s.rig.ty=s.homeY;s.rig.vx=s.rig.vy=0;s.fleeCooldown=0;s.rig.mode='hover';s.rig.t=0;}}
 let event:BottomDamage|null=null;
 let remaining=elapsed;
 while(remaining>1e-8){const dt=Math.min(.05,remaining);remaining-=dt;state.damageCooldown=Math.max(0,state.damageCooldown-dt);
  for(const s of state.shrimps){if(!s.active)continue;const r=s.rig;s.fleeCooldown=Math.max(0,s.fleeCooldown-dt);r.t+=dt;
   const dx=r.x-player.x,dy=r.y-player.y,distance=Math.hypot(dx,dy);
   if(distance<130&&s.fleeCooldown<=0){
    const norm=Math.max(1,distance),awayX=distance<1?r.face:dx/norm,awayY=distance<1?-.3:dy/norm;
    r.vx=awayX*280;r.vy=awayY*280-45;r.curl=.85;r.fan=.15;r.mode='flick';r.t=0;s.fleeCooldown=1.1;
   }
   if(r.mode==='flick'){
    r.vx*=Math.exp(-1.5*dt);r.vy*=Math.exp(-1.5*dt);
    if(r.t>.7){r.mode='hover';r.t=0;r.tx=clamp(r.x+r.face*400,60,WORLD_WIDTH-60);r.ty=clamp(r.y+Math.sin(r.clock)*450,100,surfaceY(r.tx)-35);}
   }else{
    if(r.t>5||Math.hypot(r.tx-r.x,r.ty-r.y)<20){r.t=0;r.tx=clamp(r.x+Math.cos(r.clock*.43+r.id)*600,60,WORLD_WIDTH-60);r.ty=clamp(r.y+Math.sin(r.clock*.19+r.id)*500,100,surfaceY(r.tx)-35);}
    const dx=r.tx-r.x,dy=r.ty-r.y,n=Math.max(1,Math.hypot(dx,dy)),speed=32*r.pSpeed,k=1-Math.exp(-2*dt);
    r.vx+=(dx/n*speed-r.vx)*k;r.vy+=(dy/n*speed-r.vy)*k;
   }
   r.x=clamp(r.x+r.vx*dt,45,WORLD_WIDTH-45);r.y=clamp(r.y+r.vy*dt,80,surfaceY(r.x)-15);
   if(Math.abs(r.vx)>4)r.want=r.vx>0?1:-1;
   stepTurn(r,dt);animate(r,dt,shrimpEnv(surfaceY),()=>{});
  }
  for(const c of state.crabs){const r=c.rig;c.cooldown=Math.max(0,c.cooldown-dt);c.phaseTime+=dt;
   const enabled=options.damageEnabled!==false;
   const low=player.y>surfaceY(player.x)-(CRAB_HOP_HEIGHT+80)&&player.y<surfaceY(player.x)+55;
   const safe=inNursery(player);
   const near=Math.abs(player.x-r.x)<155;
   if(!enabled&&(c.phase==='windup'||c.phase==='lunge')){c.phase='recover';c.phaseTime=0;c.cooldown=CRAB_DAMAGE_COOLDOWN;}
   if(c.phase==='idle'&&enabled&&low&&!safe&&near&&c.cooldown<=0){c.phase='windup';c.phaseTime=0;c.hit=false;c.targetX=clamp(player.x,800,WORLD_WIDTH-100);r.mode='idle';r.t=0;r.dur=10;r.vx=0;}
   if(c.phase==='windup'&&c.phaseTime>=CRAB_WINDUP_SECONDS){c.phase='lunge';c.phaseTime=0;r.mode='walk';r.tx=c.targetX;r.dir=c.targetX>=r.x?1:-1;}
   if(c.phase==='lunge'&&c.phaseTime>=1.2){c.phase='recover';c.phaseTime=0;c.cooldown=CRAB_DAMAGE_COOLDOWN;}
   if(c.phase==='recover'&&c.phaseTime>=.5){c.phase='idle';c.phaseTime=0;r.mode='idle';r.t=0;r.dur=.4;}
   // Return planted-foot coordinates to ground before the original articulated rig steps.
   for(const foot of r.feet){foot.y+=c.hopHeight;foot.sy+=c.hopHeight;}
   r.x=clamp(r.x,800,WORLD_WIDTH-100);r.tx=clamp(r.tx,800,WORLD_WIDTH-100);
   const env=crabEnv(surfaceY);env.speed=c.phase==='lunge'?5:1;
   updateCrab(r,[],dt,env,()=>{},()=>{});
   r.x=clamp(r.x,800,WORLD_WIDTH-100);r.cx=r.x;r.tx=clamp(r.tx,800,WORLD_WIDTH-100);
   c.hopHeight=c.phase==='lunge'?(c.phaseTime<.22?CRAB_HOP_HEIGHT*Math.sin(c.phaseTime/.22*Math.PI/2):CRAB_HOP_HEIGHT*Math.pow(Math.max(0,1-(c.phaseTime-.22)/.98),1.35)):0;
   r.cy-=c.hopHeight;r.footY-=c.hopHeight;
   for(const foot of r.feet){foot.y-=c.hopHeight;foot.sy-=c.hopHeight;}
   if(c.phase==='windup'||c.phase==='lunge'){
    const sides=c.phase==='lunge'?[0,1]:[c.targetX>=r.x?1:0],k=1-Math.exp(-12*dt);
    for(const side of sides){const claw=r.claws[side];const jumping=c.phase==='lunge';
     claw.x+=((side?1:-1)*(jumping?.56:.66)-claw.x)*k;claw.y+=((jumping?-.32:-.17)-claw.y)*k;claw.a+=(-1.25-claw.a)*k;claw.open+=(.8-claw.open)*k;
    }r.eyeLift=.85;
   }
   if(enabled&&c.phase==='lunge'&&!c.hit&&!safe&&state.damageCooldown<=0&&Math.abs(player.x-r.cx)<r.S*1.15&&Math.abs(player.y-r.cy)<r.S*1.1){
    c.hit=true;c.cooldown=CRAB_DAMAGE_COOLDOWN;state.damageCooldown=CRAB_DAMAGE_COOLDOWN;event={kind:'crab',amount:8,x:r.cx,y:r.cy};
   }
  }
 }
 return event;
}
export function drawBottomEcology(ctx:CanvasRenderingContext2D,state:BottomEcology,_time:number,view:{x:number;y:number;width:number;height:number},consumer?:FoodConsumer){
 const visible=(x:number,y:number,r:number)=>x+r>=view.x&&x-r<=view.x+view.width&&y+r>=view.y&&y-r<=view.y+view.height;
 for(const s of state.shrimps)if(s.active&&visible(s.rig.x,s.rig.y,s.rig.S*2)){
  if(consumer&&foodIsNearbyEdible({x:s.rig.x,y:s.rig.y,size:s.rig.S,kind:'prey',active:true},consumer)){ctx.save();ctx.translate(s.rig.x,s.rig.y);drawEdibleGlow(ctx,s.rig.S*.6,_time);ctx.restore();}
  drawShrimp(ctx,s.rig,shrimpPal);
 }
 for(const c of state.crabs)if(visible(c.rig.cx,c.rig.cy,c.rig.S*1.6))drawCrab(ctx,c.rig,crabPal);
}
