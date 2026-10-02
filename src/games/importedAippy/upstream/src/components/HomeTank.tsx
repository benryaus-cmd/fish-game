import { useEffect, useRef, useState } from 'react';
import type { Specimen } from '@/utils/boutique';
import { createFish, type Fish, type FishPalette } from '@/utils/fishModel';
import { drawFishShadow } from '@/utils/fishRender';
import { drawSpecimenFish } from '@/utils/specimenRender';
import { applySpecimenAppearance } from '@/utils/specimenAppearance';
import { drawPlant, type PlantDef } from '@/utils/plantRender';
import { drawRock } from '@/utils/rockRender';
import { drawWaterCaustics, getCausticPattern } from '@/utils/aquaScene';
import { drawSandCaustics, drawCycleTint, getTankPalette, drawWaterBackground } from '@/utils/tankLighting';
import { sampleWorldClock, type WorldClock } from '@/utils/worldClock';
import { canvasHomePoint, createHomeResidents, pickHomeResident, stepHomeResidents, type HomeAxis, type HomeResident } from '@/utils/homeScene';

export interface HomeTankProps {
  width: number; height: number; specimens: Specimen[]; controlledId: string | null;
  onSelect: (id: string) => void; paused?: boolean; worldClock?: WorldClock;
}
interface Rig { fish: Fish; palette: FishPalette; appearance: string }
const plants: PlantDef[] = Array.from({ length: 13 }, (_, i) => ({ kind: i % 3 === 0 ? 'leafy' : i % 3 === 1 ? 'tall' : 'grass', h: 1.4 + (i % 4) * 0.5, seed: 43 + i * 7, tone: i % 3 }));

