import React, { useEffect, useRef, useState } from 'react';
import { ProofBridgeMark } from './ProofBridgeLogo';

interface BootScreenProps {
  onComplete?: () => void;
  minimumDurationMs?: number;
}

interface LogoParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  color: string;
  radius: number;
  phaseOffset: number;
  isEdge: boolean;
}

const LOGO_PATHS = [
  {
    d: 'M27 16H66C84.7777 16 100 30.5507 100 48.5C100 66.4493 84.7777 81 66 81H59V64.5L65.5 60.5C74.6127 59.5 81.5 54.6 81.5 48.5C81.5 41.3203 74.8 36 65.5 36H46.5L27 47.5V16Z',
    color: '#FF8A32',
  },
  {
    d: 'M20 67L35 58V104H20V67Z',
    color: '#F55B0E',
  },
  {
    d: 'M20 67V56.5C20 53.8 21.4 51.3 23.8 49.9L50.5 34.5H73L20 67Z',
    color: '#FFA126',
  },
  {
    d: 'M43 62.5L59 53V93.5C59 96.4 57.4 99 54.8 100.4L43 104V62.5Z',
    color: '#FF6B1A',
  },
];

/**
 * Samples target coordinates from the 4 SVG paths of ProofBridgeMark
 * so floating web dots naturally gather into the ProofBridge logo.
 */
function sampleLogoTargetPoints(scaleLogoSize: number): Array<{
  tx: number;
  ty: number;
  color: string;
  isEdge: boolean;
}> {
  const offscreen = document.createElement('canvas');
  offscreen.width = 120;
  offscreen.height = 120;
  const ctx = offscreen.getContext('2d');
  if (!ctx || typeof Path2D === 'undefined') {
    return [];
  }

  ctx.lineWidth = 2.6;
  const path2DList = LOGO_PATHS.map((item) => ({
    path: new Path2D(item.d),
    color: item.color,
  }));

  const points: Array<{
    tx: number;
    ty: number;
    color: string;
    isEdge: boolean;
  }> = [];

  const step = 3.6;
  for (let y = 14; y <= 106; y += step) {
    for (let x = 18; x <= 102; x += step) {
      for (const item of path2DList) {
        const inFill = ctx.isPointInPath(item.path, x, y);
        const onEdge = ctx.isPointInStroke(item.path, x, y);
        if (inFill || onEdge) {
          const normX = ((x - 60) / 120) * scaleLogoSize;
          const normY = ((y - 60) / 120) * scaleLogoSize;
          points.push({
            tx: normX,
            ty: normY,
            color: onEdge ? '#FFA84C' : item.color,
            isEdge: onEdge,
          });
          break;
        }
      }
    }
  }

  return points;
}

