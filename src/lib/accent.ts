import type { Project } from "../data/types";

export type Accent = Project["accent"];

export const accentHex: Record<Accent, { base: string; deep: string; tint: string }> = {
  brown: { base: "#75492e", deep: "#53331f", tint: "#eadac5" },
  butter: { base: "#dfa438", deep: "#9c6f1f", tint: "#f4e3b8" },
  green: { base: "#5d6e42", deep: "#46521f", tint: "#dde3c7" },
  blue: { base: "#4c6e78", deep: "#33505a", tint: "#d3e0e0" },
};
