import { Router } from "express";
import { flushNow, getSyncStatus } from "../lib/contentSync.js";

export const adminSyncRouter = Router();

adminSyncRouter.get("/status", (_req, res) => {
  res.json(getSyncStatus());
});

// Save to GitHub immediately instead of waiting out the short delay.
adminSyncRouter.post("/now", async (_req, res) => {
  await flushNow();
  res.json(getSyncStatus());
});
