import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { stripTypeScriptTypes, createRequire } from 'node:module';
const root = new URL('../src/games/importedAippy/upstream/src/utils/', import.meta.url);
const modules = new Map<string,string>();
async function load(name:string):Promise<string> {
  if(modules.has(name))return modules.get(name)!;
  let source=await readFile(new URL(`${name}.ts`,root),'utf8');
  source=source.replace(/import type[\s\S]*?;/g,'');
  for(const match of [...source.matchAll(/from ['"](?:@\/utils\/|\.\/)([^'"]+)['"]/g)]) {
    source=source.replace(match[0],`from ${JSON.stringify(await load(match[1].replace(/\.ts$/,'')))}`);
  }
  const url=`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`;modules.set(name,url);return url;
}
const {createFish,computePose,fishScale}=await import(await load('fishModel'));
const {applySpecimenAppearance}=await import(await load('specimenAppearance'));
const {drawSpecimenFish,specimenMouthPoint,specimenAngelPose,fitSpecimenPortrait}=await import(await load('specimenRender'));
const {drawTail: drawAngelTail}=await import(await load('angelFins'));
const {STOCK_CATALOG}=await import(await load('stockCatalog'));
const {proj,P,setAngelPitch,NOSE,midY}=await import(await load('angelProject'));
let canvas: any;
for (const path of [process.env.FISH_CANVAS_MODULE, '@napi-rs/canvas', `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/@napi-rs/canvas`, '/workspace/scratch/8eda3f81b6a9/fish-qa-tools/node_modules/@napi-rs/canvas'].filter(Boolean)) {
  try { canvas=createRequire(import.meta.url)(path); break; } catch {}
}
if(canvas)(globalThis as any).document={createElement:()=>canvas.createCanvas(64,64)};
function specimen(stock:any,patch:any={}) {
  return {id:stock.id,name:stock.name,species:stock.species,growth:100,health:100,hunger:100,traits:[],color:stock.color,accent:stock.accent,raisedSeconds:600,origin:stock.id,
    inherited:{colorFamily:stock.colorFamily,finForm:stock.finForm,bodyShape:stock.bodyShape,finStyle:stock.finStyle,colorPattern:stock.colorPattern,parents:[]},...patch};
}
function render(s:any,L=85,yaw=0,pitch=0,w=180,h=110,x=w/2) {
  const c=canvas.createCanvas(w,h),ctx=c.getContext('2d'),f=createFish(w,h,L);
  Object.assign(f,{x,y:h/2,yaw,yawBody:yaw,yawTail:yaw,pitch,amp:0.13,phase:0.9,finPhase:1});
  const p=applySpecimenAppearance(f,s);drawSpecimenFish(ctx,f,p,s);return {c,f,p};
}
function stats(c:any) {
  const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  let n=0,x0=c.width,x1=0,y0=c.height,y1=0,saturation=0;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++) {const i=(y*c.width+x)*4;if(data[i+3]<100)continue;
    n++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
    saturation+=Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2]);}
  return {n,x0,x1,y0,y1,w:x1-x0,h:y1-y0,saturation:saturation/n};
}
test('authored bodies stay distinct with the same inherited fin style',{skip:!canvas},()=> {
  const base=specimen(STOCK_CATALOG[1]);
  const a=render({...base,inherited:{...base.inherited,bodyShape:'starter',finStyle:'rounded'}});
  const b=render({...base,inherited:{...base.inherited,bodyShape:'colorful',finStyle:'rounded'}});
  const c=render({...base,inherited:{...base.inherited,bodyShape:'angel',finStyle:'rounded'}},105);
  assert.ok(a.f.tr.hh[8]>b.f.tr.hh[8]*1.15,'native colorful slender hull retained');
  assert.ok(stats(c.c).h/stats(c.c).w>stats(a.c).h/stats(a.c).w*1.35,'original diamond body retained');
});
test('hybrid sail fins remain independent of starter and tropical body bases',{skip:!canvas},()=> {
  const base=specimen(STOCK_CATALOG[1]);
  for(const bodyShape of ['starter','colorful','angel']) {
    const rounded=render({...base,inherited:{...base.inherited,bodyShape,finStyle:'rounded'}});
    const sail=render({...base,inherited:{...base.inherited,bodyShape,finStyle:'sail'}});
    assert.ok(stats(sail.c).h>stats(rounded.c).h*1.22,`${bodyShape} inherited sail height`);
    assert.equal(rounded.f.tr.id,sail.f.tr.id);
    if(bodyShape !== 'angel') {
      const triangle=render({...base,inherited:{...base.inherited,bodyShape,finStyle:'triangle'}});
      assert.ok(triangle.f.tr.fins[0].skew>1 && rounded.f.tr.fins[0].skew<1,'triangle/rounded family stays independent of hull');
    }
  }
});
test('bred legacy-origin children keep their explicit inherited tail while historic legacy keeps its silhouette',()=> {
  const stock=specimen(STOCK_CATALOG[1]),tails: Record<string,number>={};
  for(const finForm of ['short','fan','veil']) {
    const child={...stock,origin:'legacy',inherited:{...stock.inherited,bodyShape:'starter',finForm}};
    const f=createFish(180,110,90);applySpecimenAppearance(f,child);tails[finForm]=f.tr.tail.TL;
    const angel=specimenAngelPose(f,{...child,inherited:{...child.inherited,bodyShape:'angel'}});
    assert.ok(angel.tailLength === (finForm==='short'?0.75:finForm==='veil'?1.3:1));
  }
  assert.ok(tails.short<tails.fan && tails.fan<tails.veil,'new inherited tails remain distinct on legacy-origin child');
  const historic={...stock,origin:'legacy',inherited:{colorFamily:'warm',finForm:'veil',parents:[]}};
  const f=createFish(180,110,90);applySpecimenAppearance(f,historic);
  assert.equal(f.tr.tail.TL,0.3,'historic legacy keeps original tail');
});
test('original angel tail mesh inherits independent short, fan and veil proportions',()=> {
  const stock=specimen(STOCK_CATALOG.find((item:any)=>item.id==='pearlangel'));
  const bounds: Record<string,{w:number;h:number}>={};
  for(const finForm of ['short','fan','veil']) {
    const child={...stock,origin:'legacy',inherited:{...stock.inherited,bodyShape:'angel',finForm}};
    const f=createFish(180,110,90); Object.assign(f,{amp:0,phase:0,finPhase:0});
    const points:number[][]=[];
    const ctx={beginPath(){},closePath(){},moveTo(x:number,y:number){points.push([x,y]);},lineTo(x:number,y:number){points.push([x,y]);},fill(){},stroke(){}};
    setAngelPitch();drawAngelTail(ctx,specimenAngelPose(f,child),{},1);
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    bounds[finForm]={w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
    assert.ok(points.every(p=>p.every(Number.isFinite)),'original mesh stays finite');
  }
  assert.ok(bounds.veil.w>bounds.fan.w*1.2 && bounds.fan.w>bounds.short.w*1.2,'veil trailing length survives original tail mesh');
  assert.ok(bounds.fan.h>bounds.veil.h*1.15 && bounds.veil.h>bounds.short.h*1.15,'fan width survives original tail mesh');
});
test('care and maturity develop colour without changing inherited pigments',{skip:!canvas},()=> {
  for(const id of ['rainbow','neon','koiangel']) {
    const s=specimen(STOCK_CATALOG.find((stock:any)=>stock.id===id));
    const dull={...s,health:30,hunger:10,growth:20,care:{colourQuality:0.2}};
    assert.ok(stats(render(s,66).c).saturation>stats(render(dull,66).c).saturation*1.2,`${id} well-cared colour`);
    assert.equal(dull.color,s.color);assert.equal(dull.inherited,s.inherited);
  }
});
test('angel snout projects through pitch and yaw in 3D and matches eating contact',()=> {
  const s=specimen(STOCK_CATALOG.find((stock:any)=>stock.id==='pearlangel'));
  for(const yaw of [0,Math.PI/2,Math.PI])for(const pitch of [-1.35,0,1.35]) {
    const f=createFish(400,400,100);Object.assign(f,{x:200,y:200,yaw,yawBody:yaw,yawTail:yaw,pitch,amp:0});
    const a=specimenAngelPose(f,s),mouth=specimenMouthPoint(f,s),x=NOSE+0.006,y=midY(NOSE)+0.008;
    const forward=x*Math.cos(pitch)+y*Math.sin(pitch),depth=forward*Math.sin(yaw),k=1/(1-0.13*depth);
    assert.ok(Math.hypot(mouth.x-(200+forward*Math.cos(yaw)*k*a.S),mouth.y-(200+(-x*Math.sin(pitch)+y*Math.cos(pitch))*k*a.S))<1e-6);
    if(canvas) { const rendered=render(s,100,yaw,pitch,400,400);assert.ok(stats(rendered.c).n>450,'dive keeps volume'); }
  }
  setAngelPitch();proj(0.3,0.2,0.1,0.4);const defaultY=P.y;
  specimenMouthPoint({...createFish(400,400,80),yaw:1.5,yawBody:1.5,yawTail:1.5,pitch:-1.35},s);proj(0.3,0.2,0.1,0.4);assert.equal(P.y,defaultY,'colony projection does not inherit controlled pitch');
});
test('stock portraits fit actual canvas and write review sheet',{skip:!canvas},async()=> {
  const stocks=[...STOCK_CATALOG,STOCK_CATALOG[1]],sheet=canvas.createCanvas(720,220),ctx=sheet.getContext('2d');
  ctx.fillStyle='#143640';ctx.fillRect(0,0,720,220);
  for(let i=0;i<stocks.length;i++) {
    const s=specimen(stocks[i]);if(i===7)s.inherited={...s.inherited,bodyShape:'colorful',finStyle:'sail',colorPattern:'rainbow'};
    const {c,f,p}=render(s,90); c.getContext('2d').clearRect(0,0,180,110); fitSpecimenPortrait(f,s); drawSpecimenFish(c.getContext('2d'),f,p,s); const bounds=stats(c);
    assert.ok(bounds.x0>3&&bounds.x1<177&&bounds.y0>3&&bounds.y1<107,`${s.name}: ${JSON.stringify(bounds)}`);
    ctx.drawImage(c,(i%4)*180,Math.floor(i/4)*110);ctx.fillStyle='#f6ead1';ctx.font='10px sans-serif';ctx.fillText(i===7?'Rainbow sail hybrid':s.name,(i%4)*180+7,Math.floor(i/4)*110+103);
  }
  await mkdir('test-results',{recursive:true});await writeFile('test-results/exotic-portraits.png',sheet.toBuffer('image/png'));
  const dives=canvas.createCanvas(1000,600),dc=dives.getContext('2d');dc.fillStyle='#143640';dc.fillRect(0,0,1000,600);
  for(let row=0;row<2;row++)for(let col=0;col<5;col++) {const s=specimen(STOCK_CATALOG[5+row]);const {c}=render(s,145,col*Math.PI/4,row===0?-1.35:1.35,200,300);dc.drawImage(c,col*200,row*300);}
  await writeFile('test-results/angel-dives.png',dives.toBuffer('image/png'));
});
