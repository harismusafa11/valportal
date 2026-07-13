/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Play, RotateCcw, Settings, Target, Zap, Crosshair, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AimTrainerProps {
  onBackToHome: () => void;
}

type GameMode = 'gridshot' | 'microflick' | 'tracking' | 'reflex';
type GamePhase = 'menu' | 'countdown' | 'playing' | 'result';

interface TargetObj {
  id: number;
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  spawnTime: number;
  lifetime: number; // ms, 0 = infinite
  // Tracking mode movement
  vx: number;
  vy: number;
  angle: number;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface MissPoint {
  x: number;
  y: number;
}

// ─── Crosshair Parser ─────────────────────────────────────────────────────────

interface CrosshairState {
  color: number;
  customColor: string;
  outline: boolean;
  outlineOpacity: number;
  outlineThickness: number;
  centerDot: boolean;
  centerDotOpacity: number;
  centerDotThickness: number;
  innerLines: boolean;
  innerOpacity: number;
  innerLength: number;
  innerThickness: number;
  innerOffset: number;
  outerLines: boolean;
  outerOpacity: number;
  outerLength: number;
  outerThickness: number;
  outerOffset: number;
}

const DEFAULT_CROSSHAIR: CrosshairState = {
  color: 5,
  customColor: '#00ffff',
  outline: false,
  outlineOpacity: 0.5,
  outlineThickness: 1,
  centerDot: false,
  centerDotOpacity: 1.0,
  centerDotThickness: 2,
  innerLines: true,
  innerOpacity: 1.0,
  innerLength: 4,
  innerThickness: 2,
  innerOffset: 2,
  outerLines: false,
  outerOpacity: 0.35,
  outerLength: 2,
  outerThickness: 2,
  outerOffset: 10,
};

const COLOR_MAP = [
  '#FFFFFF', '#00FF00', '#7FFF00', '#ADFF2F',
  '#FFFF00', '#00FFFF', '#FFC0CB', '#FF0000',
];

function parseCrosshairCode(code: string): CrosshairState {
  const state = { ...DEFAULT_CROSSHAIR };
  if (!code || !code.includes(';')) return state;
  const parts = code.trim().split(';');
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const val = parts[i + 1];
    switch (key) {
      case 'c': state.color = parseInt(val, 10); break;
      case 'u': state.customColor = val.startsWith('#') ? val : `#${val}`; state.color = 8; break;
      case 'h': state.outline = val === '1'; break;
      case 'o': state.outlineOpacity = parseFloat(val); break;
      case 't': state.outlineThickness = parseInt(val, 10); break;
      case 'd': state.centerDot = val === '1'; break;
      case 'z': state.centerDotThickness = parseInt(val, 10); break;
      case 'a': state.centerDotOpacity = parseFloat(val); break;
      case '0b': state.innerLines = val === '1'; break;
      case '0a': state.innerOpacity = parseFloat(val); break;
      case '0l': state.innerLength = parseInt(val, 10); break;
      case '0t': state.innerThickness = parseInt(val, 10); break;
      case '0o': state.innerOffset = parseInt(val, 10); break;
      case '1b': state.outerLines = val === '1'; break;
      case '1a': state.outerOpacity = parseFloat(val); break;
      case '1l': state.outerLength = parseInt(val, 10); break;
      case '1t': state.outerThickness = parseInt(val, 10); break;
      case '1o': state.outerOffset = parseInt(val, 10); break;
    }
  }
  return state;
}

function drawCrosshairOnCanvas(
  ctx: CanvasRenderingContext2D,
  state: CrosshairState,
  cx: number,
  cy: number
) {
  const mainColor = state.color === 8 ? state.customColor : (COLOR_MAP[state.color] || '#FFFFFF');

  const drawRect = (x: number, y: number, w: number, h: number, opacity: number) => {
    if (state.outline) {
      ctx.fillStyle = `rgba(0, 0, 0, ${state.outlineOpacity * opacity})`;
      const ot = state.outlineThickness;
      ctx.fillRect(x - ot, y - ot, w + ot * 2, h + ot * 2);
    }
    ctx.fillStyle = mainColor;
    ctx.globalAlpha = opacity;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1.0;
  };

  // Center Dot
  if (state.centerDot) {
    const dt = state.centerDotThickness;
    drawRect(cx - dt / 2, cy - dt / 2, dt, dt, state.centerDotOpacity);
  }

  // Inner Lines
  if (state.innerLines) {
    const t = state.innerThickness;
    const l = state.innerLength;
    const o = state.innerOffset;
    const op = state.innerOpacity;
    drawRect(cx - o - l, cy - t / 2, l, t, op);
    drawRect(cx + o, cy - t / 2, l, t, op);
    drawRect(cx - t / 2, cy - o - l, t, l, op);
    drawRect(cx - t / 2, cy + o, t, l, op);
  }

  // Outer Lines
  if (state.outerLines) {
    const t = state.outerThickness;
    const l = state.outerLength;
    const o = state.outerOffset;
    const op = state.outerOpacity;
    drawRect(cx - o - l, cy - t / 2, l, t, op);
    drawRect(cx + o, cy - t / 2, l, t, op);
    drawRect(cx - t / 2, cy - o - l, t, l, op);
    drawRect(cx - t / 2, cy + o, t, l, op);
  }
}

