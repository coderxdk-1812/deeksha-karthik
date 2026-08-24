import { randomUUID } from "node:crypto";
import { Router } from "express";
import { db } from "../db.js";

export const adminCommentsRouter = Router();

interface CommentRow {
  id: string;
  project_slug: string;
  author_name: string;
  body: string;
  is_admin: number;
  hidden: number;
  flagged: number;
  flagged_reason: string | null;
  helpful_count: number;
  created_at: string;
}

function toResponse(row: CommentRow, projectName: string | undefined) {
  return {
    id: row.id,
    projectSlug: row.project_slug,
    projectName: projectName ?? row.project_slug,
    authorName: row.author_name,
    body: row.body,
    isAdmin: Boolean(row.is_admin),
    hidden: Boolean(row.hidden),
    flagged: Boolean(row.flagged),
    flaggedReason: row.flagged_reason ?? undefined,
    helpfulCount: row.helpful_count,
    createdAt: row.created_at,
  };
}

adminCommentsRouter.get("/", (req, res) => {
  const slugFilter = typeof req.query.slug === "string" ? req.query.slug : undefined;
  const rows = (
    slugFilter
      ? db.prepare("SELECT * FROM comments WHERE project_slug = ? ORDER BY created_at DESC").all(slugFilter)
      : db.prepare("SELECT * FROM comments ORDER BY created_at DESC").all()
  ) as CommentRow[];

  const projectNames = new Map(
    (db.prepare("SELECT slug, name FROM projects WHERE deleted_at IS NULL").all() as { slug: string; name: string }[]).map(
      (p) => [p.slug, p.name],
    ),
  );

  res.json({ comments: rows.map((r) => toResponse(r, projectNames.get(r.project_slug))) });
});

adminCommentsRouter.patch("/:id", (req, res) => {
  const { hidden } = req.body as { hidden?: boolean };
  if (typeof hidden !== "boolean") {
    res.status(400).json({ error: "Body must include a boolean `hidden`." });
    return;
  }
  const info = db.prepare("UPDATE comments SET hidden = ? WHERE id = ?").run(hidden ? 1 : 0, req.params.id);
  if (info.changes === 0) {
    res.status(404).json({ error: "Comment not found." });
    return;
  }
  res.json({ ok: true });
});

adminCommentsRouter.post("/:id/mark-useful", (req, res) => {
  const info = db.prepare("UPDATE comments SET helpful_count = helpful_count + 1 WHERE id = ?").run(req.params.id);
  if (info.changes === 0) {
    res.status(404).json({ error: "Comment not found." });
    return;
  }
  res.json({ ok: true });
});

adminCommentsRouter.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM comments WHERE id = ?").run(req.params.id);
  if (info.changes === 0) {
    res.status(404).json({ error: "Comment not found." });
    return;
  }
  res.json({ ok: true });
});

// Admin reply — posted as the site owner, flagged is_admin so the
// public UI can badge it. Bypasses visitor moderation (it's you).
adminCommentsRouter.post("/", (req, res) => {
  const { projectSlug, body } = req.body as { projectSlug?: string; body?: string };
  if (!projectSlug || typeof projectSlug !== "string") {
    res.status(400).json({ error: "Missing projectSlug." });
    return;
  }
  const trimmed = typeof body === "string" ? body.trim() : "";
  if (trimmed.length < 1) {
    res.status(400).json({ error: "Reply can't be empty." });
    return;
  }
  const project = db.prepare("SELECT slug FROM projects WHERE slug = ? AND deleted_at IS NULL").get(projectSlug);
  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  const profile = db.prepare("SELECT name FROM profile WHERE id = 1").get() as { name: string } | undefined;
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO comments (id, project_slug, author_name, body, is_admin, hidden, flagged, flagged_reason, helpful_count, created_at)
     VALUES (?, ?, ?, ?, 1, 0, 0, NULL, 0, ?)`,
  ).run(id, projectSlug, profile?.name || "Admin", trimmed.slice(0, 2000), createdAt);

  res.status(201).json({
    comment: toResponse(
      { id, project_slug: projectSlug, author_name: profile?.name || "Admin", body: trimmed, is_admin: 1, hidden: 0, flagged: 0, flagged_reason: null, helpful_count: 0, created_at: createdAt },
      undefined,
    ),
  });
});
