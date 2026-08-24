import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "./db.js";
import { runSeedIfEmpty } from "./seed.js";
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
pruneExpiredSessions();
setInterval(pruneExpiredSessions, 1000 * 60 * 60).unref();

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
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

// In production, serve the built frontend from this same origin so
// admin cookies are same-site with no CORS complexity.
if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "../../dist");
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
