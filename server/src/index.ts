import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "./db.js";
import { runSeedIfEmpty } from "./seed.js";
import { runMigrations } from "./migrations.js";
import { pruneExpiredSessions, requireAdmin } from "./lib/auth.js";
import { UPLOADS_ROOT } from "./lib/images.js";
import { publicRouter } from "./routes/public.js";
import { authRouter } from "./routes/auth.js";
import { adminProjectsRouter } from "./routes/adminProjects.js";
import { adminProfileRouter } from "./routes/adminProfile.js";
import { adminCommentsRouter } from "./routes/adminComments.js";
import { adminMiscRouter } from "./routes/adminMisc.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

runSeedIfEmpty();
runMigrations();
pruneExpiredSessions();
setInterval(pruneExpiredSessions, 1000 * 60 * 60).unref();

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

/**
 * The frontend's Render URL (Static Site) — separate origin from this
 * API, so it must be explicitly allowed. Falls back to the local Vite
 * dev server. Accepts a comma-separated list if you ever need to
 * allow more than one origin (e.g. a preview URL and a custom domain).
 */
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "http://localhost:5173";
const allowedOrigins = ALLOWED_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

// uploaded images — publicly servable (images themselves aren't secret;
// draft *metadata* is what's protected, via the API routes below)
app.use("/uploads", express.static(UPLOADS_ROOT, { maxAge: "7d" }));

app.use("/api/auth", authRouter);
app.use("/api/public", publicRouter);

// everything under /api/admin requires a valid session
app.use("/api/admin", requireAdmin);
app.use("/api/admin/projects", adminProjectsRouter);
app.use("/api/admin/profile", adminProfileRouter);
app.use("/api/admin/comments", adminCommentsRouter);
app.use("/api/admin", adminMiscRouter);

// Optional: if the built frontend happens to be sitting next to this
// server (a single-service deploy), serve it from the same origin so
// admin cookies are same-site with no CORS complexity at all. On
// Render's two-service setup this folder won't exist on the API
// service — the frontend is its own Static Site — so this is skipped
// entirely rather than erroring on every request.
const clientDist = path.resolve(__dirname, "../../dist");
if (process.env.NODE_ENV === "production" && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.message?.includes("Unsupported file type")) {
    res.status(400).json({ error: err.message });
    return;
  }
  if ((err as { code?: string }).code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ error: "File is too large. Max 10MB before optimization." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`Portfolio API listening on http://localhost:${PORT}`);
});
