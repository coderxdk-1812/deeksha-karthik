import type { Accent } from "../lib/accent";
import { accentHex } from "../lib/accent";
import { resolveAssetUrl } from "../lib/apiClient";

interface ProjectIconProps {
  name: string;
  icon?: string;
  accent: Accent;
  size?: number;
}

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Renders a real icon image if one is provided; otherwise falls back
 * to a small hand-drawn-feeling monogram mark in the project's accent
 * colour so the UI never shows a broken image icon.
 */
export function ProjectIcon({ name, icon, accent, size = 48 }: ProjectIconProps) {
  if (icon) {
    return <img src={resolveAssetUrl(icon)} alt="" width={size} height={size} style={{ borderRadius: 10 }} />;
  }

  const { base, deep } = accentHex[accent];
  const initials = initialsFor(name);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect x="1" y="1" width="46" height="46" rx="11" fill={base} />
      <rect x="1" y="1" width="46" height="46" rx="11" fill="none" stroke={deep} strokeWidth="1.5" />
      <text
        x="24"
        y="25"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Fraunces, Georgia, serif"
        fontSize="17"
        fontWeight="600"
        fill="#fbf5e8"
      >
        {initials}
      </text>
    </svg>
  );
}
