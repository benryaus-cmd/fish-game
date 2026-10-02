import { useId } from 'react';

const useSvgId = (prefix: string) => `${prefix}${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

const SPARKLE = 'M12 6.9Q12.95 11.05 17.1 12Q12.95 12.95 12 17.1Q11.05 12.95 6.9 12Q11.05 11.05 12 6.9Z';

/** Code-drawn "Sea Sparkle" coin: thin honey rim, soft domed face, embossed rounded sparkle. */
export const CoinIcon = ({ size = 22 }: { size?: number }) => {
  const id = useSvgId('coin');
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffeab2" />
          <stop offset="0.55" stopColor="#e6b956" />
          <stop offset="1" stopColor="#b9862f" />
        </linearGradient>
        <radialGradient id={`${id}f`} cx="0.4" cy="0.32" r="0.78">
          <stop offset="0" stopColor="#fff4cc" />
          <stop offset="0.55" stopColor="#f4d07a" />
          <stop offset="1" stopColor="#dfab4c" />
        </radialGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffdf4" />
          <stop offset="1" stopColor="#fbe2a0" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12.8" r="10.9" fill="#a9772a" opacity="0.9" />
      <circle cx="12" cy="12" r="10.9" fill={`url(#${id}r)`} />
      <circle cx="12" cy="12" r="8.7" fill="rgba(150,100,32,0.4)" />
      <circle cx="12" cy="12.35" r="8.4" fill={`url(#${id}f)`} />
      <path d={SPARKLE} fill="rgba(168,112,36,0.5)" transform="translate(0 0.75)" />
      <path d={SPARKLE} fill={`url(#${id}s)`} />
      <circle cx="16.4" cy="7.9" r="0.95" fill="#fffaf0" opacity="0.9" />
      <path d="M5.3 9.2A7.4 7.4 0 0 1 10.2 4.6" fill="none" stroke="rgba(255,252,240,0.75)" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
};

export const BagIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5.6 8.4h12.8l-.9 10.4a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8z" fill="currentColor" fillOpacity="0.18" />
    <path d="M9 10.4V7.6a3 3 0 0 1 6 0v2.8" />
  </svg>
);

export const PelletIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="8.2" cy="9" r="2.6" opacity="0.95" />
    <circle cx="15.4" cy="7.4" r="2" opacity="0.75" />
    <circle cx="13.6" cy="14.2" r="2.8" opacity="0.9" />
    <circle cx="7.4" cy="16.6" r="1.6" opacity="0.6" />
    <circle cx="18" cy="17.6" r="1.1" opacity="0.45" />
    <circle cx="7.4" cy="8.2" r="0.8" fill="#ffffff" opacity="0.55" />
    <circle cx="12.7" cy="13.2" r="0.9" fill="#ffffff" opacity="0.5" />
  </svg>
);

export const SpeakerIcon = ({ muted, size = 20 }: { muted: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.6 9.4h2.9l4-3.4v12l-4-3.4H4.6a1 1 0 0 1-1-1V10.4a1 1 0 0 1 1-1z" fill="currentColor" fillOpacity="0.2" />
    <g style={{ opacity: muted ? 0 : 1, transition: 'opacity 300ms ease' }}>
      <path d="M15 9.3a3.9 3.9 0 0 1 0 5.4" />
      <path d="M17.6 6.9a7.3 7.3 0 0 1 0 10.2" opacity="0.7" />
    </g>
    <g style={{ opacity: muted ? 1 : 0, transition: 'opacity 300ms ease' }}>
      <path d="M15.6 9.6l4.8 4.8M20.4 9.6l-4.8 4.8" />
    </g>
  </svg>
);

export const CloseIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
);

export const CheckIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5.5 12.5l4.2 4.2L18.5 7.8" />
  </svg>
);

export const FishTabIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6.5 12c2.6-3.6 7-4.8 10.6-3 1.6.8 2.8 1.9 3.6 3-.8 1.1-2 2.2-3.6 3-3.6 1.8-8 .6-10.6-3z" fill="currentColor" fillOpacity="0.15" />
    <path d="M6.5 12L3 8.6v6.8z" />
    <circle cx="16.4" cy="11.2" r="0.6" fill="currentColor" />
  </svg>
);

export const DecorTabIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20.5V9" />
    <path d="M12 13c-3.2 0-5-2-5.4-5 3 0 5 1.8 5.4 5z" fill="currentColor" fillOpacity="0.15" />
    <path d="M12 10.6c.4-3 2.4-4.8 5.4-4.8-.4 3-2.4 4.8-5.4 4.8z" fill="currentColor" fillOpacity="0.15" />
    <path d="M5 20.5h14" />
  </svg>
);