export default function HomeTank({ width, height, specimens, controlledId, onSelect, paused = false, worldClock }: HomeTankProps) {
  const clockRef = useRef(worldClock), visualTime = useRef(0);
  clockRef.current = worldClock;
  const container = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const residents = useRef<HomeResident[]>([]), rigs = useRef(new Map<string, Rig>());
  const axis = useRef<HomeAxis>({ x: 0, y: 0 }), thumb = useRef<HTMLSpanElement>(null);
  const [measured, setMeasured] = useState({ width, height });
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width && rect.height) setMeasured(old => old.width === rect.width && old.height === rect.height ? old : { width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(el);
    return () => observer.disconnect();
  }, [width, height]);

  useEffect(() => {
    const el = canvas.current, ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const w = Math.max(1, measured.width), h = Math.max(1, measured.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = Math.round(w * dpr); el.height = Math.round(h * dpr);
    residents.current = createHomeResidents(specimens, w, h, controlledId, residents.current);
    const owned = new Map(specimens.map(s => [s.id, s]));
    for (const r of residents.current) {
      const specimen = owned.get(r.id)!;
      const appearance = JSON.stringify([specimen.color, specimen.accent, specimen.traits, specimen.growth, specimen.inherited, specimen.health, specimen.hunger, specimen.care]);
      let rig = rigs.current.get(r.id);
      if (!rig || rig.appearance !== appearance) {
        const fish = createFish(w, h, r.size);
        rig = { fish, palette: applySpecimenAppearance(fish, specimen), appearance };
        rigs.current.set(r.id, rig);
      }
      rig.fish.L = r.size;
    }
    for (const id of rigs.current.keys()) if (!residents.current.some(r => r.id === id)) rigs.current.delete(id);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const keys = new Set<string>();
    let frame = 0, staticTimer = 0, last = 0;
    const pattern = getCausticPattern(ctx);
    const sandY = h * 0.80;
    const surface = (x: number) => sandY + Math.sin(x / w * 6 + 0.5) * 6;
    const decorScale = Math.min(65, w * 0.12, h * 0.17);
    // Bake both clock endpoints once; daylight blends them without rebuilding canvases.
    const makeLayer = () => {
      const layer = document.createElement('canvas'); layer.width = el.width; layer.height = el.height;
      const paint = layer.getContext('2d')!; paint.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { layer, paint };
    };
    const backgrounds = [0, 1].map(daylight => {
      const { layer, paint: bg } = makeLayer(), palette = getTankPalette(daylight);
      drawWaterBackground(bg, w, h, daylight);
      const sand = bg.createLinearGradient(0, sandY, 0, h);
      sand.addColorStop(0, palette.sand); sand.addColorStop(0.18, palette.sand); sand.addColorStop(1, daylight ? '#c8b58e' : '#857b61');
      bg.fillStyle = sand; bg.beginPath(); bg.moveTo(0, surface(0));
      for (let x = 0; x <= w + 8; x += 8) bg.lineTo(x, surface(x)); bg.lineTo(w, h); bg.lineTo(0, h); bg.closePath(); bg.fill();
      for (let i = 0; i < 230; i++) {
        const x = (i * 73.31 % w), y = sandY + (i * 19.17 % Math.max(1, h - sandY));
        bg.fillStyle = i % 3 === 0 ? 'rgba(244,230,191,.23)' : 'rgba(58,69,55,.15)'; bg.fillRect(x, y, 1.2, 0.8);
      }
      for (let i = 0; i < 5; i++) {
        const x = w * [0.08, 0.19, 0.75, 0.89, 0.95][i];
        drawRock(bg, x, surface(x) + 5, { w: 1.2 + (i % 2) * 0.6, h: 0.65 + (i % 3) * 0.19, seed: 11 + i * 4, tone: i % 3 }, decorScale, palette.rock);
      }
      return layer;
    });
    // Separate endpoint contexts preserve plant material caches while stems keep swaying.
    const foliage = [makeLayer(), makeLayer()];
    const plantX = (i: number) => w * (i < 7 ? 0.015 + i * 0.047 : 0.73 + (i - 7) * 0.05);
    const drawFoliage = (pass: 'back' | 'front', sceneTime: number, daylight: number) => {
      foliage.forEach(({ layer, paint }, index) => {
        const alpha = index ? daylight : 1 - daylight;
        if (alpha <= 0) return;
        paint.clearRect(0, 0, w, h);
        const color = getTankPalette(index).plant;
        plants.forEach((p, i) => drawPlant(paint, plantX(i), surface(plantX(i)) + 3, p, decorScale, color, sceneTime, i < 7 ? 0.7 : 0.86, pass));
        ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(layer, 0, 0, w, h); ctx.restore();
      });
    };
    const render = (now: number) => {
      frame = 0;
      if (document.hidden) return;
      const dt = last ? Math.min(0.1,(now-last)/1000) : 0; last = now;
      const keyAxis = { x: Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a')), y: Number(keys.has('arrowdown') || keys.has('s')) - Number(keys.has('arrowup') || keys.has('w')) };
      const input = keys.size ? keyAxis : axis.current;
      if (!reduced.matches && !paused) visualTime.current += dt;
      const sceneTime = visualTime.current;
      const daylight = clockRef.current ? sampleWorldClock(clockRef.current, Date.now()).daylight : 1;
      // Reduced motion freezes autonomous swimming and planting, while deliberate control stays usable.
      if (!paused && !reduced.matches) residents.current = stepHomeResidents(residents.current,w,h,dt,controlledId,input);
      else if (!paused && controlledId) residents.current = residents.current.map(r => r.id === controlledId ? stepHomeResidents([r],w,h,dt,controlledId,input)[0] : r);
      ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha = 1; ctx.drawImage(backgrounds[0],0,0);
      ctx.globalAlpha = daylight; ctx.drawImage(backgrounds[1],0,0); ctx.globalAlpha = 1;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      if (pattern) {
        drawWaterCaustics(ctx, pattern, sceneTime, 0, 0, w, h, 0.016 * (0.2 + daylight * 0.8), h);
        drawSandCaustics(ctx, pattern, sceneTime, { x: 0, y: 0, width: w, height: h }, surface, daylight, h);
      }
      drawFoliage('back', sceneTime, daylight);
      for (const r of [...residents.current].sort((a,b)=>a.y-b.y)) {
        const rig = rigs.current.get(r.id)!;
        Object.assign(rig.fish,{x:r.x,y:r.y,L:r.size,phase:reduced.matches?0:r.phase,finPhase:reduced.matches?0:r.finPhase,amp:r.amp,pitch:r.pitch,yaw:r.yaw,yawBody:r.yawBody,yawTail:r.yawTail,dir:r.heading===0?1:-1});
        drawFishShadow(ctx,rig.fish,surface); drawSpecimenFish(ctx,rig.fish,rig.palette,owned.get(r.id)!);
        if (r.id === controlledId) {
          ctx.strokeStyle='rgba(246,221,158,.65)'; ctx.lineWidth=1.3; ctx.beginPath(); ctx.ellipse(r.x,r.y,r.size*0.9,Math.max(18,r.size*0.5),0,0,Math.PI*2); ctx.stroke();
        }
      }
      drawFoliage('front', sceneTime, daylight);
      if (!reduced.matches) for (let i=0;i<17;i++) {
        const x = (i*79.31+sceneTime*1.4)%w, y = (i*47.7+sceneTime*2)%sandY;
        ctx.fillStyle='rgba(232,241,211,.15)'; ctx.beginPath(); ctx.arc(x,y,i%3===0?1.3:0.7,0,Math.PI*2); ctx.fill();
      }
      drawCycleTint(ctx, w, h, daylight);
      if (!paused && (!reduced.matches || controlledId)) frame=requestAnimationFrame(render);
      else staticTimer=window.setTimeout(() => render(performance.now()), 1000);
    };
    const clearInput = () => { keys.clear(); axis.current={x:0,y:0}; if(thumb.current) thumb.current.style.transform='translate(0px, 0px)'; };
    const visibility = () => { cancelAnimationFrame(frame); clearTimeout(staticTimer); frame=0; last=0; clearInput(); if(!document.hidden) frame=requestAnimationFrame(render); };
    const key = (event: KeyboardEvent, down: boolean) => {
      if (!controlledId || paused || document.hidden || (event.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName))) return;
      const name=event.key.toLowerCase(); if(!['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(name)) return;
      event.preventDefault(); if(down)keys.add(name);else keys.delete(name);
    };
    const keydown=(event:KeyboardEvent)=>key(event,true), keyup=(event:KeyboardEvent)=>key(event,false);
    reduced.addEventListener('change',visibility);
    window.addEventListener('keydown',keydown); window.addEventListener('keyup',keyup); window.addEventListener('blur',clearInput); document.addEventListener('visibilitychange',visibility);
    // Static poses still sample the shared clock; reduced motion freezes moving light.
    render(performance.now());
    return () => { cancelAnimationFrame(frame); clearTimeout(staticTimer); clearInput(); reduced.removeEventListener('change',visibility); window.removeEventListener('keydown',keydown); window.removeEventListener('keyup',keyup); window.removeEventListener('blur',clearInput); document.removeEventListener('visibilitychange',visibility); };
  }, [measured, specimens, controlledId, paused]);

  const movePad = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect=event.currentTarget.getBoundingClientRect();
    const x=(event.clientX-rect.left-rect.width/2)/34, y=(event.clientY-rect.top-rect.height/2)/34;
    const length=Math.max(1,Math.hypot(x,y)); axis.current={x:x/length,y:y/length};
    if(thumb.current)thumb.current.style.transform=`translate(${axis.current.x*28}px, ${axis.current.y*28}px)`;
  };
  const stopPad = () => { axis.current={x:0,y:0}; if(thumb.current)thumb.current.style.transform='translate(0px, 0px)'; };
  return <div ref={container} style={{position:'absolute',inset:0,width:'100%',height:'100%',overflow:'hidden'}}>
    <canvas ref={canvas} role="img" aria-label={`Safe planted home aquarium with ${specimens.length} resident fish. Tap a fish to select it.`} style={{display:'block',width:'100%',height:'100%',touchAction:'manipulation'}} onPointerUp={event=>{
      if(paused)return; const rect=event.currentTarget.getBoundingClientRect(); const p=canvasHomePoint(event.clientX,event.clientY,rect,measured.width,measured.height);
      const id=pickHomeResident(residents.current,p.x,p.y); if(id)onSelect(id);
    }}/>
    {controlledId&&!paused&&<div style={{position:'absolute',right:18,bottom:105,display:'grid',justifyItems:'center',gap:7,color:'#fff3d6'}}>
      <div role="group" aria-label="Swimming joystick. Drag in any direction; keyboard arrows or W A S D also work." style={{width:104,height:104,borderRadius:'50%',background:'rgba(8,34,41,.72)',border:'1px solid rgba(234,214,167,.5)',display:'grid',placeItems:'center',touchAction:'none',userSelect:'none'}} onPointerDown={event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);movePad(event);}} onPointerMove={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))movePad(event);}} onPointerUp={stopPad} onPointerCancel={stopPad} onLostPointerCapture={stopPad}>
        <span ref={thumb} style={{width:44,height:44,borderRadius:'50%',background:'#d0ba85',boxShadow:'0 3px 12px #071f29',pointerEvents:'none'}}/>
      </div>
      <span style={{fontSize:11,letterSpacing:'.08em',textShadow:'0 1px 4px #09232a'}}>SWIM · ↑ ↓ ← →</span>
    </div>}
  </div>;
}