export function ProofBridgeBootScreen({
  onComplete,
  minimumDurationMs = 2900,
}: BootScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [logoSolidOpacity, setLogoSolidOpacity] = useState(0);
  const [wordmarkVisible, setWordmarkVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [unmounted, setUnmounted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const logoDisplaySize = Math.min(width, height) < 500 ? 148 : 184;
    const targets = sampleLogoTargetPoints(logoDisplaySize);

    const spreadX = Math.min(width * 0.44, 440);
    const spreadY = Math.min(height * 0.38, 320);

    const particles: LogoParticle[] = targets.map((t, idx) => {
      const angle =
        (idx / Math.max(1, targets.length)) * Math.PI * 2 + (idx % 7) * 0.45;
      const dist =
        85 + (((idx * 37) % 100) / 100) * Math.max(spreadX, spreadY);
      return {
        x: Math.cos(angle) * dist + (Math.random() - 0.5) * 95,
        y: Math.sin(angle) * dist * 0.8 + (Math.random() - 0.5) * 95,
        vx: (Math.random() - 0.5) * 1.25,
        vy: (Math.random() - 0.5) * 1.25,
        tx: t.tx,
        ty: t.ty,
        color: idx % 14 === 0 ? '#F5F5F5' : t.color,
        radius: t.isEdge ? 2.35 : 1.95,
        phaseOffset: Math.random() * Math.PI * 2,
        isEdge: t.isEdge,
      };
    });

    const startTime = performance.now();
    let finished = false;

    const render = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / minimumDurationMs);

      if (t > 0.45) {
        setWordmarkVisible(true);
      }

      const solidAlpha = t > 0.72 ? Math.min(1, (t - 0.72) / 0.22) : 0;
      setLogoSolidOpacity(solidAlpha);

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2 - 36;

      // Soft warm ambient glow behind the gathering dots
      const radial = ctx.createRadialGradient(
        centerX,
        centerY,
        8,
        centerX,
        centerY,
        Math.max(240, spreadX)
      );
      radial.addColorStop(
        0,
        `rgba(255, 138, 50, ${0.09 + solidAlpha * 0.11})`
      );
      radial.addColorStop(0.6, 'rgba(255, 107, 26, 0.02)');
      radial.addColorStop(1, 'rgba(17, 19, 24, 0)');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);

      const assembleProgress =
        t <= 0.25
          ? 0
          : t >= 0.78
          ? 1
          : 1 - Math.pow(1 - (t - 0.25) / 0.53, 3);

      const screenPts: Array<{
        px: number;
        py: number;
        color: string;
        radius: number;
      }> = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (assembleProgress < 0.95) {
          p.x += p.vx * (1 - assembleProgress * 0.85);
          p.y += p.vy * (1 - assembleProgress * 0.85);

          if (p.x > spreadX || p.x < -spreadX) p.vx *= -1;
          if (p.y > spreadY || p.y < -spreadY) p.vy *= -1;
        }

        const gentleWave =
          Math.sin(assembleProgress * Math.PI) *
          14 *
          Math.cos(p.phaseOffset + elapsed * 0.0035);

        const curX =
          p.x * (1 - assembleProgress) +
          p.tx * assembleProgress +
          gentleWave * (1 - assembleProgress);
        const curY =
          p.y * (1 - assembleProgress) +
          p.ty * assembleProgress +
          gentleWave * (1 - assembleProgress);

        screenPts.push({
          px: centerX + curX,
          py: centerY + curY,
          color: p.color,
          radius: p.radius,
        });
      }

      // Delicate web threads connecting nearby floating dots
      const maxDist = 90 * (1 - assembleProgress) + 20 * assembleProgress;
      const maxDistSq = maxDist * maxDist;
      const webFade = 1 - solidAlpha * 0.78;

      ctx.lineWidth = 0.8;
      for (let i = 0; i < screenPts.length; i++) {
        const a = screenPts[i];
        let links = 0;
        for (let j = i + 1; j < screenPts.length; j += 2) {
          const b = screenPts[j];
          const dx = a.px - b.px;
          const dy = a.py - b.py;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxDistSq) {
            const distRatio = 1 - Math.sqrt(distSq) / maxDist;
            const alpha = distRatio * 0.36 * webFade;
            if (alpha > 0.02) {
              ctx.strokeStyle = `rgba(255, 148, 72, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(a.px, a.py);
              ctx.lineTo(b.px, b.py);
              ctx.stroke();
              links++;
              if (links >= 4) break;
            }
          }
        }
      }

      // Floating dots
      const dotFade = 1 - solidAlpha * 0.7;
      for (let i = 0; i < screenPts.length; i++) {
        const pt = screenPts[i];
        ctx.globalAlpha = dotFade;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(
          pt.px,
          pt.py,
          pt.radius * (1 + assembleProgress * 0.15),
          0,
          Math.PI * 2
        );
        ctx.fill();

        if (i % 7 === 0 && solidAlpha < 0.85) {
          ctx.globalAlpha = 0.2 * dotFade;
          ctx.beginPath();
          ctx.arc(pt.px, pt.py, pt.radius * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      if (t < 1) {
        rafId = requestAnimationFrame(render);
      } else if (!finished) {
        finished = true;
        setExiting(true);
        setTimeout(() => {
          setUnmounted(true);
          onComplete?.();
        }, 420);
      }
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [minimumDurationMs, onComplete]);

  if (unmounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading ProofBridge"
      onClick={() => {
        setExiting(true);
        setTimeout(() => {
          setUnmounted(true);
          onComplete?.();
        }, 200);
      }}
      className={`fixed inset-0 z-[120] bg-[#111318] flex flex-col items-center justify-center p-6 select-none overflow-hidden transition-all duration-500 cursor-pointer ${
        exiting
          ? 'opacity-0 scale-[1.02] pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* Floating Web Dots -> Logo Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Crisp Vector Logo that Blends In as the Dots Settle */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          transform: 'translateY(-36px)',
          opacity: logoSolidOpacity,
          transition: 'opacity 150ms ease-out',
        }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            filter: 'drop-shadow(0 12px 28px rgba(255, 107, 26, 0.28))',
          }}
        >
          <ProofBridgeMark className="w-[148px] h-[148px] sm:w-[184px] sm:h-[184px]" />
        </div>
      </div>

      {/* Warm Human Brand Wordmark Below the Assembled Logo */}
      <div
        className={`relative z-10 mt-[230px] sm:mt-[265px] text-center space-y-2 transition-all duration-700 ${
          wordmarkVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-3'
        }`}
      >
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F5F5F5]">
          Proof<span className="text-[#FF6B1A]">Bridge</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#A1A1AA] font-normal">
          Every report matters. Every fix is verified.
        </p>
      </div>
    </div>
  );
}

