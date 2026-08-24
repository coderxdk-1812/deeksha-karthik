import { randomUUID } from "node:crypto";
import { Router } from "express";
import { db } from "../db.js";
import { toPublicProject } from "../lib/serialize.js";
import type { ProjectRow } from "../lib/serialize.js";
import { moderateComment, moderationRedirectCopy } from "../lib/moderation.js";

export const publicRouter = Router();

publicRouter.get("/projects", (_req, res) => {
  const rows = db
    .prepare(
      "SELECT * FROM projects WHERE publish_state = 'published' AND deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC",
    )
    .all() as ProjectRow[];
  const projects = rows.map((row, i) => toPublicProject(row, String(i + 1).padStart(3, "0")));
  res.json({ projects });
});

publicRouter.get("/projects/:slug", (req, res) => {
  const rows = db
    .prepare(
      "SELECT * FROM projects WHERE publish_state = 'published' AND deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC",
    )
    .all() as ProjectRow[];
  const index = rows.findIndex((r) => r.slug === req.params.slug);
  if (index === -1) {
    res.status(404).json({ error: "Not found." });
    return;
  }
  res.json({ project: toPublicProject(rows[index], String(index + 1).padStart(3, "0")) });
});

publicRouter.get("/profile", (_req, res) => {
  const row = db.prepare("SELECT * FROM profile WHERE id = 1").get() as
    | {
        name: string;
        hero_blurb: string;
        about_paragraphs: string;
        location: string;
        links: string;
        photo_path: string | null;
      }
    | undefined;
  if (!row) {
    res.status(404).json({ error: "Profile not set up yet." });
    return;
  }
  res.json({
    profile: {
      name: row.name,
      heroBlurb: row.hero_blurb,
      aboutParagraphs: JSON.parse(row.about_paragraphs || "[]"),
      location: row.location,
      links: JSON.parse(row.links || "[]"),
      photo: row.photo_path ?? undefined,
    },
  });
});

publicRouter.get("/comments/:slug", (req, res) => {
  const rows = db
    .prepare(
      "SELECT id, author_name, body, is_admin, helpful_count, created_at FROM comments WHERE project_slug = ? AND hidden = 0 ORDER BY created_at DESC",
    )
    .all(req.params.slug) as {
    id: string;
    author_name: string;
    body: string;
    is_admin: number;
    helpful_count: number;
    created_at: string;
  }[];

  res.json({
    comments: rows.map((r) => ({
      id: r.id,
      authorName: r.author_name,
      body: r.body,
      isAdmin: Boolean(r.is_admin),
      helpfulCount: r.helpful_count,
      createdAt: r.created_at,
    })),
  });
});

publicRouter.post("/comments", (req, res) => {
  const { projectSlug, authorName, body } = req.body as {
    projectSlug?: string;
    authorName?: string;
    body?: string;
  };

  if (!projectSlug || typeof projectSlug !== "string") {
    res.status(400).json({ error: "Missing projectSlug." });
    return;
  }
  const trimmedBody = typeof body === "string" ? body.trim() : "";
  if (trimmedBody.length < 8) {
    res.status(400).json({ error: "Feedback needs a bit more detail — at least one specific sentence." });
    return;
  }
  if (trimmedBody.length > 2000) {
    res.status(400).json({ error: "That's a lot — try trimming it to under 2000 characters." });
    return;
  }

  const project = db
    .prepare("SELECT slug FROM projects WHERE slug = ? AND publish_state = 'published' AND deleted_at IS NULL")
    .get(projectSlug);
  if (!project) {
    res.status(404).json({ error: "That project doesn't exist." });
    return;
  }

  const result = moderateComment(trimmedBody);
  if (!result.allowed) {
    res.status(422).json({
      error: "moderation_rejected",
      reason: result.reason,
      message: moderationRedirectCopy[result.reason ?? "hateful"],
    });
    return;
  }

  const safeAuthorName = (typeof authorName === "string" ? authorName.trim() : "").slice(0, 60) || "Anonymous";
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO comments (id, project_slug, author_name, body, is_admin, hidden, flagged, flagged_reason, helpful_count, created_at)
     VALUES (?, ?, ?, ?, 0, 0, ?, ?, 0, ?)`,
  ).run(id, projectSlug, safeAuthorName, trimmedBody, result.flagged ? 1 : 0, result.flaggedReason ?? null, createdAt);

  res.status(201).json({
    comment: {
      id,
      authorName: safeAuthorName,
      body: trimmedBody,
      isAdmin: false,
      helpfulCount: 0,
      createdAt,
    },
  });
});

publicRouter.post("/comments/:id/helpful", (req, res) => {
  const info = db
    .prepare("UPDATE comments SET helpful_count = helpful_count + 1 WHERE id = ? AND hidden = 0")
    .run(req.params.id);
  if (info.changes === 0) {
    res.status(404).json({ error: "Comment not found." });
    return;
  }
  const row = db.prepare("SELECT helpful_count FROM comments WHERE id = ?").get(req.params.id) as {
    helpful_count: number;
  };
  res.json({ helpfulCount: row.helpful_count });
});
