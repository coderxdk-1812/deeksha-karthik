import { db } from "../db.js";

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

/** Appends -2, -3, ... until the slug is free (optionally ignoring one project id, for edits). */
export function uniqueSlug(base: string, ignoreId?: string): string {
  const baseSlug = slugify(base);
  let candidate = baseSlug;
  let n = 2;
  for (;;) {
    const existing = db.prepare("SELECT id FROM projects WHERE slug = ?").get(candidate) as
      | { id: string }
      | undefined;
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${baseSlug}-${n}`;
    n += 1;
  }
}
