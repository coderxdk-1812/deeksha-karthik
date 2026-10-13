import type { Project } from "../data/types";

export type Accent = Project["accent"];

export const accentHex: Record<Accent, { base: string; deep: string; tint: string }> = {
  slate: { base: "#5b6b78", deep: "#3f4b56", tint: "#d9dfe3" },
  taupe: { base: "#716e68", deep: "#524f4a", tint: "#e2e2e0" },
};

/**
 * Looks up an accent's colours, falling back to slate for an unknown key.
 * The frontend and backend deploy separately, so for a few minutes after a
 * palette change one can be running with keys the other doesn't know — and
 * an undefined lookup here used to crash the whole page.
 */
export function accentColors(accent: string): { base: string; deep: string; tint: string } {
  return accentHex[accent as Accent] ?? accentHex.slate;
}
