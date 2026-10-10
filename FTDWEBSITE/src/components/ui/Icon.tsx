import type { SVGProps } from 'react';

/** Inline icon set. Stroke icons inherit `currentColor`. */
const paths = {
  kick: <path fill="currentColor" d="M3 3h6v5h2V6h2V4h2V3h6v6h-2v2h-2v2h2v2h2v6h-6v-1h-2v-2h-2v-2H9v5H3V3Z" />,
  x: (
    <path
      fill="currentColor"
      d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.18h1.7L7.41 4.73H5.59l11.08 14.45Z"
    />
  ),
  instagram: (
    <>
      <g fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" />
        <circle cx="12" cy="12" r="4" />
      </g>
      <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" />
    </>
  ),
  youtube: (
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M21.6 7.2a2.5 2.5 0 0 0-1.77-1.77C18.27 5 12 5 12 5s-6.27 0-7.83.43A2.5 2.5 0 0 0 2.4 7.2C2 8.77 2 12 2 12s0 3.23.4 4.8a2.5 2.5 0 0 0 1.77 1.77C5.73 19 12 19 12 19s6.27 0 7.83-.43a2.5 2.5 0 0 0 1.77-1.77c.4-1.57.4-4.8.4-4.8s0-3.23-.4-4.8ZM10 15.02 15.2 12 10 8.98v6.04Z"
    />
  ),
  tiktok: (
    <path
      fill="currentColor"
      d="M16.6 3c.37 2.2 1.75 3.62 3.9 3.9v3.12a7.1 7.1 0 0 1-3.86-1.16v6.36A5.78 5.78 0 1 1 10.86 9.5v3.2a2.66 2.66 0 1 0 2.66 2.66V3h3.08Z"
    />
  ),
  discord: (
    <path
      fill="currentColor"
      d="M19.3 5.34A16.5 16.5 0 0 0 15.2 4l-.52 1.06a15.3 15.3 0 0 0-5.36 0L8.8 4a16.5 16.5 0 0 0-4.1 1.34C2.1 9.2 1.4 12.98 1.75 16.7a16.6 16.6 0 0 0 5.03 2.55l1.08-1.76c-.6-.22-1.16-.5-1.7-.82l.42-.33a11.8 11.8 0 0 0 10.84 0l.42.33c-.54.32-1.1.6-1.7.82l1.08 1.76a16.6 16.6 0 0 0 5.03-2.55c.42-4.32-.7-8.07-2.95-11.36ZM8.52 14.43c-.98 0-1.79-.9-1.79-2.02 0-1.11.79-2.02 1.79-2.02s1.8.91 1.79 2.02c0 1.12-.8 2.02-1.8 2.02Zm6.96 0c-.98 0-1.79-.9-1.79-2.02 0-1.11.79-2.02 1.8-2.02 1 0 1.8.91 1.78 2.02 0 1.12-.79 2.02-1.79 2.02Z"
    />
  ),
  upload: <path d="M12 15.5V4m-4.5 4.5L12 4l4.5 4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />,
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="8.75" cy="10" r="1.5" />
      <path d="m4 17 4.5-4.5 3 3 4-4L20 16" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.7a3.5 3.5 0 0 1 0 6.6M18.5 14.8c1.7.8 2.8 2.5 3.1 5.2" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V14a2 2 0 0 0 0-4V7.5Z" />
      <path d="M14.5 6v12" strokeDasharray="2 2" />
    </>
  ),
  trophy: <path d="M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3M8.5 20h7M9.5 17h5" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2 2 0 0 0 4 0" />,
  'arrow-right': <path d="M4 12h15m-5-5 5 5-5 5" />,
  'arrow-left': <path d="M20 12H5m5-5-5 5 5 5" />,
  'arrow-down': <path d="M12 4v15m-5-5 5 5 5-5" />,
  'chevron-left': <path d="m15 5-7 7 7 7" />,
  'chevron-right': <path d="m9 5 7 7-7 7" />,
  'chevron-down': <path d="m5 9 7 7 7-7" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  'caret-up': <path fill="currentColor" stroke="none" d="M12 6.5 19 16H5l7-9.5Z" />,
  'caret-down': <path fill="currentColor" stroke="none" d="M12 17.5 5 8h14l-7 9.5Z" />,
  megaphone: <path d="M3 10v4a1 1 0 0 0 1 1h3l8 5V4L7 9H4a1 1 0 0 0-1 1ZM19 9a4 4 0 0 1 0 6M7 15l1.5 5" />,
  signal: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4" />
    </>
  ),
  chart: <path d="M4 19h16M5 15l4.5-4.5 3.5 3 6-6.5M15 7h4v4" />,
  'trend-up': <path d="m3 17 6-6 4 4 8-8M15 7h6v6" />,
  'trend-down': <path d="m3 7 6 6 4-4 8 8M15 17h6v-6" />,
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  expand: <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  link: <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66l1-1" />,
  share: (
    <>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" />
    </>
  ),
  crown: <path d="M3 8.5 7.5 12 12 5l4.5 7L21 8.5 19 19H5L3 8.5Z" />,
  film: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="M7 4.5v15M17 4.5v15M3 9h4M3 15h4M17 9h4M17 15h4" />
    </>
  ),
  verified: <path d="M12 3 19 6v5.5c0 4.3-3 7.7-7 9.5-4-1.8-7-5.2-7-9.5V6l7-3ZM8.8 12l2.2 2.2 4.2-4.4" />,
  shield: <path d="M12 3 19 6v5.5c0 4.3-3 7.7-7 9.5-4-1.8-7-5.2-7-9.5V6l7-3Z" />,
  play: <path fill="currentColor" stroke="none" d="M8 5.5v13a.8.8 0 0 0 1.2.7l10.3-6.5a.8.8 0 0 0 0-1.4L9.2 4.8A.8.8 0 0 0 8 5.5Z" />,
  pause: <path fill="currentColor" stroke="none" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />,
  volume: <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4ZM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />,
  mute: <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4ZM16 9.5l5 5M21 9.5l-5 5" />,
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.8-4.2 4-6.5 8-6.5s7.2 2.3 8 6.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
  logout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />,
  dashboard: <path d="M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  spade: <path fill="currentColor" stroke="none" d="M12 2.5c3.2 3.6 8 6.6 8 10.6a4.3 4.3 0 0 1-7 3.3l1.2 5.1H9.8l1.2-5.1a4.3 4.3 0 0 1-7-3.3c0-4 4.8-7 8-10.6Z" />,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />,
  gift: (
    <>
      <rect x="3.5" y="8" width="17" height="4" rx="1" />
      <path d="M5 12v8h14v-8M12 8v12M12 8S10.5 3.5 8 4.2C6 4.8 7 8 12 8Zm0 0s1.5-4.5 4-3.8c2 .6 1 3.8-4 3.8Z" />
    </>
  ),
} as const;

export type IconName = keyof typeof paths;

const FILLED = new Set<IconName>(['kick', 'x', 'youtube', 'tiktok', 'discord', 'instagram', 'caret-up', 'caret-down', 'play', 'pause', 'spade']);

export function Icon({ name, title, ...rest }: { name: IconName; title?: string } & SVGProps<SVGSVGElement>) {
  const filled = FILLED.has(name);
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...(filled
        ? {}
        : { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const })}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {paths[name]}
    </svg>
  );
}

export const PLATFORM_ICON: Record<string, IconName> = {
  kick: 'kick',
  youtube: 'youtube',
  instagram: 'instagram',
  x: 'x',
  tiktok: 'tiktok',
  upload: 'film',
};

export const PLATFORM_LABEL: Record<string, string> = {
  kick: 'Kick',
  youtube: 'YouTube',
  instagram: 'Instagram',
  x: 'X',
  tiktok: 'TikTok',
  upload: 'FGDR Original',
};