// ─── Audio Engine ─────────────────────────────────────────────────────────────

class AudioEngine {
  private ctx: AudioContext | null = null;
  muted = false;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (_) { /* ignore audio errors */ }
  }

  hitSound() { this.playTone(1000, 0.05, 'sine', 0.2); }
  missSound() { this.playTone(150, 0.1, 'square', 0.1); }
  countdownBeep() { this.playTone(800, 0.08, 'sine', 0.15); }
  goBeep() { this.playTone(1200, 0.15, 'sine', 0.25); }
}

// ─── Rank Evaluation ──────────────────────────────────────────────────────────

interface RankInfo {
  name: string;
  color: string;
  glow: string;
}

function evaluateRank(accuracy: number, kps: number): RankInfo {
  if (accuracy >= 95 && kps >= 3.5) return { name: 'RADIANT', color: '#FFFAA0', glow: '#FFD700' };
  if (accuracy >= 90 && kps >= 3.0) return { name: 'IMMORTAL', color: '#FF4655', glow: '#FF0040' };
  if (accuracy >= 80 && kps >= 2.5) return { name: 'DIAMOND', color: '#B9A3EB', glow: '#9B59B6' };
  if (accuracy >= 70 && kps >= 2.0) return { name: 'PLATINUM', color: '#00C8C8', glow: '#00A0A0' };
  if (accuracy >= 60 && kps >= 1.5) return { name: 'GOLD', color: '#ECB731', glow: '#DAA520' };
  if (accuracy >= 50 && kps >= 1.0) return { name: 'SILVER', color: '#BEC2C5', glow: '#A0A4A8' };
  return { name: 'BRONZE', color: '#B08D57', glow: '#8B6914' };
}

// ─── Target Colors ────────────────────────────────────────────────────────────

