import type { Project } from "../data/types";

export type Accent = Project["accent"];

export const accentHex: Record<Accent, { base: string; deep: string; tint: string }> = {
  slate: { base: "#5b6b78", deep: "#3f4b56", tint: "#d9dfe3" },
  taupe: { base: "#716e68", deep: "#524f4a", tint: "#e2e2e0" },
};
