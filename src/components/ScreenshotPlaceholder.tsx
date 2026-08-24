import type { Accent } from "../lib/accent";
import { accentHex } from "../lib/accent";

interface ScreenshotPlaceholderProps {
  accent: Accent;
  index: number;
  className?: string;
}

const VARIANTS = ["dashboard", "list", "chat", "grid"] as const;

/**
 * A stand-in for a real product screenshot. Renders an abstract UI
 * mock in the project's accent colour, varied by index so a gallery
 * of these doesn't look like four copies of the same image. Swap a
 * real screenshot in via `screenshots[].src` and this never renders.
 */
export function ScreenshotPlaceholder({ accent, index, className }: ScreenshotPlaceholderProps) {
  const { base, deep, tint } = accentHex[accent];
  const variant = VARIANTS[index % VARIANTS.length];

  return (
    <svg
      viewBox="0 0 640 400"
      className={className}
      role="img"
      aria-hidden="true"
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      <rect width="640" height="400" fill={tint} />
      {/* chrome bar */}
      <rect width="640" height="34" fill="#fbf5e8" />
      <circle cx="20" cy="17" r="5" fill={deep} opacity="0.5" />
      <circle cx="38" cy="17" r="5" fill={deep} opacity="0.35" />
      <circle cx="56" cy="17" r="5" fill={deep} opacity="0.2" />
      <rect x="80" y="10" width="200" height="14" rx="7" fill={deep} opacity="0.12" />

      {variant === "dashboard" && (
        <>
          <rect x="0" y="34" width="150" height="366" fill="#fbf5e8" opacity="0.6" />
          <rect x="20" y="60" width="110" height="10" rx="3" fill={deep} opacity="0.3" />
          <rect x="20" y="86" width="90" height="8" rx="3" fill={deep} opacity="0.18" />
          <rect x="20" y="106" width="100" height="8" rx="3" fill={deep} opacity="0.18" />
          <rect x="20" y="126" width="75" height="8" rx="3" fill={deep} opacity="0.18" />
          <rect x="176" y="58" width="200" height="120" rx="8" fill={base} opacity="0.85" />
          <rect x="392" y="58" width="216" height="120" rx="8" fill="#fbf5e8" />
          <rect x="176" y="194" width="432" height="170" rx="8" fill="#fbf5e8" />
          <rect x="200" y="216" width="380" height="10" rx="3" fill={deep} opacity="0.25" />
          <rect x="200" y="240" width="320" height="8" rx="3" fill={deep} opacity="0.15" />
          <rect x="200" y="258" width="340" height="8" rx="3" fill={deep} opacity="0.15" />
        </>
      )}

      {variant === "list" && (
        <>
          <rect x="24" y="56" width="220" height="16" rx="4" fill={deep} opacity="0.3" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <rect x="24" y={96 + i * 56} width="592" height="44" rx="7" fill="#fbf5e8" />
              <circle cx="48" cy={96 + i * 56 + 22} r="12" fill={base} opacity={0.7} />
              <rect x="72" y={96 + i * 56 + 12} width={220 - i * 14} height="9" rx="3" fill={deep} opacity="0.28" />
              <rect x="72" y={96 + i * 56 + 27} width={160 - i * 10} height="7" rx="3" fill={deep} opacity="0.14" />
            </g>
          ))}
        </>
      )}

      {variant === "chat" && (
        <>
          <rect x="24" y="56" width="320" height="34" rx="16" fill="#fbf5e8" />
          <rect x="44" y="68" width="260" height="10" rx="3" fill={deep} opacity="0.25" />
          <rect x="296" y="104" width="320" height="50" rx="16" fill={base} opacity="0.85" />
          <rect x="316" y="118" width="260" height="10" rx="3" fill="#fbf5e8" opacity="0.9" />
          <rect x="316" y="134" width="180" height="8" rx="3" fill="#fbf5e8" opacity="0.7" />
          <rect x="24" y="170" width="380" height="60" rx="16" fill="#fbf5e8" />
          <rect x="44" y="184" width="300" height="10" rx="3" fill={deep} opacity="0.25" />
          <rect x="44" y="200" width="250" height="8" rx="3" fill={deep} opacity="0.14" />
          <rect x="44" y="216" width="180" height="8" rx="3" fill={deep} opacity="0.14" />
          <rect x="24" y="350" width="592" height="34" rx="17" fill="#fbf5e8" />
        </>
      )}

      {variant === "grid" && (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            return (
              <rect
                key={i}
                x={24 + col * 202}
                y={56 + row * 168}
                width="184"
                height="150"
                rx="8"
                fill={i % 2 === 0 ? base : "#fbf5e8"}
                opacity={i % 2 === 0 ? 0.75 : 1}
              />
            );
          })}
        </>
      )}

      <text
        x="16"
        y="392"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="10"
        fill={deep}
        opacity="0.55"
      >
        preview sketch — swap for a real screenshot
      </text>
    </svg>
  );
}
