import { drawFilter } from '@/utils/filterRender';
import type { FilterFx, FilterLayout } from '@/utils/waterFilter';

export const AERATOR = { x: 60, y: 90, W: 88, H: 125 };
const fx: FilterFx = {alpha:1,t:0,income:0,nextBubble:0,bubbles:[],texts:[]};
export function inAeratorHealingPlume(x:number,y:number) {
  const centre=AERATOR.x+AERATOR.W*1.23;
  return Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x-centre)<38
    &&y>AERATOR.y-AERATOR.H*.16&&y<AERATOR.y+AERATOR.H*1.5;
}
/** Mirror the original hanging filter so its outlet faces into the left side of the tank. */
export function drawAerator(ctx:CanvasRenderingContext2D,time:number,layout=AERATOR) {
  fx.t=time;
  const local:FilterLayout={x:0,y:0,W:layout.W,H:layout.H,outX:-layout.W*.23,outY:layout.H*.77};
  ctx.save();ctx.translate(layout.x+layout.W,layout.y);ctx.scale(-1,1);drawFilter(ctx,fx,local,'#7b9296');ctx.restore();
  const x=layout.x+layout.W*1.23,top=layout.y-layout.H*.16,bottom=layout.y+layout.H*1.5;
  ctx.save();
  for(let i=0;i<22;i++){
    const phase=(time*.19+i*.61803398875)%1;
    const y=bottom-(bottom-top)*phase,alpha=.6*Math.min(1,(1-phase)*5);
    const cx=x+Math.sin(i*2.41)*layout.W*.14+Math.sin(time+i)*layout.W*.045;
    ctx.strokeStyle=`rgba(210,249,240,${alpha})`;ctx.fillStyle=`rgba(150,220,215,${alpha*.12})`;ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(cx,y,layout.W*(.022+(i%3)*.008),0,Math.PI*2);ctx.fill();ctx.stroke();
  }
  ctx.restore();
}
