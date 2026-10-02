/** Bounded, viewport-filled suspended grains and slow surface ripple glints. */
export function drawWaterAtmosphere(ctx: CanvasRenderingContext2D, w:number, h:number, time:number, daylight:number, cameraX=0, cameraY=0) {
  if(w<=0||h<=0)return;
  const count=Math.min(56,Math.max(28,Math.round(w*h/9500)));
  const fract=(n:number)=>n-Math.floor(n);
  ctx.save();ctx.fillStyle='#dbf5df';
  for(let i=0;i<count;i++){
    const near=i%11===0,depth=near?1.5:1;
    const x=fract(i*.61803398875+time*(.0009+i%3*.0003)-cameraX*.00013*depth)*w;
    const y=fract(i*.38196601125-time*(.0004+i%2*.0002)-cameraY*.00012*depth)*h*.94;
    ctx.globalAlpha=(near?.1:.17+ i%4*.025)*(.65+daylight*.35)*( .8+.2*Math.sin(time*.3+i));
    ctx.beginPath();ctx.arc(x,y,near?1.8:.6+i%3*.3,0,Math.PI*2);ctx.fill();
  }
  ctx.strokeStyle='#e4fff1';ctx.lineWidth=.7;
  for(let i=0;i<3;i++){
    const y=h*(.035+i*.045)+Math.sin(time*.18+i*2)*4;
    ctx.globalAlpha=(.025+daylight*.035)*( .7+.3*Math.sin(time*.2+i));
    ctx.beginPath();ctx.moveTo(-w*.05,y);ctx.bezierCurveTo(w*.28,y-9,w*.64,y+7,w*1.05,y-3);ctx.stroke();
  }
  ctx.restore();
}
