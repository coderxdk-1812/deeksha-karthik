import { db } from "../db.js";

export interface ProjectRow {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  url: string;
  category: string;
  status: string;
  publish_state: string;
  icon_path: string | null;
  accent: string;
  made_with: string;
  why_i_made_it: string | null;
  who_its_for: string | null;
  what_i_learned: string | null;
  admin_notes: string;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScreenshotRow {
  id: string;
  project_id: string;
  path: string | null;
  caption: string;
  position: number;
}

function screenshotsFor(projectId: string): ScreenshotRow[] {
  return db
    .prepare("SELECT * FROM screenshots WHERE project_id = ? ORDER BY position ASC")
    .all(projectId) as ScreenshotRow[];
}

function commentCountFor(slug: string): number {
  return (
    db.prepare("SELECT COUNT(*) as n FROM comments WHERE project_slug = ? AND hidden = 0").get(slug) as {
      n: number;
    }
  ).n;
}

/** Shape sent to unauthenticated visitors — never includes admin_notes, publish_state, ids, etc. */
export function toPublicProject(row: ProjectRow, catalogNumber: string) {
  const shots = screenshotsFor(row.id);
  return {
    name: row.name,
    slug: row.slug,
    icon: row.icon_path ?? undefined,
    shortDescription: row.short_description,
    description: row.description,
    url: row.url,
    category: row.category,
    status: row.status,
    accent: row.accent,
    madeWith: JSON.parse(row.made_with || "[]"),
    whyIMadeIt: row.why_i_made_it ?? undefined,
    whoItsFor: row.who_its_for ?? undefined,
    whatILearned: row.what_i_learned ?? undefined,
    catalogNumber,
    screenshots: shots.map((s) => ({ src: s.path ?? undefined, caption: s.caption })),
  };
}

/** Shape sent to the authenticated admin dashboard — includes everything. */
export function toAdminProject(row: ProjectRow) {
  const shots = screenshotsFor(row.id);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    icon: row.icon_path ?? undefined,
    shortDescription: row.short_description,
    description: row.description,
    url: row.url,
    category: row.category,
    status: row.status,
    publishState: row.publish_state,
    accent: row.accent,
    madeWith: JSON.parse(row.made_with || "[]"),
    whyIMadeIt: row.why_i_made_it ?? "",
    whoItsFor: row.who_its_for ?? "",
    whatILearned: row.what_i_learned ?? "",
    adminNotes: row.admin_notes ?? "",
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    screenshots: shots.map((s) => ({ id: s.id, src: s.path ?? undefined, caption: s.caption })),
    screenshotCount: shots.length,
    commentCount: commentCountFor(row.slug),
  };
}
