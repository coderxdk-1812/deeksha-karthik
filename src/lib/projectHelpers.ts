import type { Project, ProjectStatus } from "../data/types";

export function catalogNumberFor(projects: Project[], slug: string): string {
  const project = projects.find((p) => p.slug === slug);
  if (project?.catalogNumber) return project.catalogNumber;
  const index = projects.findIndex((p) => p.slug === slug);
  return String(index + 1).padStart(3, "0");
}

export function categoriesFrom(projects: Project[]): string[] {
  return Array.from(new Set(projects.map((p) => p.category))).sort();
}

export const statusLabel: Record<ProjectStatus, string> = {
  live: "up and running",
  "in-progress": "still tinkering",
  resting: "resting for now",
};
