import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { verifyPassword } from "../lib/auth.js";

export const adminMiscRouter = Router();

adminMiscRouter.get("/notes", (_req, res) => {
  const row = db.prepare("SELECT notes FROM portfolio_notes WHERE id = 1").get() as { notes: string } | undefined;
  res.json({ notes: row?.notes ?? "" });
});

adminMiscRouter.put("/notes", (req, res) => {
  const notes = typeof req.body?.notes === "string" ? req.body.notes.slice(0, 8000) : "";
  db.prepare("UPDATE portfolio_notes SET notes = ?, updated_at = ? WHERE id = 1").run(
    notes,
    new Date().toISOString(),
  );
  res.json({ notes });
});

adminMiscRouter.post("/change-password", (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (typeof currentPassword !== "string" || !verifyPassword(currentPassword)) {
    res.status(401).json({ error: "Current password is incorrect." });
    return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters." });
    return;
  }
  const hash = bcrypt.hashSync(newPassword, 12);
  db.prepare("UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = 1").run(
    hash,
    new Date().toISOString(),
  );
  res.json({ ok: true });
});

// Reorder projects on the shelf (drag-to-reorder in the admin project list).
adminMiscRouter.put("/projects-order", (req, res) => {
  const order = req.body?.order;
  if (!Array.isArray(order) || order.some((v) => typeof v !== "string")) {
    res.status(400).json({ error: "order must be an array of project ids." });
    return;
  }
  const reindex = db.prepare("UPDATE projects SET sort_order = ? WHERE id = ?");
  const run = db.transaction((ids: string[]) => {
    ids.forEach((id, i) => reindex.run(i, id));
  });
  run(order);
  res.json({ ok: true });
});
