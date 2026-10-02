import assetsData from "@/config/assets";
import { useEffect, useRef, useState, useCallback, type PointerEvent } from 'react';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import { reportScore } from '@aippy/runtime/leaderboard';
import { useSound, useAudioContext } from '@aippy/runtime/audio';
import * as Tone from 'tone';
import tweaksConfig from '@/config/tweaksConfig.json';
import { useGameLoop } from '@/hooks/useGameLoop';
import { drawCaustics, drawRays, getCausticPattern, type Ray } from '@/utils/aquaScene';
import { createBubbleSim, drawBubbles, updateBubbles } from '@/utils/aquaBubbles';
import { createMotes, drawMotes, updateMotes, type Mote } from '@/utils/aquaMotes';
import { getBubbleSprite, getDotSprite, mulberry } from '@/utils/aquaTextures';
import { bodyGradient, computePose, fishScale, makePalette, makeColorfulPalette, type Fish, type FishPalette } from '@/utils/fishModel';
import { drawFish, drawFishShadow } from '@/utils/fishRender';
import { drawCastle, castleLayout } from '@/utils/castleRender';
import { drawPlant } from '@/utils/plantRender';
import { drawRock } from '@/utils/rockRender';
import { InputManager } from '@/utils/playerInput';
import { createCamera, updateCamera, triggerCameraShake, worldSurfaceY, buildWorldScene, WORLD_WIDTH, WORLD_HEIGHT, NURSERY_ZONE, CASTLE_LANDMARK } from '@/utils/worldCamera';
import { createPlayerSurvival, updatePlayerFish, type PlayerSurvivalState } from '@/utils/playerSurvival';
import { createPreyFish, createPredatorFish, getFishMouthPos, updatePrey, updatePredator, type PreyEntity, type PredatorEntity } from '@/utils/survivalEcology';
import { createSurvivalJuice, spawnBurstWake, spawnEatGlints, updateSurvivalJuice, drawSurvivalJuice } from '@/utils/survivalJuice';
const tweaks = aippyTweaks(tweaksConfig);
const NOOP = () => {};
interface AquariumProps {
  width: number;
  height: number;
}
const BGM_URL = assetsData.AUDIO_YDEK;
const Aquarium = ({
  width,
  height
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
  const [guidanceVisible, setGuidanceVisible] = useState(true);

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
    playerPalRef.current = makeColorfulPalette('#ff7f50', '#ffd700');
    preyStarterPalRef.current = makePalette(fishColor);
    preyColorfulPalRef.current = makeColorfulPalette(colorfulColor, colorfulAccent);
    // Predator dark contrasting silhouette
    predatorPalRef.current = makePalette('#2a3845');
  }, [fishColor, colorfulColor, colorfulAccent]);

  // Restart / Reset Game session
  const restartGame = useCallback(() => {
    const startL = 72;
    startLengthRef.current = startL;
    survivalRef.current = createPlayerSurvival();

    // Spawn player in nursery
    const startX = 380;
    const startY = 1520;
    const p = createPreyFish(1, startX, startY, startL, 'starter').fish;
    p.dir = 1;
    p.yaw = p.yawBody = p.yawTail = 0;
    p.speed = 0;
    playerRef.current = p;

    // Reset camera onto player
    const cam = cameraRef.current;
    cam.x = Math.max(0, startX - width / 2);
    cam.y = Math.max(0, startY - height / 2);

    // Spawn 24 prey distributed across feeding zone and open waters
    const prey: PreyEntity[] = [];
    const rnd = mulberry(55123);
    for (let i = 0; i < 24; i++) {
      const speciesId = i % 2 === 0 ? 'starter' : 'colorful';
      // Prey sizes: 38% to 62% of starting player length so they are edible
      const preyL = startL * (0.42 + rnd() * 0.2);
      const px = 750 + rnd() * 1450;
      const py = 350 + rnd() * 1100;
      prey.push(createPreyFish(100 + i, px, py, preyL, speciesId));
    }
    preyListRef.current = prey;

    // Spawn 1 Predator far away in deep open water (X: 1950, Y: 800)
    predatorRef.current = createPredatorFish(1950, 800, startL * 1.75);

    // Reset juice
    juiceRef.current = createSurvivalJuice();
    setHudState({
      health: 100,
      hunger: 100,
      stamina: 100,
      growth: 0,
      inShelter: true,
      isDead: false,
      score: 0
    });
  }, [width, height]);

  // Initial spawn
  useEffect(() => {
    restartGame();
  }, [restartGame]);

  // Guidance auto-fade
  useEffect(() => {
    const timer = setTimeout(() => {
      setGuidanceVisible(false);
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  // Joystick touch handlers
  const handleJoyPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    void initAudio();
    e.currentTarget.setPointerCapture(e.pointerId);
    inputManagerRef.current?.onJoyStart(e.pointerId, e.clientX, e.clientY);
  };
  const handleJoyPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    inputManagerRef.current?.onJoyMove(e.pointerId, e.clientX, e.clientY);
  };
  const handleJoyPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // safe
    }
    inputManagerRef.current?.onJoyEnd(e.pointerId);
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
    designWidth: 0
  }, ({
    deltaTime,
    width: vW,
    height: vH
  }) => {
    // Avoid time accumulation if tab was backgrounded
    if (document.hidden) return;
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

    // Nursery Shelter Check: player in X: 160..720, Y > 1250
    const inShelter = player.x >= NURSERY_ZONE.x0 && player.x <= NURSERY_ZONE.x1 && player.y >= NURSERY_ZONE.y0;

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
      }, inShelter);

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
      for (const p of preyListRef.current) {
        if (!p.active) continue;
        // Check if small enough
        if (p.fish.L <= player.L * maxEdibleRatio) {
          const dx = p.fish.x - pMouth.x;
          const dy = p.fish.y - pMouth.y;
          const dist = Math.hypot(dx, dy);
          // Must be in front of player
          const facingX = player.dir === 1 ? 1 : -1;
          const inFront = dx * facingX > -player.L * 0.15;
          if (dist < player.L * 0.38 && inFront) {
            // BITE SUCCESS!
            p.active = false;
            p.respawnTimer = 6.0 + Math.random() * 4.0; // delayed replenishment outside camera

            player.mouth = 1.0;
            survival.hunger = Math.min(100, survival.hunger + 22);
            survival.growthPulse = 1.0;

            // Smooth growth award (0..100%)
            const growthDelta = 10;
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
    updatePrey(preyListRef.current, player, predator, dt, cam.x, cam.y, vW, vH, worldSurfaceY);

    // Update Predator
    updatePredator(predator, player, survival, dt, worldSurfaceY, () => {
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
    if (survival.isDead && !survival.scoreReported) {
      survival.scoreReported = true;
      reportScore(Math.round(survival.growth));
    }

    // Camera Follow with Lookahead
    const lookAhead = survival.isBursting ? 120 : 60;
    const lookAheadX = Math.cos(player.yawBody) * lookAhead;
    const lookAheadY = Math.sin(player.pitch) * lookAhead * 0.4;
    updateCamera(cam, player.x, player.y, vW, vH, dt, lookAheadX, lookAheadY);

    // Environmental particles & bubbles
    updateBubbles(bubblesRef.current, dt, WORLD_WIDTH, WORLD_HEIGHT, worldSurfaceY, bubbleAmount, NOOP);
    updateMotes(motesRef.current, dt, WORLD_WIDTH, WORLD_HEIGHT);
    updateSurvivalJuice(juice, dt);

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
    const renderCamX = cam.x + cam.shakeX;
    const renderCamY = cam.y + cam.shakeY;
    const viewLeft = renderCamX - 100;
    const viewRight = renderCamX + vW + 100;
    const viewTop = renderCamY - 100;
    const viewBottom = renderCamY + vH + 100;

    // 1. Screen Space Background (soft underwater gradient matching depth)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, vH);
    const camYRatio = Math.max(0, Math.min(1, renderCamY / (WORLD_HEIGHT - vH)));
    bgGrad.addColorStop(0, waterTop);
    bgGrad.addColorStop(0.5, waterMid);
    bgGrad.addColorStop(1, waterDeep);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, vW, vH);

    // 2. World Space Layer
    ctx.save();
    // Apply Camera Transform
    ctx.translate(-renderCamX, -renderCamY);

    // Light Rays
    ctx.globalCompositeOperation = 'lighter';
    drawRays(ctx, raysRef.current, t, rayIntensity);

    // Caustics
    const pat = getCausticPattern(ctx);
    if (pat && causticIntensity > 0) {
      drawCaustics(ctx, pat, t, renderCamX, renderCamY, vW, Math.min(vH, 400), 0.04 * causticIntensity, 1, 0.8);
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
        drawPlant(ctx, p.x, p.baseY, p, p.S, '#4fa85c', t, 1);
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
      const pal = pr.speciesId === 'starter' ? preyStarterPalRef.current : preyColorfulPalRef.current;
      if (pal) drawFish(ctx, f, pal);
    }

    // Draw Predator Fish
    if (predator && predatorPalRef.current) {
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

    // World FX: Juice (wake bubbles, eat glints)
    drawSurvivalJuice(ctx, juice);

    // Near Bubbles & Motes
    drawBubbles(ctx, bubblesRef.current, bubbleSprite, WORLD_HEIGHT, false);
    drawMotes(ctx, motesRef.current, dotSprite, true);
    ctx.restore(); // End World Space
  });
  return <div className="relative w-full h-full overflow-hidden select-none touch-none bg-[#2f7f98] font-sans" onClick={() => void initAudio()}>
      {/* 2D Aquarium Canvas */}
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* TOP HUD BAR */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between px-3 pt-3" style={{
      paddingTop: 'max(12px, env(safe-area-inset-top))',
      paddingLeft: 'max(12px, env(safe-area-inset-left))',
      paddingRight: 'max(12px, env(safe-area-inset-right))'
    }}>
        {/* Left Stats: Health & Hunger */}
        <div className="flex flex-col gap-1.5 bg-black/45 backdrop-blur-md rounded-xl p-2.5 border border-white/10 shadow-lg min-w-[130px]">
          {/* Health Bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-rose-300 w-11">HP</span>
            <div className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
              <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-200" style={{
              width: `${hudState.health}%`
            }} />
            </div>
            <span className="text-[10px] font-mono text-white/80 w-6 text-right">
              {hudState.health}
            </span>
          </div>

          {/* Hunger / Fullness Bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-300 w-11">FOOD</span>
            <div className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
              <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-200" style={{
              width: `${hudState.hunger}%`
            }} />
            </div>
            <span className="text-[10px] font-mono text-white/80 w-6 text-right">
              {hudState.hunger}
            </span>
          </div>

          {/* Nursery Status Pill */}
          {hudState.inShelter && <div className="mt-0.5 self-start px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-[9px] font-semibold text-emerald-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Nursery Shelter (Safe)
            </div>}
        </div>

        {/* Center / Right: Growth & Audio Toggle */}
        <div className="flex items-center gap-2">
          {/* Growth Progress */}
          <div className="flex flex-col items-center bg-black/45 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10 shadow-lg">
            <span className="text-[10px] font-semibold tracking-wider text-cyan-200 uppercase">
              Growth
            </span>
            <span className="text-sm font-black text-amber-300 font-mono">
              {hudState.growth}%
            </span>
          </div>

          {/* Audio Mute/Unmute */}
          {showSoundButton && <button onClick={toggleSound} className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl bg-black/45 backdrop-blur-md border border-white/15 text-white active:scale-95 transition-transform" aria-label="Toggle Sound">
              {soundEnabled ? <svg className="w-5 h-5 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg> : <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>}
            </button>}
        </div>
      </div>

      {/* INITIAL BRIEF GUIDANCE TOAST */}
      {guidanceVisible && <div className="pointer-events-none absolute top-20 inset-x-0 z-20 flex justify-center">
          <div className="px-4 py-2 rounded-full bg-slate-900/80 backdrop-blur-md border border-cyan-400/30 text-cyan-100 text-xs font-medium shadow-xl flex items-center gap-2 animate-bounce">
            <span>Swim</span>
            <span className="text-cyan-400">•</span>
            <span>Eat smaller fish</span>
            <span className="text-cyan-400">•</span>
            <span>Hide from predators in plants</span>
          </div>
        </div>}

      {/* FLOATING JOYSTICK (Bottom-Left) */}
      <div className="pointer-events-auto absolute z-30" style={{
      left: 'max(18px, env(safe-area-inset-left))',
      bottom: 'max(24px, env(safe-area-inset-bottom))'
    }}>
        <div onPointerDown={handleJoyPointerDown} onPointerMove={handleJoyPointerMove} onPointerUp={handleJoyPointerUp} onPointerCancel={handleJoyPointerUp} className="relative flex items-center justify-center w-28 h-28 rounded-full bg-black/35 backdrop-blur-sm border border-white/15 touch-none active:bg-black/45">
          {/* Inner Joystick Knob */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-b from-cyan-400 to-cyan-600 shadow-md border border-cyan-200/50 flex items-center justify-center pointer-events-none transition-transform duration-75" style={{
          transform: `translate(${inputManagerRef.current?.getKnobOffset().x || 0}px, ${inputManagerRef.current?.getKnobOffset().y || 0}px)`
        }}>
            <div className="w-4 h-4 rounded-full bg-white/40" />
          </div>
        </div>
      </div>

      {/* BURST BUTTON & STAMINA RING (Bottom-Right, positioned left of the Dev Cog) */}
      <div className="pointer-events-auto absolute z-30 flex flex-col items-center" style={{
      right: 'max(76px, calc(env(safe-area-inset-right) + 64px))',
      bottom: 'max(22px, env(safe-area-inset-bottom))'
    }}>
        {/* Stamina Meter above button */}
        <div className="w-14 h-1.5 bg-black/60 rounded-full mb-1.5 overflow-hidden border border-white/15">
          <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full transition-all duration-100" style={{
          width: `${hudState.stamina}%`
        }} />
        </div>

        <button onPointerDown={handleBurstPointerDown} onPointerUp={handleBurstPointerUp} onPointerCancel={handleBurstPointerUp} aria-label="Burst Speed" className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-xl active:scale-90 transition-transform border-2 border-white/30 cursor-pointer">
          <div className="flex flex-col items-center leading-none">
            <span className="text-[13px] tracking-wider font-extrabold">BURST</span>
            <span className="text-[9px] opacity-80 mt-0.5">SPACE</span>
          </div>
        </button>
      </div>

      {/* GAME OVER RETRY OVERLAY */}
      {hudState.isDead && <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md text-white p-6 text-center select-none animate-fadeIn">
          <div className="text-6xl mb-3">🌊</div>
          <h2 className="text-2xl font-black text-rose-400 mb-1">FATE OF THE REEF</h2>
          <p className="text-sm text-slate-300 mb-4 max-w-xs">
            Your journey ended. The deep waters are perilous, but life always returns to the nursery.
          </p>

          <div className="bg-white/10 rounded-xl px-6 py-3 border border-white/15 mb-6 text-center">
            <div className="text-xs uppercase text-slate-400 tracking-wider">Final Growth Progress</div>
            <div className="text-3xl font-black text-amber-300 font-mono mt-0.5">{hudState.growth}%</div>
          </div>

          <button onClick={restartGame} className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-base font-extrabold tracking-wide text-white shadow-xl active:scale-95 transition-transform cursor-pointer border border-cyan-200/40">
            SWIM AGAIN
          </button>
        </div>}
    </div>;
};
export default Aquarium;