/**
 * Compact Web-Node Loader for Modals & Drawers
 */
export function ProofBridgeOrbitalCore({
  size = 'md',
}: {
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims =
    size === 'lg'
      ? 'w-24 h-24'
      : size === 'md'
      ? 'w-16 h-16'
      : 'w-10 h-10';
  const markDims =
    size === 'lg'
      ? 'w-12 h-12'
      : size === 'md'
      ? 'w-9 h-9'
      : 'w-6 h-6';

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${dims}`}>
      <div className="absolute inset-0 rounded-full bg-[#FF8A32]/15 blur-xl animate-pb-core-breathe pointer-events-none" />
      <ProofBridgeMark className={`relative z-10 ${markDims} animate-pb-emblem-float`} />
    </div>
  );
}

export function TopSyncLaserBar({
  active,
}: {
  active: boolean;
  label?: string;
}) {
  if (!active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[95] h-[2px] bg-transparent overflow-hidden pointer-events-none">
      <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#FF8A32] to-transparent animate-pb-top-laser" />
    </div>
  );
}

export function ActionLoaderOverlay({
  active,
  title = 'Just a moment...',
  subtitle = 'Saving your changes...',
}: {
  active: boolean;
  title?: string;
  subtitle?: string;
}) {
  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-0 z-[110] bg-[#111318]/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div className="bg-[#1C2028] border border-[#2B303A] rounded-card max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-scale-in">
        <div className="flex justify-center">
          <ProofBridgeOrbitalCore size="md" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display text-base font-semibold text-[#F5F5F5]">
            {title}
          </h3>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export function DrawerSkeletonLoader() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 border border-[#2B303A] rounded-card bg-[#14171E]/40">
        <ProofBridgeOrbitalCore size="md" />
        <p className="text-sm text-[#A1A1AA]">
          Opening issue details...
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-40 rounded-card bg-[#14171E] border border-[#2B303A] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#222731]/70 to-transparent animate-pb-shimmer-sweep" />
        </div>
        <div className="h-40 rounded-card bg-[#14171E] border border-[#2B303A] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#222731]/70 to-transparent animate-pb-shimmer-sweep" />
        </div>
      </div>
    </div>
  );
}
