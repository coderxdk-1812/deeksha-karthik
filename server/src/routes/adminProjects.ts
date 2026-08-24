import { randomUUID } from "node:crypto";
import { Router } from "express";
import { db } from "../db.js";
import { toAdminProject } from "../lib/serialize.js";
import type { ProjectRow } from "../lib/serialize.js";
import { uniqueSlug } from "../lib/slug.js";
import { upload, saveOptimizedImage, deleteStoredImage } from "../lib/images.js";

export const adminProjectsRouter = Router();

const ACCENTS = new Set(["terracotta", "butter", "green", "blue"]);
const STATUSES = new Set(["live", "in-progress", "resting"]);

function getRow(id: string): ProjectRow | undefined {
  return db.prepare("SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL").get(id) as
    | ProjectRow
    | undefined;
}

function sanitizeText(value: unknown, maxLen = 5000): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

function sanitizeOptionalText(value: unknown, maxLen = 3000): string | null {
  const text = sanitizeText(value, maxLen);
  return text.length > 0 ? text : null;
}

function sanitizeStringArray(value: unknown, maxItems = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .slice(0, maxItems)
    .map((v) => v.trim().slice(0, 60));
}

// ---- list / read ----

adminProjectsRouter.get("/", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC")
    .all() as ProjectRow[];
  res.json({ projects: rows.map(toAdminProject) });
});

adminProjectsRouter.get("/:id", (req, res) => {
  const row = getRow(req.params.id);
  if (!row) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  res.json({ project: toAdminProject(row) });
});

// ---- create ----

adminProjectsRouter.post("/", (req, res) => {
  const name = sanitizeText(req.body?.name, 120) || "Untitled project";
  const id = randomUUID();
  const slug = uniqueSlug(name);
  const now = new Date().toISOString();
  const maxOrder = (db.prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM projects").get() as { m: number }).m;

  db.prepare(
    `INSERT INTO projects (
      id, slug, name, short_description, description, url, category, status,
      publish_state, icon_path, accent, made_with, why_i_made_it, who_its_for,
      what_i_learned, admin_notes, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, '', '', '', '', 'in-progress', 'draft', NULL, 'terracotta', '[]', NULL, NULL, NULL, '', ?, ?, ?)`,
  ).run(id, slug, name, maxOrder + 1, now, now);

  res.status(201).json({ project: toAdminProject(getRow(id)!) });
});

// ---- update ----

adminProjectsRouter.put("/:id", (req, res) => {
  const existing = getRow(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  const body = req.body ?? {};
  const name = sanitizeText(body.name, 120) || existing.name;
  const accent = ACCENTS.has(body.accent) ? body.accent : existing.accent;
  const status = STATUSES.has(body.status) ? body.status : existing.status;

  db.prepare(
    `UPDATE projects SET
      name = ?, short_description = ?, description = ?, url = ?, category = ?,
      status = ?, accent = ?, made_with = ?, why_i_made_it = ?, who_its_for = ?,
      what_i_learned = ?, admin_notes = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    name,
    sanitizeText(body.shortDescription, 300),
    sanitizeText(body.description, 5000),
    sanitizeText(body.url, 500),
    sanitizeText(body.category, 80),
    status,
    accent,
    JSON.stringify(sanitizeStringArray(body.madeWith)),
    sanitizeOptionalText(body.whyIMadeIt),
    sanitizeOptionalText(body.whoItsFor),
    sanitizeOptionalText(body.whatILearned),
    sanitizeText(body.adminNotes, 4000),
    new Date().toISOString(),
    req.params.id,
  );

  res.json({ project: toAdminProject(getRow(req.params.id)!) });
});

// ---- publish / unpublish ----

adminProjectsRouter.patch("/:id/publish", (req, res) => {
  const existing = getRow(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  db.prepare("UPDATE projects SET publish_state = 'published', updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    req.params.id,
  );
  res.json({ project: toAdminProject(getRow(req.params.id)!) });
});

adminProjectsRouter.patch("/:id/unpublish", (req, res) => {
  const existing = getRow(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  db.prepare("UPDATE projects SET publish_state = 'draft', updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    req.params.id,
  );
  res.json({ project: toAdminProject(getRow(req.params.id)!) });
});

// ---- duplicate ----

adminProjectsRouter.post("/:id/duplicate", (req, res) => {
  const existing = getRow(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const newId = randomUUID();
  const newSlug = uniqueSlug(`${existing.name}-copy`);
  const now = new Date().toISOString();
  const maxOrder = (db.prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM projects").get() as { m: number }).m;

  db.prepare(
    `INSERT INTO projects (
      id, slug, name, short_description, description, url, category, status,
      publish_state, icon_path, accent, made_with, why_i_made_it, who_its_for,
      what_i_learned, admin_notes, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    newId,
    newSlug,
    `${existing.name} (copy)`,
    existing.short_description,
    existing.description,
    existing.url,
    existing.category,
    existing.status,
    existing.icon_path,
    existing.accent,
    existing.made_with,
    existing.why_i_made_it,
    existing.who_its_for,
    existing.what_i_learned,
    existing.admin_notes,
    maxOrder + 1,
    now,
    now,
  );

  const shots = db
    .prepare("SELECT * FROM screenshots WHERE project_id = ? ORDER BY position ASC")
    .all(existing.id) as { path: string | null; caption: string; position: number }[];
  const insertShot = db.prepare(
    "INSERT INTO screenshots (id, project_id, path, caption, position) VALUES (?, ?, ?, ?, ?)",
  );
  for (const s of shots) {
    insertShot.run(randomUUID(), newId, s.path, s.caption, s.position);
  }

  res.status(201).json({ project: toAdminProject(getRow(newId)!) });
});

// ---- delete (soft) ----

adminProjectsRouter.delete("/:id", (req, res) => {
  const existing = getRow(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  db.prepare("UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    new Date().toISOString(),
    req.params.id,
  );
  res.json({ ok: true });
});

// ---- icon ----

adminProjectsRouter.post("/:id/icon", upload.single("image"), async (req, res) => {
  const existing = getRow(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "No image uploaded." });
    return;
  }
  try {
    const publicPath = await saveOptimizedImage(req.file.buffer, "icon");
    deleteStoredImage(existing.icon_path);
    db.prepare("UPDATE projects SET icon_path = ?, updated_at = ? WHERE id = ?").run(
      publicPath,
      new Date().toISOString(),
      req.params.id,
    );
    res.json({ project: toAdminProject(getRow(req.params.id)!) });
  } catch {
    res.status(400).json({ error: "Couldn't process that image. Try a different file." });
  }
});

adminProjectsRouter.delete("/:id/icon", (req, res) => {
  const existing = getRow(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  deleteStoredImage(existing.icon_path);
  db.prepare("UPDATE projects SET icon_path = NULL, updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    req.params.id,
  );
  res.json({ project: toAdminProject(getRow(req.params.id)!) });
});

// ---- screenshots ----

adminProjectsRouter.post("/:id/screenshots", upload.single("image"), async (req, res) => {
  const existing = getRow(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const currentCount = (
    db.prepare("SELECT COUNT(*) as n FROM screenshots WHERE project_id = ?").get(existing.id) as { n: number }
  ).n;
  if (currentCount >= 5) {
    res.status(400).json({ error: "Five screenshots is the max — remove one before adding another." });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "No image uploaded." });
    return;
  }
  try {
    const publicPath = await saveOptimizedImage(req.file.buffer, "screenshot");
    const id = randomUUID();
    db.prepare("INSERT INTO screenshots (id, project_id, path, caption, position) VALUES (?, ?, ?, ?, ?)").run(
      id,
      existing.id,
      publicPath,
      sanitizeText(req.body?.caption, 200),
      currentCount,
    );
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), existing.id);
    res.status(201).json({ project: toAdminProject(getRow(req.params.id)!) });
  } catch {
    res.status(400).json({ error: "Couldn't process that image. Try a different file." });
  }
});

