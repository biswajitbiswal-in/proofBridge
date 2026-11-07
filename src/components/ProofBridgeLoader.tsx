import React, { useEffect, useState } from 'react';
import { CheckCircle2, Camera, ShieldCheck, Sparkles } from 'lucide-react';

interface BootScreenProps {
  onComplete?: () => void;
  minimumDurationMs?: number;
}

const PIPELINE_STAGES = [
  {
    code: '01',
    label: 'Reported Problem',
    sub: 'Telemetry & Geolocation Locked',
    icon: Sparkles,
  },
  {
    code: '02',
    label: 'Photographic Proof',
    sub: 'Evidence Hash & Side-by-Side Ready',
    icon: Camera,
  },
  {
    code: '03',
    label: 'Verified Outcome',
    sub: 'Zero-Trust Ledger Synchronized',
    icon: ShieldCheck,
  },
];

export function ProofBridgeOrbitalCore({
  size = 'lg',
}: {
  size?: 'sm' | 'md' | 'lg';
}) {
  const uid = React.useId().replace(/:/g, '');
  const dims =
    size === 'lg'
      ? 'w-32 h-32 sm:w-36 sm:h-36'
      : size === 'md'
      ? 'w-20 h-20'
      : 'w-12 h-12';
  const markDims =
    size === 'lg'
      ? 'w-16 h-16 sm:w-20 sm:h-20'
      : size === 'md'
      ? 'w-10 h-10'
      : 'w-6 h-6';

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${dims}`}>
      {/* Ambient Radial Core Glow */}
      <div className="absolute inset-0 rounded-full bg-[#FF8A32]/20 blur-2xl animate-pb-core-breathe pointer-events-none" />
      <div className="absolute inset-3 rounded-full bg-[#22C55E]/10 blur-xl animate-pb-core-breathe-delayed pointer-events-none" />

      {/* Outer Orbital Telemetry Ring (Clockwise) */}
      <svg
        viewBox="0 0 160 160"
        className="absolute inset-0 w-full h-full animate-pb-orbit-cw"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`pb-ring-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF8A32" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#FF6B1A" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <circle
          cx="80"
          cy="80"
          r="74"
          fill="none"
          stroke="#2B303A"
          strokeWidth="1"
          strokeDasharray="3 6"
        />
        <circle
          cx="80"
          cy="80"
          r="74"
          fill="none"
          stroke={`url(#pb-ring-grad-${uid})`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="110 360"
        />
        {/* Orbiting Satellite Node */}
        <circle cx="80" cy="6" r="3.5" fill="#FF8A32" />
        <circle cx="80" cy="6" r="7" fill="#FF8A32" fillOpacity="0.28" />
      </svg>

      {/* Middle Precision Verification Ring (Counter-Clockwise) */}
      <svg
        viewBox="0 0 160 160"
        className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] animate-pb-orbit-ccw"
        aria-hidden="true"
      >
        <circle
          cx="80"
          cy="80"
          r="62"
          fill="none"
          stroke="#2B303A"
          strokeWidth="1.2"
        />
        <circle
          cx="80"
          cy="80"
          r="62"
          fill="none"
          stroke="#FF8A32"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="64 140 28 160"
          strokeOpacity="0.85"
        />
        <circle cx="142" cy="80" r="2.8" fill="#22C55E" />
      </svg>

      {/* Inner Hexagonal / Radar Frame */}
      <div className="relative flex items-center justify-center rounded-full bg-[#14171E]/90 border border-[#2B303A] shadow-[0_0_40px_rgba(255,138,50,0.18)] p-4 overflow-hidden">
        {/* Holographic Laser Scan Line */}
        <div className="
          absolute inset-x-0 h-6
          bg-gradient-to-b from-transparent via-[#FF8A32]/30 to-transparent
          border-b border-[#FF8A32]/70
          animate-pb-laser-scan pointer-events-none z-10
        " />

        {/* Animated ProofBridge Vector Emblem */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 120 120"
          fill="none"
          className={`relative z-0 ${markDims} animate-pb-emblem-float`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={`pb-loader-loop-${uid}`}
              x1="26"
              y1="16"
              x2="96"
              y2="74"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FF9A1F" />
              <stop offset="55%" stopColor="#FF6B1A" />
              <stop offset="100%" stopColor="#F04E08" />
            </linearGradient>
            <linearGradient
              id={`pb-loader-ramp-${uid}`}
              x1="20"
              y1="62"
              x2="72"
              y2="38"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FFA126" />
              <stop offset="100%" stopColor="#FF6214" />
            </linearGradient>
            <linearGradient
              id={`pb-loader-left-${uid}`}
              x1="28"
              y1="60"
              x2="28"
              y2="104"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#D94105" />
              <stop offset="40%" stopColor="#F55B0E" />
              <stop offset="100%" stopColor="#FF7418" />
            </linearGradient>
            <linearGradient
              id={`pb-loader-right-${uid}`}
              x1="51"
              y1="54"
              x2="51"
              y2="104"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FF7E1D" />
              <stop offset="100%" stopColor="#F24F09" />
            </linearGradient>
          </defs>

          {/* Outer P Arch and Loop */}
          <path
            d="M27 16H66C84.7777 16 100 30.5507 100 48.5C100 66.4493 84.7777 81 66 81H59V64.5L65.5 60.5C74.6127 59.5 81.5 54.6 81.5 48.5C81.5 41.3203 74.8 36 65.5 36H46.5L27 47.5V16Z"
            fill={`url(#pb-loader-loop-${uid})`}
            className="animate-pb-piece-1"
          />

          {/* Left Vertical Bridge Pillar */}
          <path
            d="M20 67L35 58V104H20V67Z"
            fill={`url(#pb-loader-left-${uid})`}
            className="animate-pb-piece-2"
          />

          {/* Diagonal Bridge Ramp Piercing the P */}
          <path
            d="M20 67V56.5C20 53.8 21.4 51.3 23.8 49.9L50.5 34.5H73L20 67Z"
            fill={`url(#pb-loader-ramp-${uid})`}
            className="animate-pb-piece-3"
          />

          {/* Right Inner Bridge Pillar */}
          <path
            d="M43 62.5L59 53V93.5C59 96.4 57.4 99 54.8 100.4L43 104V62.5Z"
            fill={`url(#pb-loader-right-${uid})`}
            className="animate-pb-piece-4"
          />
        </svg>
      </div>
    </div>
  );
}

export function ProofBridgeBootScreen({
  onComplete,
  minimumDurationMs = 1150,
}: BootScreenProps) {
  const [progress, setProgress] = useState(8);
  const [exiting, setExiting] = useState(false);
  const [unmounted, setUnmounted] = useState(false);

  useEffect(() => {
    const start = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const ratio = Math.min(1, elapsed / minimumDurationMs);
      // Ease-out cubic curve for smooth progress acceleration
      const eased = 1 - Math.pow(1 - ratio, 3);
      setProgress(Math.min(100, Math.round(8 + eased * 92)));

      if (ratio < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setExiting(true);
        setTimeout(() => {
          setUnmounted(true);
          onComplete?.();
        }, 380);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [minimumDurationMs, onComplete]);

  if (unmounted) return null;

  const activeStageIndex = progress < 38 ? 0 : progress < 76 ? 1 : 2;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Initializing ProofBridge verification platform"
      onClick={() => {
        setExiting(true);
        setTimeout(() => {
          setUnmounted(true);
          onComplete?.();
        }, 180);
      }}
      className={`fixed inset-0 z-[120] bg-[#111318] flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden transition-all duration-400 ${
        exiting ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Subtle Architectural Grid Backdrop */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 42%, rgba(255, 138, 50, 0.16), transparent 60%), linear-gradient(to right, rgba(43, 48, 58, 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(43, 48, 58, 0.35) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 48px 48px, 48px 48px',
        }}
      />

      {/* Top Telemetry Bar */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-[#71717A]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FF8A32] live-pulse-dot" />
          <span className="text-[#A1A1AA]">PROOFBRIDGE // VERIFICATION ENGINE</span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <span>ZERO-TRUST AUDIT</span>
          <span className="text-[#22C55E]">● LEDGER READY</span>
        </div>
      </div>

      {/* Centerpiece Orbital Reactor + Brand Identity */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full my-auto py-6 space-y-7">
        <ProofBridgeOrbitalCore size="lg" />

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C2028] border border-[#2B303A] text-[10px] font-mono uppercase tracking-[0.2em] text-[#FF8A32]">
            <span>EVIDENCE-FIRST OPERATIONS</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F5F5F5]">
            Proof<span className="text-[#FF6B1A]">Bridge</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-sm mx-auto">
            From reported problems to human-verified outcomes.
          </p>
        </div>

        {/* 3-Stage Verification Pipeline Visualizer */}
        <div className="w-full grid grid-cols-3 gap-2 sm:gap-3 pt-1">
          {PIPELINE_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isCompleted = idx < activeStageIndex || progress >= 98;
            const isCurrent = idx === activeStageIndex && progress < 98;

            return (
              <div
                key={stage.code}
                className={`relative rounded-card px-3 py-2.5 border text-left transition-all duration-300 ${
                  isCompleted
                    ? 'bg-[#22C55E]/10 border-[#22C55E]/40 text-[#F5F5F5]'
                    : isCurrent
                    ? 'bg-[#FF8A32]/12 border-[#FF8A32]/60 text-[#F5F5F5] shadow-[0_0_20px_rgba(255,138,50,0.15)]'
                    : 'bg-[#14171E]/80 border-[#2B303A] text-[#71717A]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] font-semibold tracking-wider text-[#A1A1AA]">
                    [{stage.code}]
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                  ) : (
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isCurrent ? 'text-[#FF8A32] animate-pulse' : 'text-[#71717A]'
                      }`}
                    />
                  )}
                </div>
                <p className="text-[11px] font-semibold leading-tight truncate">
                  {stage.label}
                </p>
                <p className="text-[9px] text-[#A1A1AA] truncate mt-0.5 hidden sm:block">
                  {stage.sub}
                </p>
              </div>
            );
          })}
        </div>

        {/* Liquid Shimmer Progress Bar */}
        <div className="w-full space-y-2 pt-1">
          <div className="h-1.5 w-full rounded-full bg-[#1C2028] border border-[#2B303A] overflow-hidden p-[1px]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FF6B1A] via-[#FF8A32] to-[#22C55E] transition-all duration-150 ease-out relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pb-shimmer-sweep" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[#A1A1AA]">
            <span className="truncate">
              {progress < 38
                ? 'INITIALIZING CIVIC WORKSPACE...'
                : progress < 76
                ? 'CALIBRATING EVIDENCE VERIFICATION PIPELINE...'
                : 'SYNCHRONIZING AUDIT LEDGER...'}
            </span>
            <span className="text-[#FF8A32] font-semibold tabular-nums">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Footer Telemetry */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between text-[10px] font-mono text-[#71717A]">
        <span>CLAIMED REPAIR ≠ VERIFIED OUTCOME</span>
        <span className="text-[#A1A1AA]">CLICK ANYWHERE TO SKIP ↗</span>
      </div>
    </div>
  );
}

export function TopSyncLaserBar({
  active,
  label = 'SYNCING CLOUD LEDGER',
}: {
  active: boolean;
  label?: string;
}) {
  if (!active) return null;

  return (
    <>
      {/* Top 2px Laser Progress Line */}
      <div className="fixed top-0 left-0 right-0 z-[95] h-[2.5px] bg-[#14171E] overflow-hidden pointer-events-none">
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#FF8A32] to-[#22C55E] animate-pb-top-laser" />
      </div>

      {/* Floating Telemetry Pill */}
      <div className="fixed top-3.5 right-4 z-[95] pointer-events-none animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C2028]/95 border border-[#FF8A32]/40 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#FF8A32] live-pulse-dot" />
          <span className="font-mono text-[10px] font-semibold tracking-wider uppercase text-[#F5F5F5]">
            {label}
          </span>
        </div>
      </div>
    </>
  );
}

export function ActionLoaderOverlay({
  active,
  title = 'Processing Verification Request',
  subtitle = 'Synchronizing cryptographic audit trail with cloud ledger...',
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
      className="fixed inset-0 z-[110] bg-[#111318]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
    >
      <div className="bg-[#1C2028] border border-[#2B303A] rounded-card max-w-md w-full p-7 text-center space-y-5 shadow-[0_24px_64px_rgba(0,0,0,0.65)] animate-scale-in relative overflow-hidden">
        {/* Top Glowing Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF6B1A] via-[#FF8A32] to-[#22C55E] animate-gradient-shift" />

        <div className="flex justify-center pt-1">
          <ProofBridgeOrbitalCore size="md" />
        </div>

        <div className="space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FF8A32]">
            LIVE CLOUD OPERATION
          </p>
          <h3 className="font-display text-lg font-bold text-[#F5F5F5]">
            {title}
          </h3>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">{subtitle}</p>
        </div>

        <div className="h-1 w-full rounded-full bg-[#14171E] overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#FF8A32] to-[#22C55E] animate-pb-top-laser" />
        </div>
      </div>
    </div>
  );
}

export function DrawerSkeletonLoader() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 border border-dashed border-[#2B303A] rounded-card bg-[#14171E]/50">
        <ProofBridgeOrbitalCore size="md" />
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#FF8A32]">
            RETRIEVING EVIDENCE RECORD
          </p>
          <p className="text-sm font-semibold text-[#F5F5F5]">
            Loading side-by-side photographic proof & audit timeline...
          </p>
        </div>
      </div>

      {/* Shimmering Skeleton Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-44 rounded-card bg-[#14171E] border border-[#2B303A] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#222731]/70 to-transparent animate-pb-shimmer-sweep" />
        </div>
        <div className="h-44 rounded-card bg-[#14171E] border border-[#2B303A] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#222731]/70 to-transparent animate-pb-shimmer-sweep" />
        </div>
      </div>
    </div>
  );
}
