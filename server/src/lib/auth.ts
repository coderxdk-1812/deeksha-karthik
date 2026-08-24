import { randomBytes } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";

const SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function verifyPassword(password: string): boolean {
  const row = db.prepare("SELECT password_hash FROM admin_users WHERE id = 1").get() as
    | { password_hash: string }
    | undefined;
  if (!row) return false; // no admin account provisioned — see seed.ts
  return bcrypt.compareSync(password, row.password_hash);
}

export function createSession(): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
  db.prepare("INSERT INTO sessions (id, created_at, expires_at) VALUES (?, ?, ?)").run(
    token,
    now.toISOString(),
    expiresAt,
  );
  return { token, expiresAt };
}

export function destroySession(token: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(token);
}

export function isSessionValid(token: string | undefined): boolean {
  if (!token) return false;
  const row = db.prepare("SELECT expires_at FROM sessions WHERE id = ?").get(token) as
    | { expires_at: string }
    | undefined;
  if (!row) return false;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(token);
    return false;
  }
  return true;
}

export function pruneExpiredSessions(): void {
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionToken(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
}

/** Blocks the request unless a valid, unexpired admin session cookie is present. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = getSessionToken(req);
  if (!isSessionValid(token)) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  next();
}
