import { CASTLE_LANDMARK } from '@/utils/worldCamera';

export const CASTLE_HEAL_PER_SECOND = 3;
const PLUME_HEIGHT = 320;
type Castle = { cx:number; baseY:number; size:number };
const plumeHalfWidth = (height:number) => 30 + height * .075;

/** Recovery follows the bubbles' world-space corridor, including their fading upper section. */
export function inCastleHealingPlume(x:number,y:number) {
 const height=CASTLE_LANDMARK.baseY-y;
 return Number.isFinite(x)&&Number.isFinite(y)&&height>=14&&height<PLUME_HEIGHT
  &&Math.abs(x-CASTLE_LANDMARK.cx)<=plumeHalfWidth(height);
}

/** Deterministic bubbles never allocate a particle population or outlive their visible rise. */
export function drawCastleBubbles(ctx:CanvasRenderingContext2D,time:number,castle:Castle=CASTLE_LANDMARK) {
 if(!Number.isFinite(time))return;
 const tau=Math.PI*2;
 ctx.save();
 for(let i=0;i<30;i++){
  const phase=(time*.115+i*.61803398875)%1;
  const height=14+phase*(PLUME_HEIGHT-14);
  const spread=plumeHalfWidth(height)-8;
  const x=castle.cx+Math.sin(i*2.41)*spread*.7+Math.sin(time*1.2+i)*7;
  const y=castle.baseY-height;
  const radius=2.8+(Math.sin(i*1.73)+1)*1.7;
  const alpha=.65*Math.min(1,(PLUME_HEIGHT-height)/80)*Math.min(1,phase*12+.2);
  ctx.strokeStyle=`rgba(206,244,231,${alpha})`;ctx.lineWidth=1;
  ctx.fillStyle=`rgba(185,232,216,${alpha*.12})`;
  ctx.beginPath();ctx.arc(x,y,radius,0,tau);ctx.fill();ctx.stroke();
  ctx.strokeStyle=`rgba(244,255,249,${alpha*.9})`;
  ctx.beginPath();ctx.arc(x-radius*.12,y-radius*.12,radius*.62,Math.PI*1.03,Math.PI*1.53);ctx.stroke();
 }
 ctx.restore();
}