adminProjectsRouter.post("/:id/screenshots/:screenshotId/replace", upload.single("image"), async (req, res) => {
  const existing = getRow(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const shot = db
    .prepare("SELECT * FROM screenshots WHERE id = ? AND project_id = ?")
    .get(req.params.screenshotId, existing.id) as { path: string | null } | undefined;
  if (!shot) {
    res.status(404).json({ error: "Screenshot not found." });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "No image uploaded." });
    return;
  }
  try {
    const publicPath = await saveOptimizedImage(req.file.buffer, "screenshot");
    deleteStoredImage(shot.path);
    db.prepare("UPDATE screenshots SET path = ? WHERE id = ?").run(publicPath, req.params.screenshotId);
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), existing.id);
    res.json({ project: toAdminProject(getRow(req.params.id)!) });
  } catch {
    res.status(400).json({ error: "Couldn't process that image. Try a different file." });
  }
});

adminProjectsRouter.patch("/:id/screenshots/:screenshotId", (req, res) => {
  const existing = getRow(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const info = db
    .prepare("UPDATE screenshots SET caption = ? WHERE id = ? AND project_id = ?")
    .run(sanitizeText(req.body?.caption, 200), req.params.screenshotId, existing.id);
  if (info.changes === 0) {
    res.status(404).json({ error: "Screenshot not found." });
    return;
  }
  res.json({ project: toAdminProject(getRow(req.params.id)!) });
});

adminProjectsRouter.delete("/:id/screenshots/:screenshotId", (req, res) => {
  const existing = getRow(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const shot = db
    .prepare("SELECT * FROM screenshots WHERE id = ? AND project_id = ?")
    .get(req.params.screenshotId, existing.id) as { path: string | null } | undefined;
  if (!shot) {
    res.status(404).json({ error: "Screenshot not found." });
    return;
  }
  deleteStoredImage(shot.path);
  db.prepare("DELETE FROM screenshots WHERE id = ?").run(req.params.screenshotId);

  // close position gaps
  const remaining = db
    .prepare("SELECT id FROM screenshots WHERE project_id = ? ORDER BY position ASC")
    .all(existing.id) as { id: string }[];
  const reindex = db.prepare("UPDATE screenshots SET position = ? WHERE id = ?");
  remaining.forEach((s, i) => reindex.run(i, s.id));

  db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), existing.id);
  res.json({ project: toAdminProject(getRow(req.params.id)!) });
});

adminProjectsRouter.put("/:id/screenshots/reorder", (req, res) => {
  const existing = getRow(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const order = req.body?.order;
  if (!Array.isArray(order) || order.some((v) => typeof v !== "string")) {
    res.status(400).json({ error: "order must be an array of screenshot ids." });
    return;
  }
  const valid = db.prepare("SELECT id FROM screenshots WHERE project_id = ?").all(existing.id) as { id: string }[];
  const validIds = new Set(valid.map((v) => v.id));
  if (order.length !== validIds.size || !order.every((id: string) => validIds.has(id))) {
    res.status(400).json({ error: "order must contain exactly this project's screenshot ids." });
    return;
  }
  const reindex = db.prepare("UPDATE screenshots SET position = ? WHERE id = ?");
  const run = db.transaction((ids: string[]) => {
    ids.forEach((id, i) => reindex.run(i, id));
  });
  run(order);
  db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), existing.id);
  res.json({ project: toAdminProject(getRow(req.params.id)!) });
});
