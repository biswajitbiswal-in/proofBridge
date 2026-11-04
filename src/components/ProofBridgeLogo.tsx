import React from 'react';

interface ProofBridgeLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  subtitle?: string;
  className?: string;
}

export function ProofBridgeMark({ className = 'w-8 h-8' }: { className?: string }) {
  const uid = React.useId().replace(/:/g, '');
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`pb-loop-${uid}`}
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
          id={`pb-ramp-${uid}`}
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
          id={`pb-left-${uid}`}
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
          id={`pb-right-${uid}`}
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
        fill={`url(#pb-loop-${uid})`}
      />

      {/* Left Vertical Bridge Pillar */}
      <path d="M20 67L35 58V104H20V67Z" fill={`url(#pb-left-${uid})`} />

      {/* Diagonal Bridge Ramp Piercing the P */}
      <path
        d="M20 67V56.5C20 53.8 21.4 51.3 23.8 49.9L50.5 34.5H73L20 67Z"
        fill={`url(#pb-ramp-${uid})`}
      />

      {/* Right Inner Bridge Pillar */}
      <path
        d="M43 62.5L59 53V93.5C59 96.4 57.4 99 54.8 100.4L43 104V62.5Z"
        fill={`url(#pb-right-${uid})`}
      />
    </svg>
  );
}

export function ProofBridgeLogo({
  size = 'md',
  showTagline = false,
  subtitle,
  className = '',
}: ProofBridgeLogoProps) {
  const iconSize =
    size === 'lg' ? 'w-11 h-11' : size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const textSize =
    size === 'lg'
      ? 'text-2xl sm:text-3xl'
      : size === 'sm'
      ? 'text-base'
      : 'text-xl';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <ProofBridgeMark className={`${iconSize} shrink-0`} />
      <div className="leading-none">
        <span
          className={`font-display font-bold tracking-tight block ${textSize}`}
        >
          <span className="text-[#F5F5F5]">Proof</span>
          <span className="text-[#FF6B1A]">Bridge</span>
        </span>
        {(showTagline || subtitle) && (
          <span className="block text-[11px] text-[#A1A1AA] font-normal tracking-wide mt-1">
            {subtitle || 'From reported problems to verified outcomes.'}
          </span>
        )}
      </div>
    </div>
  );
}
