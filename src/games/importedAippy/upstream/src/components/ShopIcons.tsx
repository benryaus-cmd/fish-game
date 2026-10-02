import { mix } from '@/utils/colorUtils';

export const MiniCoin = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#dcb45e" />
    <circle cx="12" cy="12" r="10.4" fill="none" stroke="rgba(112,76,32,0.5)" strokeWidth="0.9" />
    <circle cx="12" cy="12" r="7.6" fill="none" stroke="rgba(255,242,205,0.55)" strokeWidth="0.8" />
    <ellipse cx="8.5" cy="7.6" rx="3.4" ry="1.5" transform="rotate(-34 8.5 7.6)" fill="rgba(255,250,232,0.5)" />
  </svg>
);

/** Code-drawn side-profile preview of the Starter Fish, tinted from the live fish color. */
export const FishPreview = ({ color }: { color: string }) => {
  const top = mix(color, '#5a3418', 0.4);
  const low = mix(color, '#fff0d8', 0.42);
  const belly = mix(color, '#fff7ec', 0.74);
  const fin = mix(color, '#ffe2c0', 0.35);
  const mark = mix(color, '#6a3214', 0.55);
  return (
    <svg width="76" height="52" viewBox="0 0 76 52" aria-hidden="true" className="preview-swim">
      <defs>
        <linearGradient id="pvBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="0.38" stopColor={color} />
          <stop offset="0.7" stopColor={low} />
          <stop offset="1" stopColor={belly} />
        </linearGradient>
      </defs>
      <path className="pv-tail" d="M14 26 L3 14 Q6 26 3 38 Z" fill={fin} opacity="0.75" />
      <path d="M26 14 Q36 4 48 13 Z" fill={fin} opacity="0.7" />
      <path d="M36 38 Q42 46 48 38 Z" fill={fin} opacity="0.6" />
      <path d="M12 26 Q26 11 50 12 Q66 14 70 26 Q66 38 50 40 Q26 41 12 26 Z" fill="url(#pvBody)" />
      <ellipse cx="42" cy="26" rx="3" ry="12" fill={mark} opacity="0.12" />
      <ellipse cx="28" cy="26" rx="2.4" ry="10" fill={mark} opacity="0.1" />
      <ellipse cx="46" cy="18" rx="12" ry="2.4" fill="#fffaee" opacity="0.28" />
      <path d="M54 19 Q51 26 54 33" stroke={mark} strokeWidth="0.9" fill="none" opacity="0.3" />
      <path className="pv-fin" d="M50 29 Q44 36 40 33 Q45 31 50 29 Z" fill={fin} opacity="0.85" />
      <circle cx="61" cy="23" r="3" fill={mix(color, '#f3e2b0', 0.6)} />
      <circle cx="61.4" cy="23" r="1.9" fill="#1b2630" />
      <circle cx="60.6" cy="22.2" r="0.6" fill="rgba(255,255,255,0.8)" />
      <path d="M66 29 Q68 30 69 28.6" stroke={mark} strokeWidth="0.8" fill="none" opacity="0.45" />
    </svg>
  );
};

/** Code-drawn preview of the Colorful Fish: slimmer body, lyre tail, swept fins, golden band. */
export const ColorfulPreview = ({ color, accent }: { color: string; accent: string }) => {
  const top = mix(color, '#18324f', 0.48);
  const low = mix(color, accent, 0.3);
  const belly = mix(accent, '#fff6e2', 0.58);
  const fin = mix(accent, '#fff0cf', 0.22);
  const mark = mix(color, '#122840', 0.62);
  return (
    <svg width="76" height="52" viewBox="0 0 76 52" aria-hidden="true" className="preview-swim2">
      <defs>
        <linearGradient id="pvBody2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="0.38" stopColor={color} />
          <stop offset="0.68" stopColor={low} />
          <stop offset="1" stopColor={belly} />
        </linearGradient>
      </defs>
      <path className="pv-tail2" d="M18 26 L3 11 Q11 21 9.5 26 Q11 31 3 41 Z" fill={fin} opacity="0.8" />
      <path d="M58 16.4 Q40 12 25 6 Q30 12 29 17.6 Z" fill={fin} opacity="0.72" />
      <path d="M46 35.2 Q34 38 26 45 Q30 38 31 34.6 Z" fill={fin} opacity="0.62" />
      <path d="M16 26 Q30 15 50 15.5 Q66 17 73 26 Q66 34.5 50 35.8 Q30 36.5 16 26 Z" fill="url(#pvBody2)" />
      <path d="M22 25.4 Q42 23.2 62 25.2 Q42 29.8 22 27.6 Z" fill={accent} opacity="0.55" />
      <ellipse cx="55" cy="23" rx="4" ry="8" fill={belly} opacity="0.16" />
      <ellipse cx="55" cy="22.6" rx="1.8" ry="7.2" fill={mark} opacity="0.3" />
      <ellipse cx="38" cy="23" rx="3.6" ry="8" fill={belly} opacity="0.14" />
      <ellipse cx="38" cy="22.6" rx="1.6" ry="7" fill={mark} opacity="0.26" />
      <ellipse cx="20.5" cy="25.6" rx="1.5" ry="3.2" fill={mark} opacity="0.34" />
      <ellipse cx="48" cy="18.4" rx="12" ry="1.8" fill="#fffaee" opacity="0.26" />
      <path d="M60 19.6 Q57.6 26 60 32" stroke={mark} strokeWidth="0.9" fill="none" opacity="0.3" />
      <path className="pv-fin2" d="M58 29 Q51 35.5 46.5 33.4 Q52 31.2 58 29 Z" fill={fin} opacity="0.85" />
      <circle cx="66" cy="23.6" r="2.5" fill={mix(accent, '#fff3d0', 0.4)} />
      <circle cx="66.3" cy="23.6" r="1.6" fill="#1b2630" />
      <circle cx="65.6" cy="22.9" r="0.5" fill="rgba(255,255,255,0.8)" />
      <path d="M70 28 Q71.6 28.8 72.4 27.6" stroke={mark} strokeWidth="0.8" fill="none" opacity="0.45" />
    </svg>
  );
};