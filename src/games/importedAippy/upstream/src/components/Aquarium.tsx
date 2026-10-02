import assetsData from "@/config/assets";
import { useEffect, useRef, useState, useCallback, type PointerEvent } from 'react';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import { reportScore } from '@aippy/runtime/leaderboard';
import { useSound, useAudioContext } from '@aippy/runtime/audio';
import * as Tone from 'tone';
import tweaksConfig from '@/config/tweaksConfig.json';
import { useGameLoop } from '@/hooks/useGameLoop';
import { drawWaterCaustics, drawRays, getCausticPattern, type Ray } from '@/utils/aquaScene';
import { createBubbleSim, drawBubbles, updateBubbles } from '@/utils/aquaBubbles';
import { createMotes, drawMotes, updateMotes, type Mote } from '@/utils/aquaMotes';
import { getBubbleSprite, getDotSprite, mulberry } from '@/utils/aquaTextures';
import { bodyGradient, computePose, fishScale, makePalette, makeColorfulPalette, type Fish, type FishPalette } from '@/utils/fishModel';
import { drawFish, drawFishShadow } from '@/utils/fishRender';
import { drawCastle, castleLayout } from '@/utils/castleRender';
import { drawPlant } from '@/utils/plantRender';
import { drawRock } from '@/utils/rockRender';
import { InputManager } from '@/utils/playerInput';
import { createCamera, updateCamera, getCameraView, triggerCameraShake, worldSurfaceY, buildWorldScene, WORLD_WIDTH, WORLD_HEIGHT, NURSERY_ZONE, CASTLE_LANDMARK } from '@/utils/worldCamera';
import { createPlayerSurvival, updatePlayerFish, type PlayerSurvivalState } from '@/utils/playerSurvival';
import { createPreyFish, createPredatorFish, getFishMouthPos, updatePrey, updatePredator, type PreyEntity, type PredatorEntity } from '@/utils/survivalEcology';
import { createSurvivalJuice, spawnBurstWake, spawnEatGlints, updateSurvivalJuice, drawSurvivalJuice } from '@/utils/survivalJuice';
import { createSpecimen, appraiseFish, getStage, settleRun, type ActiveRun, type Adaptation, type BoutiqueSave, type Specimen } from '@/utils/boutique';
import { applySpecimenAppearance, specimenModifiers } from '@/utils/specimenAppearance';
import { isInNursery, drawNurseryCover } from '@/utils/nurseryCover';
import GardenHUD from '@/components/GardenHUD';
import FishPortrait from '@/components/FishPortrait';
const tweaks = aippyTweaks(tweaksConfig);
const NOOP = () => {};
interface AquariumProps {
  width: number;
  height: number;
  profile: BoutiqueSave;
  onProfileChange: (save: BoutiqueSave) => boolean;
  onOpenShop: () => void;
  paused: boolean;
  displaySpecimen: Specimen | null;
  saved: boolean;
}
const BGM_URL = assetsData.AUDIO_YDEK;
const Aquarium = ({
  width,
  height, profile, onProfileChange, onOpenShop, paused, displaySpecimen, saved
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

  // Audio system: useSound for BGM, useAudioContext + Tone.js for crisp synth SFX
  const {
    play: playSound,
    stop: stopSound
  } = useSound({
    bgm: BGM_URL
  });
  const {
    getAudioContext,
    unlock: unlockAudio
  } = useAudioContext();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bgmStarted, setBgmStarted] = useState(false);

  // Tone Synths
  const biteSynthRef = useRef<Tone.Synth | null>(null);
  const burstSynthRef = useRef<Tone.MembraneSynth | null>(null);
  const damageSynthRef = useRef<Tone.Synth | null>(null);
  const initAudio = useCallback(async () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      await unlockAudio();
      Tone.setContext(ctx);
      await Tone.start();
      if (!biteSynthRef.current) {
        biteSynthRef.current = new Tone.Synth({
          oscillator: {
            type: 'sine'
          },
          envelope: {
            attack: 0.005,
            decay: 0.08,
            sustain: 0,
            release: 0.04
          }
        }).toDestination();
        biteSynthRef.current.volume.value = -4;
      }
      if (!burstSynthRef.current) {
        burstSynthRef.current = new Tone.MembraneSynth({
          pitchDecay: 0.05,
          octaves: 3,
          oscillator: {
            type: 'sine'
          },
          envelope: {
            attack: 0.002,
            decay: 0.15,
            sustain: 0,
            release: 0.1
          }
        }).toDestination();
        burstSynthRef.current.volume.value = -6;
      }
      if (!damageSynthRef.current) {
        damageSynthRef.current = new Tone.Synth({
          oscillator: {
            type: 'triangle'
          },
          envelope: {
            attack: 0.01,
            decay: 0.2,
            sustain: 0,
            release: 0.1
          }
        }).toDestination();
        damageSynthRef.current.volume.value = -2;
      }
      if (!bgmStarted && soundEnabled) {
        await playSound('bgm', {
          loop: true,
          volume: 0.45
        });
        setBgmStarted(true);
      }
    } catch (e) {
      console.warn('[Aippy] Audio init notice:', e);
    }
  }, [getAudioContext, unlockAudio, playSound, bgmStarted, soundEnabled]);
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      if (!next) {
        stopSound('bgm');
        setBgmStarted(false);
      } else {
        void initAudio();
      }
      return next;
    });
  }, [stopSound, initAudio]);
  const playBiteSound = useCallback(() => {
    if (!soundEnabled || !biteSynthRef.current) return;
    try {
      biteSynthRef.current.triggerAttackRelease('G5', '32n');
    } catch {
      // safe fallback
    }
  }, [soundEnabled]);
  const playBurstSound = useCallback(() => {
    if (!soundEnabled || !burstSynthRef.current) return;
    try {
      burstSynthRef.current.triggerAttackRelease('C2', '16n');
    } catch {
      // safe fallback
    }
  }, [soundEnabled]);
  const playDamageSound = useCallback(() => {
    if (!soundEnabled || !damageSynthRef.current) return;
    try {
      damageSynthRef.current.triggerAttackRelease('D3', '16n');
    } catch {
      // safe fallback
    }
  }, [soundEnabled]);

  // Player Survival State (React for HUD, updated throttled)
  const [hudState, setHudState] = useState({
    health: 100,
    hunger: 100,
    stamina: 100,
    growth: 0,
    inShelter: true,
    isDead: false,
    score: 0
  });
  const [appraisalOpen, setAppraisalOpen] = useState(false);
  const [choiceStage, setChoiceStage] = useState(0);
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
  const resumeRef = useRef(profile.activeRun);
  const specimenRef = useRef<Specimen>(displaySpecimen ?? profile.activeRun?.specimen ?? createSpecimen());
  const endedRef = useRef(false);
  const modalRef = useRef(false);
  modalRef.current = paused || appraisalOpen || choiceStage > 0 || receipt !== null;
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
  const playerRef = useRef<Fish | null>(null);
  const preyListRef = useRef<PreyEntity[]>([]);
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
    if (!fish || endedRef.current || displaySpecimen) return null;
    return { specimen: { ...specimenRef.current, growth: state.growth, health: state.health, hunger: state.hunger },
      x: fish.x, y: fish.y, stamina: state.stamina };
  }, [displaySpecimen]);

  const saveRun = useCallback(() => {
    const activeRun = snapshot();
    if (!activeRun) return;
    const next = { ...profileRef.current, activeRun };
    if (onProfileChange(next)) profileRef.current = next;
  }, [snapshot, onProfileChange]);

  useEffect(() => {
    const saveOnHide = () => { if (document.hidden) saveRun(); };
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
    const im = new InputManager();
    inputManagerRef.current = im;
    return () => {
      im.destroy();
    };
  }, []);

  // Update rays
  useEffect(() => {
    const rnd = mulberry(12345);
    const count = 9;
    const rays: Ray[] = [];
    for (let i = 0; i < count; i++) {
      rays.push({
        x: (i + 0.5 + (rnd() - 0.5) * 0.5) / count * WORLD_WIDTH * 1.05,
        width: 140 * (0.8 + rnd() * 0.6),
        len: WORLD_HEIGHT * (0.7 + rnd() * 0.3),
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
    const resume = displaySpecimen ? null : resumeRef.current;
    resumeRef.current = null;
    specimenRef.current = displaySpecimen ?? resume?.specimen ?? createSpecimen();
    endedRef.current = false;
    setAppraisalOpen(false); setChoiceStage(0); setReceipt(null);
    inputManagerRef.current?.resetInput();
    const startL = 72;
    startLengthRef.current = startL;
    survivalRef.current = createPlayerSurvival();
    const state = survivalRef.current;
    state.growth = specimenRef.current.growth;
    state.health = displaySpecimen ? 100 : specimenRef.current.health;
    state.hunger = displaySpecimen ? 100 : specimenRef.current.hunger;
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
    cam.x = Math.max(0, Math.min(Math.max(0, WORLD_WIDTH - viewport.width), startX - viewport.width / 2));
    cam.y = Math.max(0, Math.min(Math.max(0, WORLD_HEIGHT - viewport.height), startY - viewport.height / 2));

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
    predatorRef.current = createPredatorFish(1950, 800, startL * 1.75);

    // Reset juice
    juiceRef.current = createSurvivalJuice();
    setHudState({
      health: Math.round(state.health), hunger: Math.round(state.hunger), stamina: Math.round(state.stamina), growth: Math.round(state.growth),
      inShelter: isInNursery(startX, startY), isDead: state.isDead, score: state.growth
    });
    saveRun();
  }, [displaySpecimen, saveRun]);

  // Initial spawn
  useEffect(() => {
    restartGame();
  }, [restartGame]);

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

  // Main Simulation & Render Loop
  const {
    canvasRef
  } = useGameLoop({
    width,
    height,
    maxFPS: paused || appraisalOpen || choiceStage > 0 || receipt ? 10 : 60,
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
    const previousPlayerX = player.x;
    const previousPlayerY = player.y;

    // Nursery Shelter Check: player in X: 160..720, Y > 1250
    const inShelter = isInNursery(player.x, player.y);

    // Sound trigger on burst start
    if (input.burst && survival.stamina > 25 && survival.burstCooldown <= 0 && !survival.isBursting) {
      playBurstSound();
    }

    // Update Player
    if (!survival.isDead) {
      updatePlayerFish(player, input, survival, dt, {
        w: WORLD_WIDTH,
        h: WORLD_HEIGHT,
        surfaceY: worldSurfaceY
      }, inShelter, specimenModifiers(specimenRef.current));
      if (displaySpecimen) {
        survival.health = 100; survival.hunger = 100; survival.isDead = false;
      } else specimenRef.current.raisedSeconds += dt;

      // Burst bubble wake
      if (survival.isBursting && Math.random() < 0.6) {
        const tailX = player.x - Math.cos(player.yawBody) * player.L * 0.45;
        const tailY = player.y - Math.sin(player.pitch) * player.L * 0.2;
        spawnBurstWake(juice, tailX, tailY, Math.cos(player.yawBody));
      }

      // Automatic biting when suitable prey is close to player mouth
      const pMouth = getFishMouthPos(player);
      const maxEdibleRatio = 0.68; // prey below ~68% player length
      const maxGrowthCap = startLengthRef.current * 1.6;
      for (const p of displaySpecimen ? [] : preyListRef.current) {
        if (!p.active) continue;
        // Check if small enough
        if (p.fish.L <= player.L * maxEdibleRatio) {
          const dx = p.fish.x - pMouth.x;
          const dy = p.fish.y - pMouth.y;
          const dist = Math.hypot(dx, dy);
          // Must be in front of player
          const headX = Math.cos(player.yaw) * Math.cos(player.pitch);
          const headY = -Math.sin(player.pitch);
          const inFront = dx * headX + dy * headY > -player.L * 0.15;
          if (dist < player.L * 0.38 && inFront) {
            // BITE SUCCESS!
            p.active = false;
            p.respawnTimer = 6.0 + Math.random() * 4.0; // delayed replenishment outside camera

            player.mouth = 1.0;
            survival.hunger = Math.min(100, survival.hunger + 22);
            survival.growthPulse = 1.0;

            // Smooth growth award (0..100%)
            const growthDelta = 5;
            const nextGrowth = Math.min(100, survival.growth + growthDelta);
            survival.growth = nextGrowth;
            player.L = Math.min(maxGrowthCap, startLengthRef.current * (1 + nextGrowth / 100 * 0.6));

            // FX & Audio
            spawnEatGlints(juice, pMouth.x, pMouth.y, player.L);
            playBiteSound();

            // Scatter nearby prey
            for (const other of preyListRef.current) {
              if (!other.active) continue;
              const d = Math.hypot(other.fish.x - pMouth.x, other.fish.y - pMouth.y);
              if (d < player.L * 2.8) {
                other.fish.cruise = 1.5;
                other.fish.decide = 0.8;
              }
            }
            break;
          }
        }
      }
    }

    // Update Prey
    const ecologyView = getCameraView(cam, vW, vH);
    updatePrey(preyListRef.current, player, predator, dt, ecologyView.x, ecologyView.y, ecologyView.width, ecologyView.height, worldSurfaceY);

    // Update Predator
    if (!displaySpecimen) updatePredator(predator, player, survival, dt, worldSurfaceY, () => {
      // Predator bite hit player!
      if (survival.invulnerableTime <= 0 && !survival.isDead) {
        survival.health = Math.max(0, survival.health - 25);
        survival.invulnerableTime = 1.8;
        survival.damageFlash = 1.0;
        triggerCameraShake(cam, 0.3);
        playDamageSound();
      }
    });

    // Report Leaderboard score on death once
    if (survival.isDead && !survival.scoreReported && !displaySpecimen) {
      survival.scoreReported = true;
      reportScore(Math.round(survival.growth));
      endedRef.current = true;
      const next = { ...profileRef.current, activeRun: null };
      if (onProfileChange(next)) profileRef.current = next;
    }

    // Camera Follow with Lookahead
    const lookAhead = survival.isBursting ? 120 : 60;
    const lookAheadX = Math.cos(player.yawBody) * Math.cos(player.pitch) * lookAhead;
    const lookAheadY = -Math.sin(player.pitch) * lookAhead;
    updateCamera(cam, player.x, player.y, vW, vH, dt, lookAheadX, lookAheadY,
      { speed: Math.hypot(player.x - previousPlayerX, player.y - previousPlayerY) / dt, bodyLength: player.L, reducedMotion });

    // Environmental particles & bubbles
    updateBubbles(bubblesRef.current, dt, WORLD_WIDTH, WORLD_HEIGHT, worldSurfaceY, bubbleAmount, NOOP);
    updateMotes(motesRef.current, dt, WORLD_WIDTH, WORLD_HEIGHT);
    updateSurvivalJuice(juice, dt);
    checkpointRef.current += dt;
    if (!displaySpecimen && !survival.isDead && checkpointRef.current > 3) { checkpointRef.current = 0; saveRun(); }
    const requiredChoices = survival.growth >= 75 ? 2 : survival.growth >= 35 ? 1 : 0;
    if (!displaySpecimen && !survival.isDead && specimenRef.current.traits.length < requiredChoices) {
      modalRef.current = true;
      inputManagerRef.current?.resetInput();
      if (stickKnobRef.current) stickKnobRef.current.style.transform = '';
      setChoiceStage(specimenRef.current.traits.length + 1);
      saveRun();
    }

    // Throttled HUD sync to React (10Hz)
    hudUpdateTimerRef.current += dt;
    if (hudUpdateTimerRef.current >= 0.1) {
      hudUpdateTimerRef.current = 0;
      setHudState({
        health: Math.round(survival.health),
        hunger: Math.round(survival.hunger),
        stamina: Math.round(survival.stamina),
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
    bgGrad.addColorStop(0, waterTop);
    bgGrad.addColorStop(0.5, waterMid);
    bgGrad.addColorStop(1, waterDeep);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, vW, vH);

    // 2. World Space Layer
    ctx.save();
    // Apply Camera Transform
    ctx.scale(view.zoom, view.zoom);
    ctx.translate(-renderCamX, -renderCamY);

    // Light Rays
    ctx.globalCompositeOperation = 'lighter';
    drawRays(ctx, raysRef.current, t, rayIntensity);

    // Caustics
    const pat = getCausticPattern(ctx);
    if (pat && causticIntensity > 0) {
      drawWaterCaustics(ctx, pat, t, renderCamX, renderCamY, view.width, view.height, 0.055 * causticIntensity, WORLD_HEIGHT);
    }
    ctx.globalCompositeOperation = 'source-over';

    // Distant motes & bubbles
    drawMotes(ctx, motesRef.current, dotSprite, false);
    drawBubbles(ctx, bubblesRef.current, bubbleSprite, WORLD_HEIGHT, true);

    // World Floor Sand Layer
    ctx.fillStyle = sandColor;
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

    // Landmarks: Castle (at bottom-right sand)
    const castle = CASTLE_LANDMARK;
    if (castle.cx + castle.size >= viewLeft && castle.cx - castle.size <= viewRight) {
      drawCastle(ctx, castle.cx, castle.baseY, castle.size, castleColor, 1, 1);
    }

    // Landmarks: World Scene Rocks & Plants
    const scene = worldSceneRef.current;
    for (const r of scene.rocks) {
      if (r.x + 120 >= viewLeft && r.x - 120 <= viewRight) {
        drawRock(ctx, r.x, r.baseY, r, r.S, rockColor, 1);
      }
    }

    // Decor Plants (Open water)
    for (const p of scene.decorPlants) {
      if (p.x + 80 >= viewLeft && p.x - 80 <= viewRight) {
        drawPlant(ctx, p.x, p.baseY, p, p.S, plantColor, t, 1);
      }
    }

    // Nursery Shelter Plants (Dense green foliage)
    for (const p of scene.nurseryPlants) {
      if (p.x + 90 >= viewLeft && p.x - 90 <= viewRight) {
        drawPlant(ctx, p.x, p.baseY, p, p.S, '#4fa85c', t, 1, 'back');
      }
    }

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
    if (!displaySpecimen && predator && predatorPalRef.current) {
      const pf = predator.fish;
      if (pf.x + pf.L >= viewLeft && pf.x - pf.L <= viewRight) {
        drawFish(ctx, pf, predatorPalRef.current);
      }
    }

    // Draw Player Fish
    if (player && playerPalRef.current && !survival.isDead) {
      ctx.save();
      // Flinch / damage flash effect
      if (survival.damageFlash > 0.05) {
        ctx.filter = `brightness(${1 + survival.damageFlash * 0.8}) drop-shadow(0 0 8px rgba(255, 60, 60, 0.8))`;
      } else if (survival.growthPulse > 0.05) {
        // Warm golden growth highlight
        ctx.filter = `brightness(${1 + survival.growthPulse * 0.5}) drop-shadow(0 0 10px rgba(255, 215, 0, 0.7))`;
      }
      drawFish(ctx, player, playerPalRef.current);
      ctx.restore();
    }

    drawNurseryCover(ctx, scene.nurseryPlants, player, t, '#4fa85c');

    // World FX: Juice (wake bubbles, eat glints)
    drawSurvivalJuice(ctx, juice);

    // Near Bubbles & Motes
    drawBubbles(ctx, bubblesRef.current, bubbleSprite, WORLD_HEIGHT, false);
    drawMotes(ctx, motesRef.current, dotSprite, true);
    ctx.restore(); // End World Space
  });

  const openBoutique = () => {
    inputManagerRef.current?.resetInput();
    if (stickKnobRef.current) stickKnobRef.current.style.transform = '';
    saveRun();
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
    if (!choiceStage || specimenRef.current.traits.length !== choiceStage - 1) return;
    specimenRef.current = { ...specimenRef.current, traits: [...specimenRef.current.traits, trait] };
    if (playerRef.current) playerPalRef.current = applySpecimenAppearance(playerRef.current, specimenRef.current);
    saveRun();
    setChoiceStage(0);
  };
  const finishRun = (kind: 'sell' | 'keep') => {
    const player = playerRef.current;
    if (!player || endedRef.current || survivalRef.current.isDead || !isInNursery(player.x, player.y)) return;
    specimenRef.current = { ...specimenRef.current, name: fishName.trim().slice(0, 40) || 'Coral' };
    const activeRun = snapshot();
    if (!activeRun) return;
    const base = { ...profileRef.current, activeRun };
    const next = settleRun(base, activeRun.specimen.id, kind);
    if (next === base || !onProfileChange(next)) return;
    profileRef.current = next;
    endedRef.current = true;
    inputManagerRef.current?.resetInput();
    setReceipt({ kind, value: kind === 'sell' ? appraiseFish(activeRun.specimen) : 0, specimen: activeRun.specimen });
    setAppraisalOpen(false);
  };
  const specimen = snapshot()?.specimen ?? specimenRef.current;
  const player = playerRef.current;
  const refugeX = player ? Math.max(NURSERY_ZONE.x0, Math.min(NURSERY_ZONE.x1, player.x)) : 380;
  const refugeY = player ? Math.max(NURSERY_ZONE.y0, Math.min(NURSERY_ZONE.y1, player.y)) : 1520;
  const refuge = { distance: player ? Math.round(Math.hypot(refugeX - player.x, refugeY - player.y)) : 0,
    angle: player ? Math.atan2(refugeY - player.y, refugeX - player.x) : 0 };
  const controls = !paused && !appraisalOpen && !choiceStage && !receipt && !hudState.isDead;
  return <div className="garden-root" onClick={() => void initAudio()}>
    <canvas ref={canvasRef} className="block w-full h-full" />
    <GardenHUD hud={{ ...hudState, threat: predatorRef.current?.state === 'stalk' || predatorRef.current?.state === 'charge' }}
      coins={profile.coins} value={appraiseFish(specimen)} stage={getStage(hudState.growth)} refuge={refuge}
      display={!!displaySpecimen} controls={controls} saved={saved}
      onShop={openBoutique} onAppraise={openAppraisal} onSound={toggleSound} sound={soundEnabled}
      knobRef={stickKnobRef} joyDown={handleJoyPointerDown} joyMove={handleJoyPointerMove} joyUp={handleJoyPointerUp}
      burstDown={handleBurstPointerDown} burstUp={handleBurstPointerUp}>
      {!!choiceStage && <div className="garden-modal"><section className="garden-dialog garden-glass" role="dialog" aria-modal="true" aria-label="Choose an adaptation">
        <p className="garden-eyebrow">GROWTH MILESTONE · {choiceStage === 1 ? 'JUVENILE' : 'ADULT'}</p>
        <h2>A little more you.</h2><FishPortrait specimen={specimen} />
        <p>Your guppy has grown. Shape the way it swims or the beauty of its fins.</p>
        <div className="dialog-actions">
          <button className="garden-button" onClick={() => chooseAdaptation('swift')}>Swift fins <span>↗</span></button>
          <p>12% more swim speed, with 8% more burst effort. Adds ◈ 12 to the base appraisal.</p>
          <button className="garden-button garden-button-secondary" onClick={() => chooseAdaptation('ornate')}>Ornamental fins <span>✧</span></button>
          <p>Longer flowing fins. Adds ◈ 24 to the base appraisal without a speed change.</p>
        </div>
      </section></div>}
      {appraisalOpen && <div className="garden-modal"><section className="garden-dialog garden-glass" role="dialog" aria-modal="true" aria-label="Nursery appraisal">
        <p className="garden-eyebrow">THE NURSERY · SAFE IN THE LEAVES</p><h2>A little treasure.</h2>
        <FishPortrait specimen={specimen} />
        <label className="garden-eyebrow" htmlFor="specimen-name">SPECIMEN NAME</label>
        <input id="specimen-name" className="specimen-name" value={fishName} maxLength={40} onChange={e => setFishName(e.target.value)} />
        <div className="appraisal-value"><span>Current nursery offer</span><strong>◈ {appraiseFish(specimen)}</strong></div>
        <div className="appraisal-breakdown"><span>{getStage(specimen.growth)} · {Math.round(specimen.growth)}% grown</span><span>{Math.round(specimen.health)}% health</span><span>{Math.round(specimen.hunger)}% fed</span>{specimen.traits.map((trait, i) => <span key={i}>{trait === 'swift' ? 'Swift fins' : 'Ornamental fins'}</span>)}</div>
        <p>{specimen.growth < 10 ? 'Feed on a few small fish before selling or keeping this specimen.' : specimen.growth < 35 ? 'Juvenile growth at 35% brings your first adaptation and a higher offer.' : specimen.growth < 75 ? 'Adult growth at 75% brings another adaptation and a maturity premium.' : 'A beautifully raised adult. Keep it in your display, or sell and raise another.'}</p>
        {!saved && <p className="garden-notice">Saving is unavailable. Your fish is still here; the transaction has not been completed.</p>}
        <div className="dialog-actions">
          <button className="garden-button" disabled={specimen.growth < 10} onClick={() => finishRun('sell')}>Sell this specimen <span>◈ {appraiseFish(specimen)}</span></button>
          <button className="garden-button garden-button-secondary" disabled={specimen.growth < 10 || profile.kept.length >= 100} onClick={() => finishRun('keep')}>{profile.kept.length >= 100 ? 'Your display is full' : 'Keep in my display'} <span>♡</span></button>
          <button className="garden-button garden-button-secondary" onClick={() => setAppraisalOpen(false)}>Keep exploring <span>↗</span></button>
        </div>
      </section></div>}
      {receipt && <div className="garden-modal"><section className="garden-dialog garden-glass" role="dialog" aria-modal="true" aria-label="Specimen result">
        <p className="garden-eyebrow">{receipt.kind === 'sell' ? 'A BEAUTIFUL NEW BEGINNING' : 'A HOME OF ITS OWN'}</p>
        <h2>{receipt.kind === 'sell' ? 'A lovely little sale.' : 'This one is yours.'}</h2>
        <FishPortrait specimen={receipt.specimen} />
        <p>{receipt.specimen.name}{receipt.kind === 'sell' ? ' has found a new home.' : ' now lives safely in your personal display.'}</p>
        {receipt.kind === 'sell' && <div className="appraisal-value"><span>Added to your boutique</span><strong>+ ◈ {receipt.value}</strong></div>}
        <div className="dialog-actions"><button className="garden-button" onClick={restartGame}>Raise another guppy <span>↗</span></button><button className="garden-button garden-button-secondary" onClick={() => { restartGame(); openBoutique(); }}>Visit my boutique <span>♡</span></button></div>
      </section></div>}
      {hudState.isDead && !receipt && <div className="garden-modal"><section className="garden-dialog garden-glass" role="dialog" aria-modal="true" aria-label="Excursion ended">
        <p className="garden-eyebrow">THE GARDEN GOES ON</p><h2>A small life, a brave swim.</h2>
        <p>This excursion ended at {hudState.growth}% growth. Your boutique coins and display fish are safe. Another little guppy is waiting.</p>
        <div className="dialog-actions"><button className="garden-button" onClick={restartGame}>Raise a new guppy <span>↗</span></button></div>
      </section></div>}
    </GardenHUD>
  </div>;
};
export default Aquarium;
