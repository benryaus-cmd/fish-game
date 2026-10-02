import { useEffect, useRef, useState, useCallback, type PointerEvent } from 'react';
import { vibrate } from '@aippy/runtime/device';
import { drawWaterAtmosphere } from '@/utils/waterAtmosphere';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import { reportScore } from '@aippy/runtime/leaderboard';
import type { AquariumAudio } from '@/hooks/useAquariumAudio';
import tweaksConfig from '@/config/tweaksConfig.json';
import { useGameLoop } from '@/hooks/useGameLoop';
import { drawWaterCaustics, drawRays, getCausticPattern, type Ray } from '@/utils/aquaScene';
import { createBubbleSim, drawBubbles, updateBubbles } from '@/utils/aquaBubbles';
import { createMotes, drawMotes, updateMotes, type Mote } from '@/utils/aquaMotes';
import { getBubbleSprite, getDotSprite, mulberry } from '@/utils/aquaTextures';
import { makePalette, makeColorfulPalette, type Fish, type FishPalette } from '@/utils/fishModel';
import { drawFish, drawFishShadow } from '@/utils/fishRender';
import { drawCastle } from '@/utils/castleRender';
import { drawPlant } from '@/utils/plantRender';
import { drawRock } from '@/utils/rockRender';
import { InputManager } from '@/utils/playerInput';
import { createCamera, updateCamera, getCameraView, triggerCameraShake, worldSurfaceY, buildWorldScene, WORLD_WIDTH, WORLD_HEIGHT, NURSERY_ZONE, CASTLE_LANDMARK } from '@/utils/worldCamera';
import { createPlayerSurvival, updatePlayerFish, canStartBurst, type PlayerSurvivalState } from '@/utils/playerSurvival';
import { createPreyFish, createPredatorFish, updatePrey, updatePredator, type PreyEntity, type PredatorEntity } from '@/utils/survivalEcology';
import { createSurvivalJuice, spawnBurstWake, spawnEatGlints, updateSurvivalJuice, drawSurvivalJuice } from '@/utils/survivalJuice';
import { createSpecimen, appraiseFish, getStage, settleRun, finishDeath, rewardShrimpCatch, NURSERY_CAPACITY, type ActiveRun, type Adaptation, type BoutiqueSave, type Specimen } from '@/utils/boutique';
import { applySpecimenAppearance, specimenModifiers } from '@/utils/specimenAppearance';
import { drawSpecimenFish, specimenMouthPoint } from '@/utils/specimenRender';
import { createBottomEcology, updateBottomEcology, biteShrimp, drawBottomEcology } from '@/utils/bottomEcology';
import { isInNursery, drawNurseryCover } from '@/utils/nurseryCover';
import GardenHUD from '@/components/GardenHUD';
import FishPortrait from '@/components/FishPortrait';
import FishCarePanel from '@/components/FishCarePanel';
import { useHomeSheet } from '@/components/HomeScreen';
import { ensureSpecimenCare, advanceSpecimenCare, feedSpecimen, careSummary, chooseDevelopment } from '@/utils/specimenCare';
import { cleanTank } from '@/utils/tankCare';
import { CASTLE_HEAL_PER_SECOND, inCastleHealingPlume, drawCastleBubbles } from '@/utils/castleHealing';
import { createAquariumView, updateAquariumView, drawAquariumView, pickAquariumViewFish } from '@/utils/aquariumView';
import { drawSandCaustics, drawCycleTint, getTankPalette } from '@/utils/tankLighting';
import { sampleWorldClock } from '@/utils/worldClock';
import { createFoodEcology, updateFoodEcology, drawFoodEcology, biteFood, BITE_INTERVAL_SECONDS } from '@/utils/foodEcology';
const tweaks = aippyTweaks(tweaksConfig);
const NOOP = () => {};
interface AquariumProps {
  mode: 'view' | 'swim';
  onSelectFish: (id: string) => void;
  width: number;
  height: number;
  profile: BoutiqueSave;
  onProfileChange: (save: BoutiqueSave) => boolean;
  onOpenShop: () => void;
  onChooseStock: () => void;
  audio: AquariumAudio;
  paused: boolean;
  displaySpecimen: Specimen | null;
  saved: boolean;
}
const Aquarium = ({
  width,
  height, profile, onProfileChange, onOpenShop, onChooseStock, paused, displaySpecimen, saved, audio, mode, onSelectFish
}: AquariumProps) => {
  // Tweaks parameters
  const waterTop = tweaks.waterTopColor.useState();
  const waterMid = tweaks.waterMidColor.useState();
  const waterDeep = tweaks.waterDeepColor.useState();
  const sandColor = tweaks.sandColor.useState();
  const rayIntensity = tweaks.lightRayIntensity.useState();
  const causticIntensity = tweaks.causticIntensity.useState();
  const bubbleAmount = tweaks.bubbleAmount.useState();
  const particleAmount = tweaks.particleAmount.useState();
  const animationSpeed = tweaks.animationSpeed.useState();
  const showSoundButton = tweaks.showSoundButton.useState();
  const fishColor = tweaks.fishColor.useState();
  const colorfulColor = tweaks.colorfulFishColor.useState();
  const colorfulAccent = tweaks.colorfulAccentColor.useState();
  const castleColor = tweaks.castleColor.useState();
  const rockColor = tweaks.rockColor.useState();
  const plantColor = tweaks.plantColor.useState();

  const { initAudio, toggleSound, soundEnabled, playBiteSound, playBurstSound, playDamageSound } = audio;

  // Player Survival State (React for HUD, updated throttled)
  const [hudState, setHudState] = useState({
    health: 100,
    hunger: 100,
    stamina: 100,
    burstCooldown: 0, burstExhausted: false, isBursting: false,
    growth: 0,
    inShelter: true,
    isDead: false,
    score: 0
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [mealNotice, setMealNotice] = useState('');
  useEffect(() => { if (!mealNotice) return; const timer = window.setTimeout(() => setMealNotice(''), 2200); return () => window.clearTimeout(timer); }, [mealNotice]);
  const detailsSheetRef = useHomeSheet(detailsOpen, () => setDetailsOpen(false));
  const [appraisalOpen, setAppraisalOpen] = useState(false);
  const [choiceStage, setChoiceStage] = useState(0);
  const [chosenTraits, setChosenTraits] = useState<Adaptation[]>([]);
  const [deathComplete, setDeathComplete] = useState(false);
  const [viewDeathName,setViewDeathName]=useState('');
  const deathStartedRef = useRef<number | null>(null);
  const viewStateRef = useRef(createAquariumView());
  const [receipt, setReceipt] = useState<{ kind: 'sell' | 'keep'; value: number; specimen: Specimen } | null>(null);
  const [fishName, setFishName] = useState('Coral');
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const viewportRef = useRef({ width, height });
  viewportRef.current = { width, height };
  const specimenRef = useRef<Specimen>(displaySpecimen ?? profile.activeRun?.specimen ?? createSpecimen());
  const runMetadataRef = useRef(profile.activeRun);
  const endedRef = useRef(false);
  const modalRef = useRef(false);
  modalRef.current = paused || (mode === 'swim' && (detailsOpen || appraisalOpen || choiceStage > 0 || receipt !== null));
  const checkpointRef = useRef(0);
  const stickKnobRef = useRef<HTMLDivElement>(null);
  const displayPalettesRef = useRef(new Map<number, FishPalette>());

  // Simulation Refs
  const inputManagerRef = useRef<InputManager | null>(null);
  const cameraRef = useRef(createCamera());
  const survivalRef = useRef<PlayerSurvivalState>(createPlayerSurvival());
  const juiceRef = useRef(createSurvivalJuice());
  const worldSceneRef = useRef(buildWorldScene());

  // Entities
  const foodRef = useRef(createFoodEcology());
  const bottomRef = useRef(createBottomEcology());
  const biteCooldownRef = useRef(0);
  const playerRef = useRef<Fish | null>(null);
  const preyListRef = useRef<PreyEntity[]>([]);
  const secondPredatorRef = useRef<PredatorEntity | null>(null);
  const predatorRef = useRef<PredatorEntity | null>(null);

  // Environment elements
  const bubblesRef = useRef(createBubbleSim());
  const motesRef = useRef<Mote[]>([]);
  const raysRef = useRef<Ray[]>([]);
  const timeRef = useRef(0);
  const hudUpdateTimerRef = useRef(0);
  const startLengthRef = useRef(75);

  // Palettes
  const playerPalRef = useRef<FishPalette | null>(null);
  const preyStarterPalRef = useRef<FishPalette | null>(null);
  const preyColorfulPalRef = useRef<FishPalette | null>(null);
  const predatorPalRef = useRef<FishPalette | null>(null);

  const snapshot = useCallback((): ActiveRun | null => {
    const fish = playerRef.current;
    const state = survivalRef.current;
    const current = profileRef.current.activeRun;
    if (!current || current.specimen.id !== runMetadataRef.current?.specimen.id || current.visitId !== runMetadataRef.current?.visitId) return null;
    if (!fish || endedRef.current || displaySpecimen || !runMetadataRef.current) return null;
    return { ...runMetadataRef.current, specimen: { ...specimenRef.current, growth: state.growth, health: state.health, hunger: state.hunger },
      x: fish.x, y: fish.y, stamina: state.stamina };
  }, [displaySpecimen]);

  const persistDefeat = useCallback(() => {
    if (displaySpecimen || !survivalRef.current.isDead) return false;
    const current = profileRef.current;
    if (!current.activeRun) return true;
    const runId = specimenRef.current.id;
    if (current.activeRun.specimen.id !== runId || current.activeRun.visitId !== runMetadataRef.current?.visitId) return false;
    const next = finishDeath({ ...current, activeRun: { ...current.activeRun, specimen: { ...specimenRef.current, health:0 } } },runId,Date.now());
    if (!onProfileChange(next)) return false;
    profileRef.current = next;
    return true;
  }, [displaySpecimen, onProfileChange]);

  const saveRun = useCallback(() => {
    if (endedRef.current && survivalRef.current.isDead) return false;
    const current=profileRef.current.activeRun;
    if(!current || current.specimen.id!==runMetadataRef.current?.specimen.id || current.visitId!==runMetadataRef.current?.visitId)return false;
    const activeRun = snapshot();
    if (!activeRun) return false;
    const next = { ...profileRef.current, activeRun };
    if (!onProfileChange(next)) return false;
    profileRef.current = next;return true;
  }, [snapshot, onProfileChange, persistDefeat]);

  useEffect(() => {
    const settleAbsence=()=>{
      const active=snapshot();if(!active)return;
      const fish=advanceSpecimenCare(active.specimen,Date.now(),'growing','away');
      const next={...profileRef.current,activeRun:{...active,specimen:fish}};
      specimenRef.current=fish;survivalRef.current.health=fish.health;survivalRef.current.hunger=fish.hunger;survivalRef.current.growth=fish.growth;
      if(onProfileChange(next))profileRef.current=next;
    };
    // Visibility events run before the next frame, keeping hidden growth out of
    // the present-player choice queue even when the page returns without reload.
    const saveOnHide = () => { settleAbsence(); if (document.hidden) saveRun(); };
    window.addEventListener('pagehide', saveRun);
    document.addEventListener('visibilitychange', saveOnHide);
    return () => {
      saveRun();
      window.removeEventListener('pagehide', saveRun);
      document.removeEventListener('visibilitychange', saveOnHide);
    };
  }, [saveRun]);

  // Setup input manager once
  useEffect(() => {
    const im = new InputManager(() => !modalRef.current && !survivalRef.current.isDead);
    inputManagerRef.current = im;
    return () => {
      im.destroy();
    };
  }, []);

  // Update rays
  useEffect(() => {
    const rnd = mulberry(12345);
    const count = 12;
    const rays: Ray[] = [];
    for (let i = 0; i < count; i++) {
      rays.push({
        x: (i + 0.5 + (rnd() - 0.5) * 0.5) / count * WORLD_WIDTH * 1.05,
        width: 170 * (0.8 + rnd() * 0.6),
        len: WORLD_HEIGHT * (1.45 + rnd() * 0.35),
        angle: 0.17 + (rnd() - 0.5) * 0.08,
        alpha: 0.045 + rnd() * 0.045,
        ph: rnd() * 6.28,
        sp: 0.02 + rnd() * 0.02
      });
    }
    raysRef.current = rays;
    motesRef.current = createMotes(WORLD_WIDTH, WORLD_HEIGHT, particleAmount * 1.5);
  }, [particleAmount]);

  // Palettes update
  useEffect(() => {
    // Distinctive warm coral/gold player appearance
    if (playerRef.current) playerPalRef.current = applySpecimenAppearance(playerRef.current, specimenRef.current);
    preyStarterPalRef.current = makePalette(fishColor);
    preyColorfulPalRef.current = makeColorfulPalette(colorfulColor, colorfulAccent);
    // Predator dark contrasting silhouette
    predatorPalRef.current = makePalette('#2a3845');
  }, [fishColor, colorfulColor, colorfulAccent]);

  // Restart / Reset Game session
  const restartGame = useCallback(() => {
    const resume = displaySpecimen ? null : profileRef.current.activeRun;
    runMetadataRef.current = resume;
    specimenRef.current = ensureSpecimenCare(displaySpecimen ?? resume?.specimen ?? createSpecimen(), Date.now());
    foodRef.current = createFoodEcology(); biteCooldownRef.current = 0;
    bottomRef.current = createBottomEcology();
    deathStartedRef.current = null; setDeathComplete(false);
    setDetailsOpen(false);
    endedRef.current = false;
    setAppraisalOpen(false); setChoiceStage(0); setReceipt(null);
    inputManagerRef.current?.resetInput();
    const startL = 72;
    startLengthRef.current = startL;
    survivalRef.current = createPlayerSurvival();
    const state = survivalRef.current;
    state.growth = specimenRef.current.growth;
    state.health = specimenRef.current.health;
    state.hunger = specimenRef.current.hunger;
    state.stamina = resume?.stamina ?? 100;
    state.isDead = state.health <= 0;

    // Spawn player in nursery
    const startX = Math.max(45, Math.min(WORLD_WIDTH - 45, resume?.x ?? 380));
    const startY = Math.max(60, Math.min(worldSurfaceY(startX) - 40, resume?.y ?? 1520));
    const p = createPreyFish(1, startX, startY, startL * (1 + state.growth / 100 * 0.6), 'starter').fish;
    p.dir = 1;
    p.yaw = p.yawBody = p.yawTail = 0;
    p.speed = 0;
    playerRef.current = p;
    playerPalRef.current = applySpecimenAppearance(p, specimenRef.current);

    // Reset camera onto player
    const cam = cameraRef.current = createCamera();
    const viewport = viewportRef.current;
    if (reducedMotion) cam.zoom = 1;
    cam.x = Math.max(0, Math.min(Math.max(0, WORLD_WIDTH - viewport.width / cam.zoom), startX - viewport.width / cam.zoom / 2));
    cam.y = Math.max(0, Math.min(Math.max(0, WORLD_HEIGHT - viewport.height / cam.zoom), startY - viewport.height / cam.zoom / 2));

    // Spawn 24 prey distributed across feeding zone and open waters
    const prey: PreyEntity[] = [];
    const rnd = mulberry(55123);
    for (let i = 0; i < 24; i++) {
      const speciesId = i % 2 === 0 ? 'starter' : 'colorful';
      // Prey sizes: 38% to 62% of starting player length so they are edible
      const preyL = startL * (0.42 + rnd() * 0.2);
      const px = i < 4 ? 730 + rnd() * 180 : 750 + rnd() * 1450;
      const py = i < 4 ? 1380 + rnd() * 150 : 350 + rnd() * 1100;
      prey.push(createPreyFish(100 + i, px, py, preyL, speciesId));
    }
    preyListRef.current = prey;
    displayPalettesRef.current.clear();
    if (displaySpecimen) {
      preyListRef.current = profileRef.current.kept.filter(fish => fish.id !== displaySpecimen.id).slice(0, 20).map((fish, i) => {
        const entity = createPreyFish(100 + i, 650 + rnd() * 1400, 450 + rnd() * 850, startL * (1 + fish.growth / 100 * 0.6));
        displayPalettesRef.current.set(entity.fish.id, applySpecimenAppearance(entity.fish, fish));
        return entity;
      });
    }

    // Spawn 1 Predator far away in deep open water (X: 1950, Y: 800)
    predatorRef.current = createPredatorFish(WORLD_WIDTH*.7, 800, startL * 1.75);
    secondPredatorRef.current = createPredatorFish(WORLD_WIDTH*.47, 480, startL * 1.55);

    // Reset juice
    juiceRef.current = createSurvivalJuice();
    setHudState({
      health: Math.round(state.health), hunger: Math.round(state.hunger), stamina: Math.round(state.stamina), burstCooldown: state.burstCooldown, burstExhausted: state.burstExhausted, isBursting: state.isBursting, growth: Math.round(state.growth),
      inShelter: isInNursery(startX, startY), isDead: state.isDead, score: state.growth
    });
    saveRun();
  }, [displaySpecimen, saveRun]);

  // Initial spawn
  useEffect(() => {
    if(!playerRef.current || (profile.activeRun && (endedRef.current || profile.activeRun.specimen.id!==runMetadataRef.current?.specimen.id || profile.activeRun.visitId!==runMetadataRef.current?.visitId))) restartGame();
  }, [restartGame, profile.activeRun?.specimen.id, profile.activeRun?.visitId]);

  // In View, the profile's real-time care/paid actions are authoritative. Swim
  // checkpoints own live damage and motion, so a background tick cannot rewind it.
  useEffect(() => {
    const active=profile.activeRun;
    if(mode==='view'){inputManagerRef.current?.resetInput();if(playerRef.current){playerRef.current.speed=0;playerRef.current.vy=0;}}
    if(mode==='view'&&active&&active.specimen.id===specimenRef.current.id&&!endedRef.current){
      specimenRef.current=active.specimen; runMetadataRef.current=active;
      survivalRef.current.health=active.specimen.health; survivalRef.current.hunger=active.specimen.hunger;survivalRef.current.growth=active.specimen.growth;
    }
  },[profile,mode]);

  // Joystick touch handlers
  const handleJoyPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    void initAudio();
    e.currentTarget.setPointerCapture(e.pointerId);
    inputManagerRef.current?.onJoyStart(e.pointerId, e.clientX, e.clientY);
  };
  const handleJoyPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    inputManagerRef.current?.onJoyMove(e.pointerId, e.clientX, e.clientY);
    const knob = inputManagerRef.current?.getKnobOffset();
    if (stickKnobRef.current && knob) stickKnobRef.current.style.transform = 'translate(' + knob.x + 'px,' + knob.y + 'px)';
  };
  const handleJoyPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // safe
    }
    inputManagerRef.current?.onJoyEnd(e.pointerId);
    if (stickKnobRef.current) stickKnobRef.current.style.transform = '';
  };

  // Burst touch handlers
  const handleBurstPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    void initAudio();
    e.currentTarget.setPointerCapture(e.pointerId);
    inputManagerRef.current?.onBurstStart(e.pointerId);
  };
  const handleBurstPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // safe
    }
    inputManagerRef.current?.onBurstEnd(e.pointerId);
  };

  const handleEatPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    void initAudio(); e.currentTarget.setPointerCapture(e.pointerId);
    inputManagerRef.current?.onEatStart(e.pointerId);
  };
  const handleEatPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* released */ }
    inputManagerRef.current?.onEatEnd(e.pointerId);
  };
  useEffect(() => { if (paused || detailsOpen || appraisalOpen || choiceStage || receipt) inputManagerRef.current?.resetInput(); }, [paused, detailsOpen, appraisalOpen, choiceStage, receipt]);

  // Main Simulation & Render Loop
  const {
    canvasRef
  } = useGameLoop({
    width,
    height,
    maxFPS: paused || (mode === 'swim' && (detailsOpen || appraisalOpen || choiceStage > 0 || receipt)) ? 10 : 60,
    designWidth: 0
  }, ({
    deltaTime,
    width: vW,
    height: vH
  }) => {
    // Avoid time accumulation if tab was backgrounded
    if (document.hidden || modalRef.current) return;
    const dt = Math.min(deltaTime * animationSpeed, 0.05);
    if (dt <= 0) return;
    timeRef.current += dt;
    const player = playerRef.current;
    const survival = survivalRef.current;
    const input = inputManagerRef.current?.getInput() || {
      x: 0,
      y: 0,
      active: false,
      burst: false
    };
    const cam = cameraRef.current;
    const predator = predatorRef.current;
    const juice = juiceRef.current;
    if (!player || !predator) return;
    if(mode==='view'){
      updateAquariumView(viewStateRef.current,profileRef.current,vW,vH,reducedMotion?0:dt);
      updateBottomEcology(bottomRef.current,dt,{x:-1000,y:0,L:1,growth:0},worldSurfaceY,{damageEnabled:false});
      for (const hunter of [predator, secondPredatorRef.current]) if(hunter) updatePredator(hunter,{...player,x:-1000,y:0}, {...survival,isInNursery:true},dt,worldSurfaceY,NOOP);
      const current=profileRef.current;
      const dead=[...current.kept,...(current.activeRun?[current.activeRun.specimen]:[])].find(f=>f.health<=0);
      if(dead){
        const now=Date.now();
        if(!dead.deathAtMs){const fish={...dead,deathAtMs:now};const next={...current,kept:current.kept.map(f=>f.id===dead.id?fish:f),activeRun:current.activeRun?.specimen.id===dead.id?{...current.activeRun,specimen:fish}:current.activeRun};if(onProfileChange(next))profileRef.current=next;}
        else if(now-dead.deathAtMs>=4000){const next=finishDeath(current,dead.id,now);if(next!==current&&onProfileChange(next)){profileRef.current=next;if(runMetadataRef.current?.specimen.id===dead.id){endedRef.current=true;runMetadataRef.current=null;}setViewDeathName(dead.name);}}
      }
      return;
    }
    const previousPlayerX = player.x;
    const previousPlayerY = player.y;

    // Nursery Shelter Check: player in X: 160..720, Y > 1250
    const inShelter = isInNursery(player.x, player.y);

    if (!displaySpecimen && !survival.isDead) {
      specimenRef.current = advanceSpecimenCare({ ...specimenRef.current, health: survival.health, hunger: survival.hunger, growth: survival.growth }, Date.now(), 'growing','present');
      survival.health = specimenRef.current.health;
      survival.hunger = specimenRef.current.hunger;
      survival.growth = specimenRef.current.growth;
      player.L = startLengthRef.current * (1 + survival.growth / 100 * 0.6);
    }
    updateFoodEcology(foodRef.current, Math.min(deltaTime, 0.05));


    // Sound trigger on burst start
    if (input.burst && canStartBurst(survival) && !survival.isBursting) {
      playBurstSound();
    }

    // Update Player
    if (!survival.isDead) {
      updatePlayerFish(player, input, survival, dt, {
        w: WORLD_WIDTH,
        h: WORLD_HEIGHT,
        surfaceY: worldSurfaceY
      }, inShelter, specimenModifiers(specimenRef.current));

      // Burst bubble wake
      if (survival.isBursting && Math.random() < 0.6) {
        const tailX = player.x - Math.cos(player.yawBody) * player.L * 0.45;
        const tailY = player.y - Math.sin(player.pitch) * player.L * 0.2;
        spawnBurstWake(juice, tailX, tailY, Math.cos(player.yawBody));
      }

      // A bite only occurs on EAT; touching food while swimming never eats it.
      if (input.eat && Date.now() >= biteCooldownRef.current && !displaySpecimen) {
        biteCooldownRef.current = Date.now() + BITE_INTERVAL_SECONDS * 1000;
        player.mouth = 1;
        const mouth = specimenMouthPoint(player, specimenRef.current);
        let meal = biteFood(foodRef.current, mouth, player, survival.growth);
        if (!meal && biteShrimp(bottomRef.current, mouth, player, survival.growth)) meal = 'prey';
        if (meal) {
          const phase = profileRef.current.worldClock ? sampleWorldClock(profileRef.current.worldClock, Date.now()).phase : 'day';
          const beforeHealth=specimenRef.current.health;
          const beforeCare=careSummary(specimenRef.current);
          const nextStage=specimenRef.current.growth < 35 ? 'juvenile' : 'adult';
          const beforeReady=nextStage==='juvenile' ? Math.max(0,280-beforeCare.healthySeconds) : beforeCare.adultReadyInSeconds;
          specimenRef.current = feedSpecimen(specimenRef.current, meal, Date.now(), phase);
          survival.hunger = specimenRef.current.hunger;
          survival.health = specimenRef.current.health;
          const afterCare=careSummary(specimenRef.current);
          const afterReady=nextStage==='juvenile' ? Math.max(0,280-afterCare.healthySeconds) : afterCare.adultReadyInSeconds;
          const savedSeconds=Math.max(0,Math.round(beforeReady-afterReady));
          const growthCredit = Math.max(0, Math.round(afterCare.healthySeconds - beforeCare.healthySeconds));
          const growthNotice = specimenRef.current.growth >= 75 ? '' : savedSeconds > 0
            ? ` · ${savedSeconds}s saved to ${nextStage}`
            : growthCredit > 0 ? ` · +${growthCredit}s growth credit (minimum age applies)` : ' · Growth time credit full';
          let creditAwarded=false;
          if(meal==='prey'){
            const active=snapshot();
            if(active){const current=profileRef.current,next=rewardShrimpCatch(current,active);
              if(next!==current&&onProfileChange(next)){profileRef.current=next;creditAwarded=true;}
            }
          }
          setMealNotice(specimenRef.current.health<beforeHealth ? `Overfed · −${Math.round(beforeHealth-specimenRef.current.health)} health${growthNotice}. Let your fish digest.` : `${meal === 'prey' ? 'Shrimp eaten' : meal === 'algae' ? 'Algae grazed' : meal === 'pellet' ? 'Pellet eaten' : 'Flake eaten'} · nourishment ${Math.round(specimenRef.current.care?.nutrition ?? 0)}%${growthNotice}`);
          if(creditAwarded)setMealNotice(notice=>`${notice} · +1 credit`);
          spawnEatGlints(juice, mouth.x, mouth.y, player.L); playBiteSound();
        }
      }
    }

    if(!survival.isDead&&survival.health>0&&inCastleHealingPlume(player.x,player.y)){
      survival.health=Math.min(100,survival.health+CASTLE_HEAL_PER_SECOND*dt*specimenModifiers(specimenRef.current).recoveryMultiplier);
    }
    if(survival.health<=0)survival.isDead=true;

    if (!displaySpecimen && !survival.isDead) {
      const hit = updateBottomEcology(bottomRef.current, dt, { x: player.x, y: player.y, L: player.L, growth: survival.growth, inShelter }, worldSurfaceY);
      if (hit && survival.invulnerableTime <= 0) {
        survival.health = Math.max(0, survival.health - hit.amount);
        survival.invulnerableTime = 1.8; survival.damageFlash = 1;
        survival.isDead = survival.health <= 0;
        triggerCameraShake(cam, 0.2); playDamageSound(); void vibrate(45).catch(NOOP);
      }
    }

    // Update Prey
    const ecologyView = getCameraView(cam, vW, vH);
    updatePrey(preyListRef.current, player, predator, dt, ecologyView.x, ecologyView.y, ecologyView.width, ecologyView.height, worldSurfaceY);

    // Update Predator
    if (!displaySpecimen) for (const hunter of [predator, secondPredatorRef.current]) if(hunter) updatePredator(hunter, player, survival, dt, worldSurfaceY, () => {
      // A hit gives seven seconds of breathing room from both hunters.
      if (survival.invulnerableTime <= 0 && !survival.isDead) {
        for (const other of [predator, secondPredatorRef.current]) {
          if (other) other.attackCooldown = Math.max(other.attackCooldown, 7 + dt);
        }
        survival.health = Math.max(0, survival.health - 8);
        survival.isDead = survival.health <= 0;
        survival.invulnerableTime = 1.8;
        survival.damageFlash = 1.0;
        triggerCameraShake(cam, 0.3);
        playDamageSound(); void vibrate([35,20,65]).catch(NOOP);
      }
    });

    // Commit zero health before the farewell so reload cannot resurrect a fish.
    if (survival.isDead && !displaySpecimen) {
      if(deathStartedRef.current===null){
        deathStartedRef.current=specimenRef.current.deathAtMs ?? Date.now();
        specimenRef.current={...specimenRef.current,health:0,deathAtMs:deathStartedRef.current};
        inputManagerRef.current?.resetInput();saveRun();
      }
      player.speed=0;player.y=Math.max(70,player.y-dt*Math.min(90,vH/6));player.pitch=0;
      if(Date.now()-deathStartedRef.current>=4000&&!deathComplete){
        if(!survival.scoreReported){survival.scoreReported=true;reportScore(Math.round(survival.growth));}
        endedRef.current=true;setDeathComplete(true);persistDefeat();
      }
    }

    // Camera Follow with Lookahead
    const lookAhead = survival.isBursting ? 120 : 60;
    const lookAheadX = Math.cos(player.yawBody) * Math.cos(player.pitch) * lookAhead;
    const lookAheadY = -Math.sin(player.pitch) * lookAhead;
    if(!survival.isDead)updateCamera(cam, player.x, player.y, vW, vH, dt, lookAheadX, lookAheadY,
      { speed: Math.hypot(player.x - previousPlayerX, player.y - previousPlayerY) / dt, bodyLength: player.L, reducedMotion });

    // Environmental particles & bubbles
    updateBubbles(bubblesRef.current, dt, WORLD_WIDTH, WORLD_HEIGHT, worldSurfaceY, bubbleAmount, NOOP);
    updateMotes(motesRef.current, dt, WORLD_WIDTH, WORLD_HEIGHT);
    updateSurvivalJuice(juice, dt);
    checkpointRef.current += dt;
    if (!displaySpecimen && !survival.isDead && checkpointRef.current > 3) { checkpointRef.current = 0; saveRun(); }

    // Throttled HUD sync to React (10Hz)
    hudUpdateTimerRef.current += dt;
    if (hudUpdateTimerRef.current >= 0.1) {
      hudUpdateTimerRef.current = 0;
      setHudState({
        health: Math.round(survival.health),
        hunger: Math.round(survival.hunger),
        stamina: Math.round(survival.stamina),
        burstCooldown: survival.burstCooldown, burstExhausted: survival.burstExhausted, isBursting: survival.isBursting,
        growth: Math.round(survival.growth),
        inShelter: survival.isInNursery,
        isDead: survival.isDead,
        score: Math.round(survival.growth)
      });
    }
  }, (ctx, {
    width: vW,
    height: vH
  }) => {
    const cam = cameraRef.current;
    const player = playerRef.current;
    const predator = predatorRef.current;
    const survival = survivalRef.current;
    const t = timeRef.current;
    const daylight = profileRef.current.worldClock ? sampleWorldClock(profileRef.current.worldClock, Date.now()).daylight : 1;
    if(mode==='view'){
      drawAquariumView(ctx,viewStateRef.current,profileRef.current,bottomRef.current,predator,predatorPalRef.current,vW,vH,reducedMotion?0:t,daylight,secondPredatorRef.current);
      return;
    }
    const tankPalette = getTankPalette(daylight);
    // Three fixed decor palettes bound gradient/sprite rebuilds during dawn/dusk.
    const decorPalette = getTankPalette(Math.round(daylight * 2) / 2);
    const juice = juiceRef.current;
    const bubbleSprite = getBubbleSprite();
    const dotSprite = getDotSprite();

    // Viewport bounds in world coords (for culling)
    const view = getCameraView(cam, vW, vH);
    const renderCamX = view.x;
    const renderCamY = view.y;
    const viewLeft = renderCamX - 100;
    const viewRight = renderCamX + view.width + 100;
    const viewTop = renderCamY - 100;
    const viewBottom = renderCamY + view.height + 100;

    // 1. Screen Space Background (soft underwater gradient matching depth)
    const bgGrad = ctx.createLinearGradient(0, -renderCamY * view.zoom, 0, (WORLD_HEIGHT - renderCamY) * view.zoom);
    bgGrad.addColorStop(0, tankPalette.waterTop);
    bgGrad.addColorStop(0.5, tankPalette.waterMid);
    bgGrad.addColorStop(1, tankPalette.waterDeep);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, vW, vH);
    drawWaterAtmosphere(ctx,vW,vH,reducedMotion?0:t,daylight,renderCamX,renderCamY);

    // 2. World Space Layer
    ctx.save();
    // Apply Camera Transform
    ctx.scale(view.zoom, view.zoom);
    ctx.translate(-renderCamX, -renderCamY);

    // Light Rays
    ctx.globalCompositeOperation = 'lighter';
    drawRays(ctx, raysRef.current, t, rayIntensity * (0.15 + daylight * 0.85));

    // Caustics
    const pat = getCausticPattern(ctx);
    if (pat && causticIntensity > 0) {
      drawWaterCaustics(ctx, pat, t, renderCamX, renderCamY, view.width, view.height, 0.018 * causticIntensity * (0.2 + daylight * 0.8), WORLD_HEIGHT);
    }
    ctx.globalCompositeOperation = 'source-over';

    // Distant motes & bubbles
    drawMotes(ctx, motesRef.current, dotSprite, false);
    drawBubbles(ctx, bubblesRef.current, bubbleSprite, WORLD_HEIGHT, true);

    // World Floor Sand Layer
    ctx.fillStyle = tankPalette.sand;
    ctx.beginPath();
    ctx.moveTo(viewLeft - 50, WORLD_HEIGHT + 50);
    ctx.lineTo(viewLeft - 50, worldSurfaceY(viewLeft - 50));
    for (let x = viewLeft - 20; x <= viewRight + 50; x += 30) {
      ctx.lineTo(x, worldSurfaceY(x));
    }
    ctx.lineTo(viewRight + 50, WORLD_HEIGHT + 50);
    ctx.closePath();
    ctx.fill();

    // Sand shading edge
    ctx.strokeStyle = 'rgba(20, 60, 75, 0.25)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    if (pat) drawSandCaustics(ctx, pat, t, view, worldSurfaceY, daylight * causticIntensity, WORLD_HEIGHT);

    // Landmarks: Castle (at bottom-right sand)
    const castle = CASTLE_LANDMARK;
    if (castle.cx + castle.size >= viewLeft && castle.cx - castle.size <= viewRight) {
      drawCastle(ctx, castle.cx, castle.baseY, castle.size, castleColor, 1, 1);
      drawCastleBubbles(ctx,t);
    }

    // Landmarks: World Scene Rocks & Plants
    const scene = worldSceneRef.current;
    for (const r of scene.rocks) {
      if (r.x + 120 >= viewLeft && r.x - 120 <= viewRight) {
        drawRock(ctx, r.x, r.baseY, r, r.S, decorPalette.rock, 1);
      }
    }

    // Decor Plants (Open water)
    for (const p of scene.decorPlants) {
      if (p.x + 80 >= viewLeft && p.x - 80 <= viewRight) {
        drawPlant(ctx, p.x, p.baseY, p, p.S, decorPalette.plant, t, 1);
      }
    }

    // Nursery Shelter Plants (Dense green foliage)
    for (const p of scene.nurseryPlants) {
      if (p.x + 90 >= viewLeft && p.x - 90 <= viewRight) {
        drawPlant(ctx, p.x, p.baseY, p, p.S, decorPalette.plant, t, 1, 'back');
      }
    }

    const consumer=player?{x:player.x,y:player.y,L:player.L,growth:survival.growth}:undefined;
    drawFoodEcology(ctx, foodRef.current, t, view,consumer);
    if (!displaySpecimen) drawBottomEcology(ctx, bottomRef.current, t, view,consumer);

    // Shadows on sand
    if (player && player.x >= viewLeft && player.x <= viewRight) {
      drawFishShadow(ctx, player, worldSurfaceY);
    }
    for (const pr of preyListRef.current) {
      if (pr.active && pr.fish.x >= viewLeft && pr.fish.x <= viewRight) {
        drawFishShadow(ctx, pr.fish, worldSurfaceY);
      }
    }
    if (predator && predator.fish.x >= viewLeft && predator.fish.x <= viewRight) {
      drawFishShadow(ctx, predator.fish, worldSurfaceY);
    }

    // Draw Prey Fish
    for (const pr of preyListRef.current) {
      if (!pr.active) continue;
      const f = pr.fish;
      if (f.x + f.L < viewLeft || f.x - f.L > viewRight) continue;
      const pal = displaySpecimen ? displayPalettesRef.current.get(f.id) : pr.speciesId === 'starter' ? preyStarterPalRef.current : preyColorfulPalRef.current;
      if (pal) drawFish(ctx, f, pal);
    }

    // Draw Predator Fish
    for (const hunter of [predator, secondPredatorRef.current]) if (!displaySpecimen && hunter && predatorPalRef.current) {
      const pf = hunter.fish;
      if (pf.x + pf.L >= viewLeft && pf.x - pf.L <= viewRight) {
        drawFish(ctx, pf, predatorPalRef.current);
      }
    }

    // Draw Player Fish
    if (player && playerPalRef.current && (!survival.isDead || !deathComplete)) {
      ctx.save();
      if(survival.isDead){ctx.translate(player.x,player.y);ctx.rotate(Math.PI);ctx.translate(-player.x,-player.y);}
      // Flinch / damage flash effect
      if (survival.damageFlash > 0.05) {
        ctx.filter = `brightness(${1 + survival.damageFlash * 0.8}) drop-shadow(0 0 8px rgba(255, 60, 60, 0.8))`;
      } else if (survival.growthPulse > 0.05) {
        // Warm golden growth highlight
        ctx.filter = `brightness(${1 + survival.growthPulse * 0.5}) drop-shadow(0 0 10px rgba(255, 215, 0, 0.7))`;
      }
      drawSpecimenFish(ctx, player, playerPalRef.current, specimenRef.current);
      ctx.restore();
    }

    drawNurseryCover(ctx, scene.nurseryPlants, player, t, decorPalette.plant);

    // World FX: Juice (wake bubbles, eat glints)
    drawSurvivalJuice(ctx, juice);

    // Near Bubbles & Motes
    drawBubbles(ctx, bubblesRef.current, bubbleSprite, WORLD_HEIGHT, false);
    drawMotes(ctx, motesRef.current, dotSprite, true);
    ctx.restore(); // End World Space
    drawCycleTint(ctx, vW, vH, daylight);
  });

  const openBoutique = () => {
    const player = playerRef.current;
    if (!player || survivalRef.current.isDead || !isInNursery(player.x, player.y)) return;
    setDetailsOpen(false); setAppraisalOpen(false); setChoiceStage(0); setReceipt(null);
    inputManagerRef.current?.resetInput();
    if (stickKnobRef.current) stickKnobRef.current.style.transform = '';
    if(profileRef.current.activeRun&&!endedRef.current&&!saveRun())return;
    onOpenShop();
  };
  const openAppraisal = () => {
    const player = playerRef.current;
    if (!player || survivalRef.current.isDead || !isInNursery(player.x, player.y)) return;
    inputManagerRef.current?.resetInput();
    if (stickKnobRef.current) stickKnobRef.current.style.transform = '';
    setFishName(specimenRef.current.name);
    modalRef.current = true;
    setAppraisalOpen(true);
    saveRun();
  };
  const chooseAdaptation = (trait: Adaptation) => {
    const pending=specimenRef.current.care?.development?.pending.find(p=>p.stage===choiceStage);
    if(!pending)return;
    setChosenTraits(previous=>previous.includes(trait)?previous.filter(t=>t!==trait):previous.length<pending.slots?[...previous,trait]:previous);
  };
  const confirmAdaptations=()=>{
    const next=chooseDevelopment(specimenRef.current,choiceStage,chosenTraits);
    if(next===specimenRef.current)return;
    const active=snapshot();if(!active)return;
    const candidate={...profileRef.current,activeRun:{...active,specimen:next}};
    if(!onProfileChange(candidate))return;
    profileRef.current=candidate;specimenRef.current=next;
    if(playerRef.current)playerPalRef.current=applySpecimenAppearance(playerRef.current,next);
    setChoiceStage(0);setChosenTraits([]);
  };
  const cleanGlass=()=>{
    const active=snapshot();if(!active)return;
    const current={...profileRef.current,activeRun:active};
    const next=cleanTank(current,false,Date.now());
    if(next===current||!onProfileChange(next))return;
    profileRef.current=next;
    for(const food of foodRef.current)if(food.kind==='algae'){food.active=false;food.respawn=60;}
    setMealNotice('Glass cleaned · free while swimming');
  };
  const finishRun = (kind: 'sell' | 'keep') => {
    const player = playerRef.current;
    if (!player || endedRef.current || survivalRef.current.isDead || (kind === 'keep' && !isInNursery(player.x, player.y))) return;
    specimenRef.current = { ...specimenRef.current, name: appraisalOpen ? fishName.trim().slice(0, 40) || specimenRef.current.name : specimenRef.current.name };
    const activeRun = snapshot();
    if (!activeRun) return;
    const base = { ...profileRef.current, activeRun };
    const next = settleRun(base, activeRun.specimen.id, kind);
    if (next === base || !onProfileChange(next)) return;
    profileRef.current = next;
    endedRef.current = true;
    inputManagerRef.current?.resetInput();
    setReceipt({ kind, value: kind === 'sell' ? appraiseFish(activeRun.specimen) : 0, specimen: activeRun.specimen });
    setAppraisalOpen(false); setDetailsOpen(false);
  };
  const specimen = snapshot()?.specimen ?? specimenRef.current;
  const player = playerRef.current;
  const refugeX = player ? Math.max(NURSERY_ZONE.x0, Math.min(NURSERY_ZONE.x1, player.x)) : 380;
  const refugeY = player ? Math.max(NURSERY_ZONE.y0, Math.min(NURSERY_ZONE.y1, player.y)) : 1520;
  const refuge = { distance: player ? Math.round(Math.hypot(refugeX - player.x, refugeY - player.y)) : 0,
    angle: player ? Math.atan2(refugeY - player.y, refugeX - player.x) : 0 };
  const nurseryFull = profile.kept.length + (profile.breeding ? 1 : 0) >= NURSERY_CAPACITY;
  const resident = runMetadataRef.current?.source === 'resident';
  const controls = mode==='swim' && !paused && !detailsOpen && !appraisalOpen && !choiceStage && !receipt && !hudState.isDead;
  return <div className="garden-root" onClick={() => void initAudio()}>
    <canvas ref={canvasRef} className="block w-full h-full" onPointerDown={e => {
      if(mode==='view'&&!paused){const rect=e.currentTarget.getBoundingClientRect();const id=pickAquariumViewFish(viewStateRef.current,(e.clientX-rect.left)*width/rect.width,(e.clientY-rect.top)*height/rect.height);if(id)onSelectFish(id);return;}
      if (!controls || !playerRef.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const view = getCameraView(cameraRef.current, width, height);
      const x = view.x + (e.clientX - rect.left) * width / rect.width / view.zoom;
      const y = view.y + (e.clientY - rect.top) * height / rect.height / view.zoom;
      const fish = playerRef.current;
      if (Math.hypot(x - fish.x, y - fish.y) < fish.L * 0.65) {
        inputManagerRef.current?.resetInput(); modalRef.current = true; setDetailsOpen(true); saveRun();
      }
    }} />
    {mode==='swim'&&<GardenHUD hud={{ ...hudState, threat: predatorRef.current?.state === 'stalk' || predatorRef.current?.state === 'charge' }}
      mode={mode} ageSeconds={Math.max(0,(Date.now()-(specimen.care?.bornAtMs ?? Date.now()))/1000)}
      healing={!!player&&inCastleHealingPlume(player.x,player.y)&&!hudState.isDead}
      pendingDevelopment={specimen.care?.development?.pending} onClean={cleanGlass}
      onDevelopment={()=>{setChoiceStage(specimenRef.current.care?.development?.pending[0]?.stage??0);setChosenTraits([]);saveRun();}}
      coins={profile.coins} value={appraiseFish(specimen)} stage={getStage(hudState.growth)} refuge={refuge}
      resident={resident} worldClock={profile.worldClock} display={!!displaySpecimen} controls={controls} saved={saved}
      onShop={openBoutique} onAppraise={openAppraisal} onSound={toggleSound} sound={soundEnabled}
      species={specimen.species} mealNotice={mealNotice} onCare={() => { inputManagerRef.current?.resetInput(); setDetailsOpen(true); saveRun(); }}
      knobRef={stickKnobRef} joyDown={handleJoyPointerDown} joyMove={handleJoyPointerMove} joyUp={handleJoyPointerUp}
      eatDown={handleEatPointerDown} eatUp={handleEatPointerUp} eatClick={detail => inputManagerRef.current?.onEatClick(detail)}
      burstDown={handleBurstPointerDown} burstUp={handleBurstPointerUp}>
      {detailsOpen && <div className="garden-modal"><div ref={detailsSheetRef} tabIndex={-1} className="garden-dialog garden-glass" role="dialog" aria-modal="true" aria-label="Fish care"><button className="garden-detail-close" aria-label="Close fish care" onClick={() => setDetailsOpen(false)}>×</button><FishCarePanel specimen={specimen} phase={profile.worldClock ? sampleWorldClock(profile.worldClock).phase : 'day'} /><button className="garden-button garden-button-secondary" disabled={!saved || specimen.health <= 0} onClick={() => finishRun('sell')}>Sell this fish · ◈ {appraiseFish(specimen)}</button><button className="garden-button garden-button-secondary" onClick={() => setDetailsOpen(false)}>Back to Swim <span>↗</span></button></div></div>}
      {!!choiceStage && <div className="garden-modal"><section className="garden-dialog garden-glass" role="dialog" aria-modal="true" aria-label="Choose an adaptation">
        <button className="garden-detail-close" aria-label="Choose later" onClick={()=>setChoiceStage(0)}>×</button>
        <p className="garden-eyebrow">GROWTH MILESTONE · {choiceStage === 35 ? 'JUVENILE' : 'ADULT'}</p>
        <h2>A little more you.</h2><FishPortrait specimen={specimen} />
        <p>Your care earned {specimen.care?.development?.pending.find(p=>p.stage===choiceStage)?.slots ?? 0} choices. Select different paths, then confirm. Growth continues while choices wait.</p>
        <div className="dialog-actions">
          <button className="garden-button" aria-pressed={chosenTraits.includes('swift')} onClick={() => chooseAdaptation('swift')}>Swim speed <span>↗</span></button>
          <p>12% more swim speed, with 8% more burst effort. Adds ◈ 12 to the base appraisal.</p>
          <button className="garden-button garden-button-secondary" aria-pressed={chosenTraits.includes('vibrancy')} onClick={() => chooseAdaptation('vibrancy')}>Vibrancy <span>✧</span></button><p>Deepen the colour you inherited and increase show value.</p>
          <button className="garden-button garden-button-secondary" aria-pressed={chosenTraits.includes('ornate')} onClick={() => chooseAdaptation('ornate')}>Ornamental fins <span>✧</span></button>
          <p>Longer flowing fins. Adds ◈ 24 to the base appraisal without a speed change.</p>
          <button className="garden-button garden-button-secondary" aria-pressed={chosenTraits.includes('vital')} onClick={() => chooseAdaptation('vital')}>Vitality <span>♡</span></button>
          <p>More nourishment from meals and stronger recovery while healthy.</p>
          <button className="garden-button" disabled={chosenTraits.length!==(specimen.care?.development?.pending.find(p=>p.stage===choiceStage)?.slots ?? 0)} onClick={confirmAdaptations}>Confirm upgrades</button>
        </div>
      </section></div>}
      {appraisalOpen && <div className="garden-modal"><section className="garden-dialog garden-glass" role="dialog" aria-modal="true" aria-label="Nursery appraisal">
        <p className="garden-eyebrow">THE NURSERY · SAFE IN THE LEAVES</p><h2>A little treasure.</h2>
        <FishPortrait specimen={specimen} />
        <label className="garden-eyebrow" htmlFor="specimen-name">SPECIMEN NAME</label>
        <input id="specimen-name" className="specimen-name" value={fishName} maxLength={40} onChange={e => setFishName(e.target.value)} />
        <div className="appraisal-value"><span>Current nursery offer</span><strong>◈ {appraiseFish(specimen)}</strong></div>
        <div className="appraisal-breakdown"><span>{getStage(specimen.growth)} · {Math.round(specimen.growth)}% grown</span><span>{Math.round(specimen.health)}% health</span><span>{Math.round(specimen.hunger)}% fed</span>{specimen.traits.map((trait, i) => <span key={i}>{trait === 'swift' ? 'Swift fins' : trait === 'vital' ? 'Vitality' : trait === 'vibrancy' ? 'Vibrancy' : 'Ornamental fins'}</span>)}</div>
        <p>{specimen.growth < 10 ? 'Eat nursery flakes or algae and give your fish healthy time to grow.' : specimen.growth < 35 ? 'Juvenile growth at 35% brings your first adaptation and a higher offer.' : specimen.growth < 75 ? 'Adult growth at 75% brings another adaptation and a maturity premium.' : 'A beautifully raised adult. Keep it in your display, or sell and raise another.'}</p>
        {nurseryFull && <p className="garden-notice">Your owned fish{profile.breeding ? ' and reserved breeding fry' : ''} occupy all {NURSERY_CAPACITY} nursery spaces. Make room before keeping this fish.</p>}
        {!saved && <p className="garden-notice">Saving is unavailable. Your fish is still here; the transaction has not been completed.</p>}
        <div className="dialog-actions">
          <button className="garden-button" disabled={!saved} onClick={() => finishRun('sell')}>Sell this specimen <span>◈ {appraiseFish(specimen)}</span></button>
          <button className="garden-button garden-button-secondary" aria-label={runMetadataRef.current?.source === 'resident' ? 'Return to View mode' : undefined} disabled={!resident && (nurseryFull || specimen.growth < 10)} onClick={() => finishRun('keep')}>{nurseryFull ? 'Your nursery is full' : resident ? 'Return to View mode' : 'Keep in my aquarium'} <span aria-hidden="true">♡</span></button>
          <button className="garden-button garden-button-secondary" onClick={() => setAppraisalOpen(false)}>Keep exploring <span>↗</span></button>
        </div>
      </section></div>}
      {receipt && <div className="garden-modal"><section className="garden-dialog garden-glass" role="dialog" aria-modal="true" aria-label="Specimen result">
        <p className="garden-eyebrow">{receipt.kind === 'sell' ? 'A BEAUTIFUL NEW BEGINNING' : 'A HOME OF ITS OWN'}</p>
        <h2>{receipt.kind === 'sell' ? 'A lovely little sale.' : 'This one is yours.'}</h2>
        <FishPortrait specimen={receipt.specimen} />
        <p>{receipt.specimen.name}{receipt.kind === 'sell' ? ' has found a new home.' : ' now lives in your aquarium.'}</p>
        {receipt.kind === 'sell' && <div className="appraisal-value"><span>Added to your boutique</span><strong>+ ◈ {receipt.value}</strong></div>}
        <div className="dialog-actions"><button className="garden-button" onClick={onChooseStock} aria-label="Choose next stock">Choose next stock <span aria-hidden="true">↗</span></button><button className="garden-button garden-button-secondary" onClick={onOpenShop} aria-label="Return home">Return home <span aria-hidden="true">♡</span></button></div>
      </section></div>}
      {deathComplete && !receipt && <div className="garden-modal"><section className="garden-dialog garden-glass" role="dialog" aria-modal="true" aria-label="Fish died">
        <p className="garden-eyebrow">THE GARDEN GOES ON</p><h2>A small life, a brave swim.</h2>
        <p>{specimen.name} died at {hudState.growth}% growth. This individual leaves your aquarium; your other fish and credits remain. Rest in the castle bubbles and let your next fish digest between meals.</p>
        {!saved && <p className="garden-notice" role="status">Saving failed. Your credits and home fish are safe. Retry either action when saving is available.</p>}
        <div className="dialog-actions"><button className="garden-button" onClick={() => { if (persistDefeat()) onChooseStock(); }} aria-label="Choose next stock">Choose next stock <span aria-hidden="true">↗</span></button><button className="garden-button garden-button-secondary" onClick={() => { if (persistDefeat()) onOpenShop(); }} aria-label="Return home">Return home <span aria-hidden="true">♡</span></button></div>
      </section></div>}
    </GardenHUD>}
    {mode==='view'&&viewDeathName&&<div className="garden-modal"><section className="garden-dialog garden-glass" role="dialog" aria-modal="true" aria-label="Fish died"><h2>A small life, a brave swim.</h2><p>{viewDeathName} has died and left your aquarium. Your other fish and credits remain. Avoid overfeeding; heal in the castle bubbles while swimming.</p><button className="garden-button" onClick={()=>setViewDeathName('')}>Back to View</button></section></div>}
  </div>;
};
export default Aquarium;
