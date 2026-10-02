import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes, createRequire } from 'node:module';
const canvas = createRequire(import.meta.url)(process.env.FISH_CANVAS_MODULE || '@napi-rs/canvas');
(globalThis as any).document = { createElement: () => canvas.createCanvas(1, 1) };
const base = new URL('../src/games/importedAippy/upstream/src/utils/', import.meta.url);
const compile = (source: string) => `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`;
const sceneSource = (await readFile(new URL('aquaScene.ts', base), 'utf8')).replace(/^import[^;]+;/gm, '');
const sceneUrl = compile(sceneSource);
async function lighting() {
  let source = '';
  try { source = await readFile(new URL('tankLighting.ts', base), 'utf8'); } catch {}
  return import(compile(source.replace("'@/utils/aquaScene'", JSON.stringify(sceneUrl))));
}
function tile() {
  const c = canvas.createCanvas(32, 32), ctx = c.getContext('2d');
  ctx.strokeStyle = 'white'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(16, 16, 12, 10, 0, 0, Math.PI * 2); ctx.stroke(); return c;
}
const alphaSum = (ctx: any, x: number, y: number, w: number, h: number) => ctx.getImageData(x,y,w,h).data.reduce((sum: number,v: number,i: number)=>sum+(i%4===3?v:0),0);
test('sand light stays below its curved receiver, animates, and has a soft horizon', async () => {
  const api = await lighting(); assert.equal(typeof api.drawSandCaustics, 'function');
  const c = canvas.createCanvas(320,240), ctx = c.getContext('2d'), pattern = ctx.createPattern(tile(),'repeat');
  const surface = (x: number) => 165 + Math.sin(x/45)*9;
  api.drawSandCaustics(ctx,pattern,0,{x:0,y:0,width:320,height:240},surface,1,240);
  assert.equal(alphaSum(ctx,0,0,320,155),0,'wall must receive no sand light');
  assert.ok(alphaSum(ctx,0,188,320,40)>15000,'floor must glow');
  assert.ok(alphaSum(ctx,0,159,320,15)<alphaSum(ctx,0,190,320,15),'horizon must fade in');
  const first = Buffer.from(ctx.getImageData(0,0,320,240).data);
  ctx.clearRect(0,0,320,240);
  api.drawSandCaustics(ctx,pattern,7,{x:0,y:0,width:320,height:240},surface,1,240);
  assert.notDeepEqual(Buffer.from(ctx.getImageData(0,0,320,240).data),first,'drift must move real light pixels');
});
test('floor light remains world aligned while camera pans', async () => {
  const api = await lighting(); assert.equal(typeof api.drawSandCaustics, 'function');
  const c = canvas.createCanvas(400,300), ctx = c.getContext('2d'), pattern = ctx.createPattern(tile(),'repeat');
  api.drawSandCaustics(ctx,pattern,3,{x:0,y:0,width:400,height:300},()=>170,1,300);
  const reference = Buffer.from(ctx.getImageData(80,210,220,50).data);
  ctx.clearRect(0,0,400,300); ctx.save(); ctx.translate(-80,-90);
  api.drawSandCaustics(ctx,pattern,3,{x:80,y:90,width:320,height:210},()=>170,1,300); ctx.restore();
  assert.deepEqual(Buffer.from(ctx.getImageData(0,120,220,50).data),reference);
});
test('night volume differs from day without obscuring fish or abrupt bands', async () => {
  const api = await lighting(); assert.equal(typeof api.drawCycleTint, 'function');
  const c = canvas.createCanvas(200,300), ctx = c.getContext('2d');
  const draw = (daylight: number) => {ctx.fillStyle='#83ac9a';ctx.fillRect(0,0,200,300);api.drawCycleTint(ctx,200,300,daylight);return ctx.getImageData(100,0,1,300).data;};
  const day = draw(1), night = draw(0);
  const luminance = (p: any,i: number) => .2126*p[i]+.7152*p[i+1]+.0722*p[i+2];
  assert.ok(luminance(night,600)<luminance(day,600)-12,'night must be distinguishable');
  assert.ok(luminance(night,600)>85,'night must preserve fish readability');
  for(let i=4;i<night.length;i+=4)assert.ok(Math.abs(luminance(night,i)-luminance(night,i-4))<3,'lighting must remain smooth');
});
test('original caustic texture visibly lights pale sand while invalid bounds leave canvas intact', async () => {
  const api = await lighting();
  const textures = await import(compile(await readFile(new URL('aquaTextures.ts',base),'utf8')));
  const c = canvas.createCanvas(320,240), ctx = c.getContext('2d');
  ctx.fillStyle='#d0c6a1';ctx.fillRect(0,0,320,240);
  const baseline=Buffer.from(ctx.getImageData(0,0,320,240).data);
  const pattern=ctx.createPattern(textures.getCausticTexture(),'repeat');
  api.drawSandCaustics(ctx,pattern,0,{x:NaN,y:0,width:320,height:240},()=>170,1,240);
  api.drawSandCaustics(ctx,pattern,0,{x:0,y:0,width:0,height:240},()=>170,1,240);
  assert.deepEqual(Buffer.from(ctx.getImageData(0,0,320,240).data),baseline);
  api.drawSandCaustics(ctx,pattern,0,{x:0,y:0,width:320,height:240},()=>170,1,240);
  const pixels=ctx.getImageData(0,190,320,40).data;
  let visible=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i]-208>=4)visible++;
  assert.ok(visible>pixels.length/4*.15,'original network must create visibly brighter moving floor shapes');
});
test('all tanks share the original growing day and viewing night palette endpoints', async () => {
  const api = await lighting();
  assert.deepEqual(api.getTankPalette(1), {waterTop:'#8fd8d6',waterMid:'#4aa6c8',waterDeep:'#2f7f98',sand:'#e6d3ae',plant:'#6f8a4e',rock:'#8f8a80'});
  assert.deepEqual(api.getTankPalette(0), {waterTop:'#356c69',waterMid:'#143e46',waterDeep:'#08242d',sand:'#d0c6a1',plant:'#688e61',rock:'#899887'});
  const c=canvas.createCanvas(100,200), ctx=c.getContext('2d');
  const rgb=(day: number)=>{api.drawWaterBackground(ctx,100,200,day);return [...ctx.getImageData(50,100,1,1).data].slice(0,3);};
  const day=rgb(1), night=rgb(0), dawn=rgb(.5);
  const lum=(p: number[])=>p[0]*.2126+p[1]*.7152+p[2]*.0722;
  assert.ok(lum(day)>lum(night)+65,'day must replace dark base water, not merely tint it');
  dawn.forEach((v,i)=>assert.ok(Math.abs(v-(day[i]+night[i])/2)<=2));
  assert.deepEqual(api.getTankPalette(-1),api.getTankPalette(0));
  assert.deepEqual(api.getTankPalette(2),api.getTankPalette(1));
});
test('Home cached backgrounds visibly follow a changed clock without canvas allocations per frame', async () => {
  const api=await lighting();
  const source=await readFile(new URL('../components/HomeTank.tsx',base),'utf8');
  const setup=source.slice(source.indexOf('    const makeLayer ='), source.indexOf('    const render ='));
  const blend=source.slice(source.indexOf('      ctx.setTransform(1,0,0,1,0,0);'),source.indexOf('      if (pattern)'));
  let allocations=0;
  const document={createElement:()=>{allocations++;return canvas.createCanvas(1,1);}};
  const w=320,h=240,dpr=1,el=canvas.createCanvas(w,h),ctx=el.getContext('2d');
  const build=new Function('document','el','ctx','w','h','dpr','sandY','surface','decorScale','drawRock','drawPlant','plants','getTankPalette','drawWaterBackground',`${stripTypeScriptTypes(setup)}\nreturn daylight => {${blend}};`);
  const draw=build(document,el,ctx,w,h,dpr,h*.8,(x:number)=>h*.8+Math.sin(x/w*6+.5)*6,30,()=>{},()=>{},[],api.getTankPalette,api.drawWaterBackground);
  const allocated=allocations;
  draw(0);const night=Buffer.from(ctx.getImageData(150,100,1,1).data);
  draw(1);const day=Buffer.from(ctx.getImageData(150,100,1,1).data);
  assert.ok(day[1]>night[1]+60,'clock day must brighten the actual Home background');
  draw(0);assert.deepEqual(Buffer.from(ctx.getImageData(150,100,1,1).data),night);
  assert.equal(allocations,allocated,'rendering phase changes must reuse endpoint layers');
  assert.match(source,/drawSpecimenFish\(ctx,rig.fish,rig.palette,owned.get\(r.id\)!\)/);
});
