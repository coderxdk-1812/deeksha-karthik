import { Router } from "express";
import {
  clearSessionCookie,
  createSession,
  destroySession,
  getSessionToken,
  isSessionValid,
  setSessionCookie,
  verifyPassword,
} from "../lib/auth.js";
import { db } from "../db.js";

export const authRouter = Router();

// Basic in-memory rate limiting for login attempts — enough to slow
// down naive brute forcing without needing an external service.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

authRouter.post("/login", (req, res) => {
  const ip = req.ip ?? "unknown";
  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    return;
  }

  const adminProvisioned = db.prepare("SELECT 1 FROM admin_users WHERE id = 1").get();
  if (!adminProvisioned) {
    res.status(503).json({
      error: "No admin account has been set up. Set ADMIN_PASSWORD in the server environment and restart.",
    });
    return;
  }

  const { password } = req.body as { password?: string };
  if (typeof password !== "string" || !verifyPassword(password)) {
    res.status(401).json({ error: "Incorrect password." });
    return;
  }

  const { token } = createSession();
  setSessionCookie(res, token);
  res.json({ ok: true });
});

authRouter.post("/logout", (req, res) => {
  const token = getSessionToken(req);
  if (token) destroySession(token);
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get("/session", (req, res) => {
  const token = getSessionToken(req);
  res.json({ authenticated: isSessionValid(token) });
});
