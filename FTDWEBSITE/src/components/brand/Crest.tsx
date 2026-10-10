import { useId } from 'react';

/**
 * Stand-in crest used only while the official FGDR logo file is absent.
 * Shield, polished gold, roulette ring and a cyan circuit line — the same
 * visual vocabulary as the real mark.
 */
export function Crest({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const gold = `g${id}`;
  const goldStroke = `gs${id}`;
  const face = `f${id}`;
  const glow = `gl${id}`;

  return (
    <svg className={className} viewBox="0 0 240 240" role="img" aria-label="FGDR crest">
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4cf" />
          <stop offset=".3" stopColor="#ecd08a" />
          <stop offset=".55" stopColor="#b98f3e" />
          <stop offset=".72" stopColor="#8a6424" />
          <stop offset="1" stopColor="#f0d690" />
        </linearGradient>
        <linearGradient id={goldStroke} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbeec4" />
          <stop offset=".45" stopColor="#c9a24a" />
          <stop offset=".7" stopColor="#7d5a20" />
          <stop offset="1" stopColor="#e9c878" />
        </linearGradient>
        <radialGradient id={face} cx=".5" cy=".3" r=".85">
          <stop offset="0" stopColor="#1c2233" />
          <stop offset=".6" stopColor="#0b0e16" />
          <stop offset="1" stopColor="#05060a" />
        </radialGradient>
        <radialGradient id={glow} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#4fd8ff" stopOpacity=".35" />
          <stop offset="1" stopColor="#4fd8ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* roulette ring */}
      <circle cx="120" cy="124" r="104" fill="none" stroke={`url(#${goldStroke})`} strokeWidth="3" />
      <circle cx="120" cy="124" r="96" fill="none" stroke="#4fd8ff" strokeOpacity=".35" strokeWidth="1" />
      <g stroke={`url(#${goldStroke})`} strokeWidth="2.2" strokeLinecap="round">
        {Array.from({ length: 36 }, (_, i) => {
          const a = (i * 10 * Math.PI) / 180;
          const r1 = 98;
          const r2 = i % 3 === 0 ? 88 : 93;
          // Rounded so server and browser render identical attributes.
          const p = (v: number) => Math.round(v * 100) / 100;
          return (
            <line
              key={i}
              x1={p(120 + Math.cos(a) * r1)}
              y1={p(124 + Math.sin(a) * r1)}
              x2={p(120 + Math.cos(a) * r2)}
              y2={p(124 + Math.sin(a) * r2)}
              opacity={i % 3 === 0 ? 1 : 0.55}
            />
          );
        })}
      </g>

      <circle cx="120" cy="124" r="70" fill={`url(#${glow})`} />

      {/* shield */}
      <path
        d="M120 30 180 50v58c0 42-26 70-60 86-34-16-60-44-60-86V50l60-20Z"
        fill={`url(#${face})`}
        stroke={`url(#${goldStroke})`}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M120 42 170 58v50c0 36-22 60-50 74-28-14-50-38-50-74V58l50-16Z"
        fill="none"
        stroke="#4fd8ff"
        strokeOpacity=".45"
        strokeWidth="1"
      />

      {/* circuit trace */}
      <path d="M78 150h18l8-8h32l8 8h18" fill="none" stroke="#4fd8ff" strokeOpacity=".7" strokeWidth="1.4" />
      <circle cx="78" cy="150" r="2.4" fill="#4fd8ff" />
      <circle cx="162" cy="150" r="2.4" fill="#4fd8ff" />

      {/* spade crown */}
      <path
        d="M120 58c6 7 16 12 16 20a8 8 0 0 1-13 6l2 9h-10l2-9a8 8 0 0 1-13-6c0-8 10-13 16-20Z"
        fill={`url(#${gold})`}
      />

      <text
        x="120"
        y="130"
        textAnchor="middle"
        fontFamily="Archivo, 'Arial Black', sans-serif"
        fontWeight="900"
        fontSize="44"
        letterSpacing="-1"
        fill={`url(#${gold})`}
        stroke="#3b2a0b"
        strokeWidth=".8"
      >
        FGDR
      </text>

      <text
        x="120"
        y="170"
        textAnchor="middle"
        fontFamily="Manrope, Arial, sans-serif"
        fontWeight="800"
        fontSize="8.5"
        letterSpacing="2.6"
        fill="#e2c275"
      >
        FATGUYSDONTRUN
      </text>
    </svg>
  );
}
