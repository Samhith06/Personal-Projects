/**
 * Generated key art for media without an uploaded thumbnail.
 *
 * Deterministic per item (seeded from its id) so the same clip always looks
 * the same, and composed from the FGDR vocabulary — roulette wheels, chips,
 * cards, circuit lines — tinted to the creator's accent. The moment a real
 * `thumbnailUrl` is set in the admin area, the photo replaces this.
 */
const ACCENTS: Record<string, { hue: string; glow: string }> = {
  gold: { hue: '#d9b65f', glow: 'rgba(217,182,95,0.55)' },
  cyan: { hue: '#4fd8ff', glow: 'rgba(79,216,255,0.45)' },
  steel: { hue: '#b7c3d6', glow: 'rgba(183,195,214,0.4)' },
  ruby: { hue: '#e0526b', glow: 'rgba(224,82,107,0.45)' },
};

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

function Wheel({ cx, cy, r, hue, gid }: { cx: number; cy: number; r: number; hue: string; gid: string }) {
  const pockets = 37;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={r * 0.035} />
      <circle cx={cx} cy={cy} r={r * 0.9} fill="#07080c" stroke={`url(#${gid})`} strokeWidth={r * 0.012} />
      {Array.from({ length: pockets }, (_, i) => {
        const a0 = (i / pockets) * Math.PI * 2;
        const a1 = ((i + 1) / pockets) * Math.PI * 2;
        const ro = r * 0.88;
        const ri = r * 0.64;
        const d = `M${r2(cx + Math.cos(a0) * ri)} ${r2(cy + Math.sin(a0) * ri)}L${r2(cx + Math.cos(a0) * ro)} ${r2(cy + Math.sin(a0) * ro)}L${r2(cx + Math.cos(a1) * ro)} ${r2(cy + Math.sin(a1) * ro)}L${r2(cx + Math.cos(a1) * ri)} ${r2(cy + Math.sin(a1) * ri)}Z`;
        const fill = i === 0 ? hue : i % 2 ? '#141821' : '#2a0d14';
        return <path key={i} d={d} fill={fill} opacity={i === 0 ? 0.9 : 0.95} />;
      })}
      <circle cx={cx} cy={cy} r={r * 0.6} fill="#0b0d13" stroke={`url(#${gid})`} strokeWidth={r * 0.015} />
      <circle cx={cx} cy={cy} r={r * 0.34} fill={`url(#${gid})`} opacity="0.9" />
      <circle cx={cx} cy={cy} r={r * 0.26} fill="#0b0d13" />
      {Array.from({ length: 4 }, (_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <line
            key={i}
            x1={r2(cx + Math.cos(a) * r * 0.1)}
            y1={r2(cy + Math.sin(a) * r * 0.1)}
            x2={r2(cx + Math.cos(a) * r * 0.5)}
            y2={r2(cy + Math.sin(a) * r * 0.5)}
            stroke={`url(#${gid})`}
            strokeWidth={r * 0.03}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

function Chip({ cx, cy, r, hue, gid }: { cx: number; cy: number; r: number; hue: string; gid: string }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy + r * 0.18} rx={r} ry={r * 0.36} fill="#000" opacity="0.5" />
      <circle cx={cx} cy={cy} r={r} fill={hue} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth={r * 0.16} strokeDasharray={`${r2(r * 0.45)} ${r2(r * 0.34)}`} />
      <circle cx={cx} cy={cy} r={r * 0.66} fill="#0b0d13" stroke={`url(#${gid})`} strokeWidth={r * 0.05} />
      <circle cx={cx} cy={cy} r={r * 0.5} fill="none" stroke={hue} strokeOpacity="0.6" strokeWidth={r * 0.03} />
    </g>
  );
}

function Card({ x, y, w, rot, suit }: { x: number; y: number; w: number; rot: number; suit: 'spade' | 'heart' }) {
  const h = w * 1.4;
  return (
    <g transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y} width={w} height={h} rx={w * 0.08} fill="#f5efe1" />
      <rect x={x + w * 0.06} y={y + w * 0.06} width={w * 0.88} height={h - w * 0.12} rx={w * 0.05} fill="none" stroke="#c9a24a" strokeWidth={w * 0.012} />
      <text x={x + w * 0.12} y={y + w * 0.3} fontSize={w * 0.2} fontWeight="800" fontFamily="Georgia, serif" fill={suit === 'heart' ? '#b3123a' : '#0b0d13'}>
        A
      </text>
      <text
        x={x + w / 2}
        y={y + h * 0.62}
        fontSize={w * 0.56}
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fill={suit === 'heart' ? '#b3123a' : '#0b0d13'}
      >
        {suit === 'heart' ? '♥' : '♠'}
      </text>
    </g>
  );
}

export function MediaArt({
  seed,
  accent = 'gold',
  label,
  variant = 'clip',
  orientation = 'landscape',
}: {
  seed: string;
  accent?: string;
  /** Large typographic element — a win amount or multiplier. */
  label?: string;
  variant?: 'clip' | 'win' | 'raffle';
  orientation?: 'landscape' | 'portrait';
}) {
  const a = ACCENTS[accent] ?? ACCENTS.gold;
  const h = hash(seed);
  const W = orientation === 'portrait' ? 900 : 1600;
  const H = orientation === 'portrait' ? 1600 : 900;
  const motif = h % 3; // 0 wheel, 1 chips, 2 cards
  const flip = (h >> 3) % 2 === 1;
  const lightX = flip ? W * 0.2 : W * 0.8;

  const wheelR = Math.min(W, H) * 0.44;
  const wheelCx = flip ? W * 0.27 : W * 0.73;
  const wheelCy = H * 0.6;

  return (
    <svg className="media-art" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`artGold-${h}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbeec4" />
          <stop offset=".45" stopColor="#c9a24a" />
          <stop offset=".7" stopColor="#7d5a20" />
          <stop offset="1" stopColor="#e9c878" />
        </linearGradient>
        <radialGradient id={`light-${h}`} cx={lightX / W} cy="0" r="0.9">
          <stop offset="0" stopColor={a.glow} />
          <stop offset="0.45" stopColor="rgba(10,12,20,0.4)" />
          <stop offset="1" stopColor="rgba(3,4,7,0)" />
        </radialGradient>
        <linearGradient id={`fade-${h}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.35" stopColor="#030407" stopOpacity="0" />
          <stop offset="1" stopColor="#030407" stopOpacity="0.92" />
        </linearGradient>
        <pattern id={`grid-${h}`} width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M80 0H0V80" fill="none" stroke={a.hue} strokeOpacity="0.06" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width={W} height={H} fill="#06070b" />
      <rect width={W} height={H} fill={`url(#grid-${h})`} />
      <rect width={W} height={H} fill={`url(#light-${h})`} />

      {/* felt arc */}
      <ellipse cx={W / 2} cy={H * 1.25} rx={W * 0.9} ry={H * 0.62} fill="#0a1a1c" opacity="0.55" />
      <ellipse cx={W / 2} cy={H * 1.25} rx={W * 0.9} ry={H * 0.62} fill="none" stroke={`url(#artGold-${h})`} strokeOpacity="0.35" strokeWidth="3" />

      {motif === 0 ? <Wheel cx={wheelCx} cy={wheelCy} r={wheelR} hue={a.hue} gid={`artGold-${h}`} /> : null}

      {motif === 1 ? (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <Chip
              key={i}
              cx={(flip ? W * 0.22 : W * 0.72) + i * W * 0.05}
              cy={H * 0.78 - i * H * 0.06}
              r={Math.min(W, H) * 0.16}
              hue={i % 2 ? '#1c2230' : a.hue}
              gid={`artGold-${h}`}
            />
          ))}
        </g>
      ) : null}

      {motif === 2 ? (
        <g>
          <Card x={flip ? W * 0.08 : W * 0.6} y={H * 0.36} w={Math.min(W, H) * 0.34} rot={flip ? -14 : -8} suit="spade" />
          <Card x={flip ? W * 0.2 : W * 0.72} y={H * 0.3} w={Math.min(W, H) * 0.34} rot={flip ? 6 : 12} suit="heart" />
        </g>
      ) : null}

      {/* circuit line */}
      <path
        d={`M0 ${H * 0.2}H${W * 0.3}l40 40H${W * 0.55}`}
        fill="none"
        stroke={a.hue}
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      <circle cx={W * 0.55} cy={H * 0.2 + 40} r="5" fill={a.hue} opacity="0.7" />

      {label ? (
        <text
          x={flip ? W * 0.94 : W * 0.06}
          y={H * 0.5}
          textAnchor={flip ? 'end' : 'start'}
          fontFamily="Archivo, 'Arial Black', sans-serif"
          fontWeight="900"
          fontSize={Math.min(W, H) * (variant === 'win' ? 0.26 : 0.2)}
          letterSpacing="-4"
          fill={`url(#artGold-${h})`}
          opacity="0.92"
        >
          {label}
        </text>
      ) : null}

      <rect width={W} height={H} fill={`url(#fade-${h})`} />
    </svg>
  );
}