const TARGET_COLORS: Record<string, { fill: string; stroke: string; glow: string }> = {
  red:    { fill: '#FF4655', stroke: '#FF6B78', glow: 'rgba(255,70,85,0.4)' },
  cyan:   { fill: '#00F0FF', stroke: '#66F7FF', glow: 'rgba(0,240,255,0.4)' },
  yellow: { fill: '#FFD700', stroke: '#FFE44D', glow: 'rgba(255,215,0,0.4)' },
  green:  { fill: '#00FF66', stroke: '#66FF99', glow: 'rgba(0,255,102,0.4)' },
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ROUND_DURATION = 30; // seconds
const SCALE_FACTOR = 0.5;
const TRACKING_DPS = 120; // damage per second when tracking on target

// ─── Component ────────────────────────────────────────────────────────────────

export default function AimTrainer({ onBackToHome }: AimTrainerProps) {
  const { t } = useLanguage();

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  // Game state
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);

  // Settings
  const [sens, setSens] = useState(0.4);
  const [dpi, setDpi] = useState(800);
  const [targetRadius, setTargetRadius] = useState(20);
  const [targetColor, setTargetColor] = useState<string>('red');
  const [gameMode, setGameMode] = useState<GameMode>('gridshot');
  const [crosshairCode, setCrosshairCode] = useState('0;P;c;5;h;0;d;1;z;3;a;1;0b;0;1b;0');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [controlStyle, setControlStyle] = useState<'fpp' | 'classic'>('classic');

  // Game data refs (mutable, no re-render needed during gameplay)
  const camRef = useRef({ x: 0, y: 0 });
  const crosshairPosRef = useRef({ x: 0, y: 0 });
  const targetsRef = useRef<TargetObj[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const statsRef = useRef({ hits: 0, misses: 0, shots: 0 });
  const missPointsRef = useRef<MissPoint[]>([]);
  const timerRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isMouseDownRef = useRef(false);
  const targetIdCounter = useRef(0);
  const crosshairStateRef = useRef<CrosshairState>(parseCrosshairCode('0;P;c;5;h;0;d;1;z;3;a;1;0b;0;1b;0'));
  const phaseRef = useRef<GamePhase>('menu');
  const gameModeRef = useRef<GameMode>('gridshot');
  const targetRadiusRef = useRef(20);
  const targetColorRef = useRef('red');
  const sensRef = useRef(0.4);
  const dpiRef = useRef(800);
  const controlStyleRef = useRef<'fpp' | 'classic'>('classic');
  const lastTrackingTickRef = useRef<number>(0);
  const lastTrackingMissSoundRef = useRef<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const lastFrameTimeRef = useRef<number>(0);
  const gameCanvasSizeRef = useRef({ w: 800, h: 600 });

  useEffect(() => { controlStyleRef.current = controlStyle; }, [controlStyle]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // Audio
  const audioRef = useRef(new AudioEngine());

  // Results
  const [resultHits, setResultHits] = useState(0);
  const [resultMisses, setResultMisses] = useState(0);
  const [resultAccuracy, setResultAccuracy] = useState(0);
  const [resultKPS, setResultKPS] = useState(0);
  const [resultRank, setResultRank] = useState<RankInfo>({ name: 'BRONZE', color: '#B08D57', glow: '#8B6914' });
  const [resultMissPoints, setResultMissPoints] = useState<MissPoint[]>([]);

  // Sync refs with state
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  useEffect(() => { targetRadiusRef.current = targetRadius; }, [targetRadius]);
  useEffect(() => { targetColorRef.current = targetColor; }, [targetColor]);
  useEffect(() => { sensRef.current = sens; }, [sens]);
  useEffect(() => { dpiRef.current = dpi; }, [dpi]);
  useEffect(() => { audioRef.current.muted = !soundEnabled; }, [soundEnabled]);
  useEffect(() => {
    crosshairStateRef.current = parseCrosshairCode(crosshairCode);
  }, [crosshairCode]);

  // ─── Spawn Helpers ────────────────────────────────────────────────────────

  const spawnTarget = useCallback((nearCam = false, maxDist = 300, radiusOverride?: number): TargetObj => {
    const cam = camRef.current;
    const mode = gameModeRef.current;
    const r = radiusOverride ?? targetRadiusRef.current;
    const dist = nearCam ? maxDist : 300;

    const refX = controlStyleRef.current === 'fpp' ? cam.x : (canvasRef.current ? canvasRef.current.width / 2 : 400);
    const refY = controlStyleRef.current === 'fpp' ? cam.y : (canvasRef.current ? canvasRef.current.height / 2 : 300);

    const angle = Math.random() * Math.PI * 2;
    const d = 50 + Math.random() * dist;

    let tx = refX + Math.cos(angle) * d;
    let ty = refY + Math.sin(angle) * d;

    // Constrain to screen in classic mode
    if (controlStyleRef.current === 'classic' && canvasRef.current) {
      const margin = 50;
      tx = Math.max(margin, Math.min(canvasRef.current.width - margin, tx));
      ty = Math.max(margin, Math.min(canvasRef.current.height - margin, ty));
    }

    const target: TargetObj = {
      id: targetIdCounter.current++,
      x: tx,
      y: ty,
      radius: r,
      health: mode === 'tracking' ? 100 : 1,
      maxHealth: mode === 'tracking' ? 100 : 1,
      spawnTime: performance.now(),
      lifetime: mode === 'reflex' ? 600 : 0,
      vx: 0,
      vy: 0,
      angle: Math.random() * Math.PI * 2,
      speed: mode === 'tracking' ? (1.5 + Math.random() * 2) : 0,
    };
    return target;
  }, []);

  const ensureTargets = useCallback(() => {
    const mode = gameModeRef.current;
    const targets = targetsRef.current;

    if (mode === 'gridshot') {
      while (targets.length < 3) {
        targets.push(spawnTarget(false, 300));
      }
    } else if (mode === 'microflick') {
      while (targets.length < 2) {
        targets.push(spawnTarget(true, 80, 8 + Math.random() * 4));
      }
    } else if (mode === 'tracking') {
      if (targets.length < 1) {
        targets.push(spawnTarget(false, 200, 20));
      }
    } else if (mode === 'reflex') {
      if (targets.length < 1) {
        targets.push(spawnTarget(false, 250));
      }
    }
  }, [spawnTarget]);

  // ─── Pointer Lock ─────────────────────────────────────────────────────────

  const handleCanvasClick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (phaseRef.current !== 'playing') return;
      if (document.pointerLockElement !== canvasRef.current) return;

      const s = sensRef.current;
      const d = dpiRef.current;
      const factor = s * (d / 800) * SCALE_FACTOR;

      if (controlStyleRef.current === 'fpp') {
        camRef.current.x += e.movementX * factor;
        camRef.current.y += e.movementY * factor;
      } else {
        const canvas = canvasRef.current;
        if (canvas) {
          crosshairPosRef.current.x = Math.max(0, Math.min(canvas.width, crosshairPosRef.current.x + e.movementX * factor));
          crosshairPosRef.current.y = Math.max(0, Math.min(canvas.height, crosshairPosRef.current.y + e.movementY * factor));
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (phaseRef.current !== 'playing') return;
      if (document.pointerLockElement !== canvasRef.current) return;

      isMouseDownRef.current = true;

      // Hit detection for non-tracking modes
      if (gameModeRef.current !== 'tracking') {
        const cam = camRef.current;
        const targets = targetsRef.current;
        let hit = false;

        const aimX = controlStyleRef.current === 'fpp' ? cam.x : crosshairPosRef.current.x;
        const aimY = controlStyleRef.current === 'fpp' ? cam.y : crosshairPosRef.current.y;

        for (let i = targets.length - 1; i >= 0; i--) {
          const t = targets[i];
          const dist = Math.sqrt((t.x - aimX) ** 2 + (t.y - aimY) ** 2);
          if (dist <= t.radius) {
            // HIT
            hit = true;
            statsRef.current.hits++;
            statsRef.current.shots++;

            // Spawn particles
            spawnParticles(t.x, t.y);
            audioRef.current.hitSound();

            // Remove target
            targets.splice(i, 1);
            break;
          }
        }

        if (!hit) {
          statsRef.current.misses++;
          statsRef.current.shots++;
          missPointsRef.current.push({ x: aimX, y: aimY });
          audioRef.current.missSound();
        }
      }
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // ─── Particle System ──────────────────────────────────────────────────────

  const spawnParticles = (x: number, y: number) => {
    const count = 8 + Math.floor(Math.random() * 5);
    const col = TARGET_COLORS[targetColorRef.current] || TARGET_COLORS.red;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 500,
        maxLife: 500,
        color: col.fill,
        size: 2 + Math.random() * 3,
      });
    }
  };

  // ─── Game Loop ────────────────────────────────────────────────────────────

  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to fill container
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    }

    const w = canvas.width;
    const h = canvas.height;
    gameCanvasSizeRef.current = { w, h };
    const cx = w / 2;
    const cy = h / 2;
    const cam = camRef.current;
    const targets = targetsRef.current;
    const particles = particlesRef.current;
    const mode = gameModeRef.current;
    const currentPhase = phaseRef.current;

    // Clear
    ctx.fillStyle = '#0B0E11';
    ctx.fillRect(0, 0, w, h);

    // ── Draw Static Grid (fixed background) ─────────────────────────────
    // ── Draw Grid ────────────────────────────────────────────────────────
    const gridSize = 60;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;

    if (controlStyleRef.current === 'fpp') {
      const offsetX = (-cam.x % gridSize + gridSize) % gridSize;
      const offsetY = (-cam.y % gridSize + gridSize) % gridSize;
      for (let x = offsetX; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = offsetY; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    } else {
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }

    if (currentPhase === 'playing') {
      if (isPausedRef.current) {
        if (lastFrameTimeRef.current > 0) {
          startTimeRef.current += (timestamp - lastFrameTimeRef.current);
        }
        lastFrameTimeRef.current = timestamp;
      } else {
        lastFrameTimeRef.current = timestamp;

        // Timer
        const elapsed = (timestamp - startTimeRef.current) / 1000;
        const remaining = Math.max(0, ROUND_DURATION - elapsed);
        timerRef.current = remaining;

        if (remaining <= 0) {
          // End round
          endRound();
          return;
        }

        // Update time left for UI (throttled)
        const roundedTime = Math.ceil(remaining);
        setTimeLeft(roundedTime);

        // ── Update targets ────────────────────────────────────────────────

        // Tracking mode: move targets
        if (mode === 'tracking') {
          const now = performance.now();
          const tickInterval = 100; // Track stats every 100ms
          const isTick = now - lastTrackingTickRef.current >= tickInterval;
          if (isTick) {
            lastTrackingTickRef.current = now;
          }

          for (const t of targets) {
            t.angle += 0.02 + Math.random() * 0.01;
            t.x += Math.cos(t.angle) * t.speed;
            t.y += Math.sin(t.angle) * t.speed;

            // Tracking hit detection (hold-down)
            if (isMouseDownRef.current) {
              const aimX = controlStyleRef.current === 'fpp' ? cam.x : crosshairPosRef.current.x;
              const aimY = controlStyleRef.current === 'fpp' ? cam.y : crosshairPosRef.current.y;
              const dist = Math.sqrt((t.x - aimX) ** 2 + (t.y - aimY) ** 2);
              
              if (dist <= t.radius) {
                const dmg = (TRACKING_DPS / 60); // per frame at ~60fps
                t.health -= dmg;

                if (isTick) {
                  statsRef.current.hits++;
                  statsRef.current.shots++;
                  audioRef.current.hitSound();
                }

                if (t.health <= 0) {
                  spawnParticles(t.x, t.y);
                  const idx = targets.indexOf(t);
                  if (idx !== -1) targets.splice(idx, 1);
                }
              } else {
                if (isTick) {
                  statsRef.current.misses++;
                  statsRef.current.shots++;
                  missPointsRef.current.push({ x: aimX, y: aimY });
                  
                  if (now - lastTrackingMissSoundRef.current >= 250) {
                    lastTrackingMissSoundRef.current = now;
                    audioRef.current.missSound();
                  }
                }
              }
            }
          }
        }

        // Reflex mode: remove expired targets
        if (mode === 'reflex') {
          for (let i = targets.length - 1; i >= 0; i--) {
            const t = targets[i];
            if (t.lifetime > 0 && timestamp - t.spawnTime > t.lifetime) {
              statsRef.current.misses++;
              statsRef.current.shots++;
              missPointsRef.current.push({ x: t.x, y: t.y });
              targets.splice(i, 1);
            }
          }
        }

        // Ensure correct number of targets
        ensureTargets();
      }

      // ── Draw targets ──────────────────────────────────────────────────
      const col = TARGET_COLORS[targetColorRef.current] || TARGET_COLORS.red;

      for (const t of targets) {
        if (isPausedRef.current && t.lifetime > 0) {
          t.spawnTime += (timestamp - lastFrameTimeRef.current);
        }

        const sx = controlStyleRef.current === 'fpp' ? (t.x - cam.x + cx) : t.x;
        const sy = controlStyleRef.current === 'fpp' ? (t.y - cam.y + cy) : t.y;

        // Skip if off-screen
        if (sx < -t.radius * 2 || sx > w + t.radius * 2 || sy < -t.radius * 2 || sy > h + t.radius * 2) continue;

        // Glow
        ctx.shadowColor = col.glow;
        ctx.shadowBlur = 15;

        // Outer circle
        ctx.beginPath();
        ctx.arc(sx, sy, t.radius, 0, Math.PI * 2);
        ctx.fillStyle = col.fill;
        ctx.globalAlpha = 0.9;
        ctx.fill();

        // Inner ring
        ctx.beginPath();
        ctx.arc(sx, sy, t.radius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = col.stroke;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 0.9;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;

        // Health bar for tracking mode
        if (mode === 'tracking' && t.maxHealth > 1) {
          const barW = t.radius * 2;
          const barH = 4;
          const barX = sx - barW / 2;
          const barY = sy - t.radius - 10;
          const pct = Math.max(0, t.health / t.maxHealth);

          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(barX, barY, barW, barH);
          ctx.fillStyle = col.fill;
          ctx.fillRect(barX, barY, barW * pct, barH);
        }

        // Reflex timer ring
        if (mode === 'reflex' && t.lifetime > 0) {
          const elapsed = timestamp - t.spawnTime;
          const pct = 1 - Math.min(1, elapsed / t.lifetime);
          ctx.beginPath();
          ctx.arc(sx, sy, t.radius + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
          ctx.strokeStyle = pct > 0.3 ? col.stroke : '#FF4655';
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.8;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      }
    }

    // ── Draw Particles ────────────────────────────────────────────────────
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= 16.67; // ~60fps

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      const alpha = p.life / p.maxLife;
      const sx = controlStyleRef.current === 'fpp' ? (p.x - cam.x + cx) : p.x;
      const sy = controlStyleRef.current === 'fpp' ? (p.y - cam.y + cy) : p.y;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(sx - p.size / 2, sy - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1.0;

    // ── Draw Crosshair ────────────────────────────────────────────────────
    if (currentPhase === 'playing' || currentPhase === 'countdown') {
      const chx = controlStyleRef.current === 'fpp' ? cx : crosshairPosRef.current.x;
      const chy = controlStyleRef.current === 'fpp' ? cy : crosshairPosRef.current.y;
      drawCrosshairOnCanvas(ctx, crosshairStateRef.current, chx, chy);
    }

    // ── HUD Overlay ───────────────────────────────────────────────────────
    if (currentPhase === 'playing') {
      // Timer
      const remaining = timerRef.current;
      ctx.font = 'bold 28px monospace';
      ctx.fillStyle = remaining <= 5 ? '#FF4655' : '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.ceil(remaining)}s`, cx, 40);

      // Stats bar
      const { hits, misses, shots } = statsRef.current;
      const acc = shots > 0 ? ((hits / shots) * 100).toFixed(1) : '0.0';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'left';
      ctx.fillText(`HIT: ${hits}`, 20, 30);
      ctx.fillText(`MISS: ${misses}`, 20, 48);
      ctx.fillText(`ACC: ${acc}%`, 20, 66);

      // Mode indicator
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(mode.toUpperCase(), w - 20, 30);
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [ensureTargets]);

  // ─── End Round ────────────────────────────────────────────────────────────

  const endRound = useCallback(() => {
    phaseRef.current = 'result';
    setPhase('result');

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    const { hits, misses, shots } = statsRef.current;
    const accuracy = shots > 0 ? (hits / shots) * 100 : 0;
    const kps = hits / ROUND_DURATION;
    const rank = evaluateRank(accuracy, kps);

    setResultHits(hits);
    setResultMisses(misses);
    setResultAccuracy(accuracy);
    setResultKPS(kps);
    setResultRank(rank);
    setResultMissPoints([...missPointsRef.current]);

    // Save to high scores in localStorage
    try {
      const modeKey = gameModeRef.current;
      const stored = localStorage.getItem('valportal_aim_high_scores');
      const scores = stored ? JSON.parse(stored) : {};
      const currentHighScore = scores[modeKey]?.score || 0;

      if (hits > currentHighScore) {
        scores[modeKey] = {
          score: hits,
          accuracy: parseFloat(accuracy.toFixed(1)),
          kps: parseFloat(kps.toFixed(2)),
          rank: rank.name
        };
        localStorage.setItem('valportal_aim_high_scores', JSON.stringify(scores));
      }
    } catch (err) {
      console.warn('Failed to save aim high score:', err);
    }
  }, []);

  // ─── Start Game ───────────────────────────────────────────────────────────

  const startCountdown = useCallback(() => {
    setPhase('countdown');
    phaseRef.current = 'countdown';
    setCountdown(3);

    // Reset game data
    camRef.current = { x: 0, y: 0 };
    if (canvasRef.current) {
      crosshairPosRef.current = {
        x: canvasRef.current.width / 2,
        y: canvasRef.current.height / 2
      };
    }
    targetsRef.current = [];
    particlesRef.current = [];
    statsRef.current = { hits: 0, misses: 0, shots: 0 };
    missPointsRef.current = [];
    isMouseDownRef.current = false;

    // Start render loop
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(gameLoop);

    // Countdown sequence
    let count = 3;
    audioRef.current.countdownBeep();

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        audioRef.current.countdownBeep();
      } else {
        clearInterval(interval);
        setCountdown(0);
        audioRef.current.goBeep();

        // Start playing
        phaseRef.current = 'playing';
        setPhase('playing');
        setIsPaused(false);
        isPausedRef.current = false;
        startTimeRef.current = performance.now();
        lastFrameTimeRef.current = performance.now();
        setTimeLeft(ROUND_DURATION);

        // Initial targets
        ensureTargets();
      }
    }, 1000);
  }, [gameLoop, ensureTargets]);

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (document.pointerLockElement) document.exitPointerLock();
    };
  }, []);

  // Monitor pointer lock state changes to pause/unpause
  useEffect(() => {
    const handlePointerLockChange = () => {
      const canvas = canvasRef.current;
      if (document.pointerLockElement !== canvas) {
        if (phaseRef.current === 'playing') {
          setIsPaused(true);
        }
      } else {
        if (phaseRef.current === 'playing') {
          setIsPaused(false);
        }
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, []);

  // ─── Mode Descriptions ────────────────────────────────────────────────────

  const MODE_INFO: Record<GameMode, { name: string; desc: string; icon: string }> = {
    gridshot:  { name: 'Gridshot',   desc: '3 targets spawn at random positions. Destroy and repeat.',          icon: '◎' },
    microflick:{ name: 'Microflick', desc: 'Tiny targets appear very close. Train precise micro-adjustments.', icon: '◦' },
    tracking:  { name: 'Tracking',   desc: 'Hold click on a moving target to drain its health.',                icon: '⟳' },
    reflex:    { name: 'Reflex',     desc: 'Targets appear for 600ms. React fast or they disappear.',          icon: '⚡' },
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0F1215]/95 sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (document.pointerLockElement) document.exitPointerLock();
              if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
              onBackToHome();
            }}
            className="p-1.5 border border-white/10 hover:border-[#FF4655] transition text-gray-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1 className="font-rajdhani font-bold tracking-widest text-base sm:text-lg text-white leading-none flex items-center space-x-2">
              <Crosshair size={16} className="text-[#FFD700]" />
              <span>{t('AIM_TRAINER')}</span>
            </h1>
            <p className="text-[9px] font-mono text-[#FF4655] tracking-widest uppercase hidden sm:block">FPP MICRO AIM SIMULATOR</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 border border-white/10 hover:border-[#00F0FF] transition text-gray-400 hover:text-white cursor-pointer"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* Settings Panel (Left) — shown on menu/result phase */}
        {(phase === 'menu' || phase === 'result') && (
          <div className="w-full lg:w-80 border-r border-white/5 bg-[#0F1215] p-4 overflow-y-auto flex-shrink-0">
            <div className="space-y-5">
              {/* Mode Selection */}
              <div>
                <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-2 block">Training Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(MODE_INFO) as GameMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setGameMode(m)}
                      className={`p-3 border text-left transition cursor-pointer ${
                        gameMode === m
                          ? 'border-[#FFD700] bg-[#FFD700]/10 text-white'
                          : 'border-white/10 bg-[#161A1E] text-gray-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <span className="text-lg block mb-0.5">{MODE_INFO[m].icon}</span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider block">{MODE_INFO[m].name}</span>
                      <span className="text-[9px] font-mono text-gray-500 leading-tight block mt-1">{MODE_INFO[m].desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Control Style */}
              <div>
                <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-2 block">Aim Control Style</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setControlStyle('classic')}
                    className={`px-3 py-2.5 border text-center transition cursor-pointer text-[10px] font-mono font-bold uppercase tracking-wider ${
                      controlStyle === 'classic'
                        ? 'border-[#00F0FF] bg-[#00F0FF]/10 text-white'
                        : 'border-white/10 bg-[#161A1E] text-gray-400 hover:text-white'
                    }`}
                  >
                    Classic 2D
                  </button>
                  <button
                    onClick={() => setControlStyle('fpp')}
                    className={`px-3 py-2.5 border text-center transition cursor-pointer text-[10px] font-mono font-bold uppercase tracking-wider ${
                      controlStyle === 'fpp'
                        ? 'border-[#FFD700] bg-[#FFD700]/10 text-white'
                        : 'border-white/10 bg-[#161A1E] text-gray-400 hover:text-white'
                    }`}
                  >
                    FPP (Cam Turn)
                  </button>
                </div>
                <p className="text-[8px] font-mono text-gray-500 mt-1 leading-tight">
                  {controlStyle === 'classic'
                    ? 'Crosshair moves around the screen. Avoids motion sickness.'
                    : 'Crosshair locked at center. Camera pans the background.'}
                </p>
              </div>

              {/* Sensitivity */}
              <div>
                <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                  Valorant Sensitivity: <span className="text-[#00F0FF]">{sens.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="10"
                  step="0.01"
                  value={sens}
                  onChange={(e) => setSens(parseFloat(e.target.value))}
                  className="w-full accent-[#00F0FF] cursor-pointer"
                />
              </div>

              {/* DPI */}
              <div>
                <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                  Mouse DPI: <span className="text-[#00F0FF]">{dpi}</span>
                </label>
                <input
                  type="range"
                  min="400"
                  max="3200"
                  step="50"
                  value={dpi}
                  onChange={(e) => setDpi(parseInt(e.target.value, 10))}
                  className="w-full accent-[#00F0FF] cursor-pointer"
                />
              </div>

              {/* Target Radius */}
              <div>
                <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                  Target Radius: <span className="text-[#00F0FF]">{targetRadius}px</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="40"
                  step="1"
                  value={targetRadius}
                  onChange={(e) => setTargetRadius(parseInt(e.target.value, 10))}
                  className="w-full accent-[#00F0FF] cursor-pointer"
                />
              </div>

              {/* Target Color */}
              <div>
                <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-2 block">Target Color</label>
                <div className="flex space-x-2">
                  {Object.entries(TARGET_COLORS).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setTargetColor(key)}
                      className={`w-8 h-8 rounded-full border-2 transition cursor-pointer ${
                        targetColor === key ? 'border-white scale-110' : 'border-white/20 hover:border-white/50'
                      }`}
                      style={{ backgroundColor: val.fill }}
                    />
                  ))}
                </div>
              </div>

              {/* Crosshair Code */}
              <div>
                <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-1 block">Crosshair Code</label>
                <input
                  type="text"
                  value={crosshairCode}
                  onChange={(e) => setCrosshairCode(e.target.value)}
                  placeholder="0;P;c;5;h;0;d;1;z;3..."
                  className="w-full bg-[#161A1E] border border-white/10 px-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:border-[#00F0FF] focus:outline-none transition"
                />
                <p className="text-[8px] font-mono text-gray-600 mt-1">Paste your Valorant crosshair code</p>
              </div>

              {/* Start Button */}
              <button
                onClick={startCountdown}
                className="w-full py-3 bg-gradient-to-r from-[#FF4655] to-[#FF6B78] text-white font-mono font-bold text-sm uppercase tracking-widest hover:brightness-110 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Play size={16} />
                <span>{phase === 'result' ? 'PLAY AGAIN' : 'START ROUND'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 relative bg-[#0B0E11] flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            onClick={handleCanvasClick}
          />

          {/* Menu Overlay */}
          {phase === 'menu' && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="text-center space-y-4">
                <div className="text-6xl font-bold font-rajdhani text-white/10 tracking-widest">AIM TRAINER</div>
                <p className="text-sm font-mono text-gray-500">Click canvas to lock cursor, then start a round</p>
                <p className="text-[10px] font-mono text-gray-600">Configure settings in the left panel →</p>
              </div>
            </div>
          )}

          {/* Countdown Overlay */}
          {phase === 'countdown' && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="text-center">
                <div
                  className="text-8xl font-bold font-rajdhani tracking-widest animate-pulse"
                  style={{ color: countdown === 0 ? '#00FF66' : '#FFFFFF' }}
                >
                  {countdown === 0 ? 'GO!' : countdown}
                </div>
                <p className="text-sm font-mono text-gray-500 mt-2">{MODE_INFO[gameMode].name.toUpperCase()}</p>
              </div>
            </div>
          )}

          {/* Pause Overlay */}
          {phase === 'playing' && isPaused && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70 backdrop-blur-xs">
              <div className="bg-[#0F1215] border border-[#FF4655]/20 p-6 text-center space-y-4 max-w-xs w-full shadow-2xl">
                <div className="text-2xl font-bold font-rajdhani tracking-widest text-[#FF4655] animate-pulse">GAME PAUSED</div>
                <p className="text-xs font-mono text-gray-400">Click the canvas to lock cursor and resume training</p>
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={handleCanvasClick}
                    className="flex-1 py-2 bg-[#00F0FF]/15 border border-[#00F0FF]/30 text-[#00F0FF] font-mono font-bold text-[10px] uppercase tracking-wider hover:bg-[#00F0FF]/25 transition cursor-pointer"
                  >
                    Resume
                  </button>
                  <button
                    onClick={endRound}
                    className="px-3 py-2 border border-white/10 text-gray-500 font-mono font-bold text-[10px] uppercase tracking-wider hover:text-white hover:border-white/30 transition cursor-pointer"
                  >
                    End Round
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Result Overlay */}
          {phase === 'result' && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-[#0F1215] border border-white/10 p-6 sm:p-8 max-w-lg w-full space-y-6">
                {/* Rank Badge */}
                <div className="text-center">
                  <div
                    className="text-5xl font-bold font-rajdhani tracking-widest mb-1"
                    style={{ color: resultRank.color, textShadow: `0 0 30px ${resultRank.glow}` }}
                  >
                    {resultRank.name}
                  </div>
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Performance Rank</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#161A1E] border border-white/5 p-3 text-center">
                    <div className="text-2xl font-bold font-mono text-[#00F0FF]">{resultAccuracy.toFixed(1)}%</div>
                    <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-1">Accuracy</div>
                  </div>
                  <div className="bg-[#161A1E] border border-white/5 p-3 text-center">
                    <div className="text-2xl font-bold font-mono text-[#FFD700]">{resultKPS.toFixed(2)}</div>
                    <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-1">KPS</div>
                  </div>
                  <div className="bg-[#161A1E] border border-white/5 p-3 text-center">
                    <div className="text-2xl font-bold font-mono text-[#00FF66]">{resultHits}</div>
                    <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-1">Hits</div>
                  </div>
                  <div className="bg-[#161A1E] border border-white/5 p-3 text-center">
                    <div className="text-2xl font-bold font-mono text-[#FF4655]">{resultMisses}</div>
                    <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-1">Misses</div>
                  </div>
                </div>

                {/* Miss Heatmap */}
                {resultMissPoints.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">Miss Distribution</p>
                    <div className="bg-[#161A1E] border border-white/5 p-2 relative" style={{ height: '120px' }}>
                      <canvas
                        ref={(el) => {
                          if (!el) return;
                          const hCtx = el.getContext('2d');
                          if (!hCtx) return;
                          el.width = el.parentElement?.clientWidth || 300;
                          el.height = 120;

                          hCtx.fillStyle = '#0B0E11';
                          hCtx.fillRect(0, 0, el.width, el.height);

                          // Draw grid
                          hCtx.strokeStyle = 'rgba(255,255,255,0.03)';
                          hCtx.lineWidth = 1;
                          for (let x = 0; x < el.width; x += 20) {
                            hCtx.beginPath(); hCtx.moveTo(x, 0); hCtx.lineTo(x, el.height); hCtx.stroke();
                          }
                          for (let y = 0; y < el.height; y += 20) {
                            hCtx.beginPath(); hCtx.moveTo(0, y); hCtx.lineTo(el.width, y); hCtx.stroke();
                          }

                          // Normalize miss points into canvas space
                          if (resultMissPoints.length > 0) {
                            if (controlStyleRef.current === 'classic') {
                              const gw = gameCanvasSizeRef.current.w || 800;
                              const gh = gameCanvasSizeRef.current.h || 600;
                              for (const p of resultMissPoints) {
                                const nx = (p.x / gw) * el.width;
                                const ny = (p.y / gh) * el.height;
                                hCtx.beginPath();
                                hCtx.arc(nx, ny, 3, 0, Math.PI * 2);
                                hCtx.fillStyle = 'rgba(255,70,85,0.7)';
                                hCtx.fill();
                              }
                              // Center crosshair
                              const ccx = el.width / 2;
                              const ccy = el.height / 2;
                              hCtx.strokeStyle = 'rgba(0,240,255,0.5)';
                              hCtx.lineWidth = 1;
                              hCtx.beginPath(); hCtx.moveTo(ccx - 6, ccy); hCtx.lineTo(ccx + 6, ccy); hCtx.stroke();
                              hCtx.beginPath(); hCtx.moveTo(ccx, ccy - 6); hCtx.lineTo(ccx, ccy + 6); hCtx.stroke();
                            } else {
                              let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                              for (const p of resultMissPoints) {
                                if (p.x < minX) minX = p.x;
                                  if (p.x > maxX) maxX = p.x;
                                  if (p.y < minY) minY = p.y;
                                  if (p.y > maxY) maxY = p.y;
                              }
                              const rangeX = Math.max(maxX - minX, 1);
                              const rangeY = Math.max(maxY - minY, 1);
                              const pad = 15;

                              for (const p of resultMissPoints) {
                                const nx = pad + ((p.x - minX) / rangeX) * (el.width - pad * 2);
                                const ny = pad + ((p.y - minY) / rangeY) * (el.height - pad * 2);
                                hCtx.beginPath();
                                hCtx.arc(nx, ny, 3, 0, Math.PI * 2);
                                hCtx.fillStyle = 'rgba(255,70,85,0.7)';
                                hCtx.fill();
                              }

                              // Center crosshair indicator
                              const ccx = pad + ((0 - minX) / rangeX) * (el.width - pad * 2);
                              const ccy = pad + ((0 - minY) / rangeY) * (el.height - pad * 2);
                              hCtx.strokeStyle = 'rgba(0,240,255,0.5)';
                              hCtx.lineWidth = 1;
                              hCtx.beginPath(); hCtx.moveTo(ccx - 6, ccy); hCtx.lineTo(ccx + 6, ccy); hCtx.stroke();
                              hCtx.beginPath(); hCtx.moveTo(ccx, ccy - 6); hCtx.lineTo(ccx, ccy + 6); hCtx.stroke();
                            }
                          }
                        }}
                        className="w-full"
                        style={{ height: '120px' }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={startCountdown}
                    className="flex-1 py-2.5 bg-gradient-to-r from-[#FF4655] to-[#FF6B78] text-white font-mono font-bold text-xs uppercase tracking-widest hover:brightness-110 transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>PLAY AGAIN</span>
                  </button>
                  <button
                    onClick={() => { setPhase('menu'); phaseRef.current = 'menu'; }}
                    className="px-4 py-2.5 border border-white/10 text-gray-400 font-mono font-bold text-xs uppercase tracking-widest hover:text-white hover:border-white/30 transition cursor-pointer"
                  >
                    MENU
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
