import { Router } from "express";
import { db } from "../db.js";
import { upload, saveOptimizedImage, deleteStoredImage } from "../lib/images.js";

export const adminProfileRouter = Router();

interface ProfileRow {
  name: string;
  hero_blurb: string;
  about_paragraphs: string;
  location: string;
  links: string;
  photo_path: string | null;
}

function getProfileRow(): ProfileRow {
  return db.prepare("SELECT * FROM profile WHERE id = 1").get() as ProfileRow;
}

function toResponse(row: ProfileRow) {
  return {
    name: row.name,
    heroBlurb: row.hero_blurb,
    aboutParagraphs: JSON.parse(row.about_paragraphs || "[]"),
    location: row.location,
    links: JSON.parse(row.links || "[]"),
    photo: row.photo_path ?? undefined,
  };
}

function sanitizeText(value: unknown, maxLen = 3000): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

function sanitizeParagraphs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .slice(0, 10)
    .map((v) => v.trim().slice(0, 1500));
}

function sanitizeLinks(value: unknown): { label: string; href: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (v): v is { label: unknown; href: unknown } => typeof v === "object" && v !== null && "label" in v && "href" in v,
    )
    .slice(0, 8)
    .map((v) => ({
      label: sanitizeText(v.label, 40),
      href: sanitizeText(v.href, 300),
    }))
    .filter((v) => v.label && v.href);
}

adminProfileRouter.get("/", (_req, res) => {
  res.json({ profile: toResponse(getProfileRow()) });
});

adminProfileRouter.put("/", (req, res) => {
  const body = req.body ?? {};
  db.prepare(
    `UPDATE profile SET name = ?, hero_blurb = ?, about_paragraphs = ?, location = ?, links = ?, updated_at = ? WHERE id = 1`,
  ).run(
    sanitizeText(body.name, 80) || "Anonymous",
    sanitizeText(body.heroBlurb, 500),
    JSON.stringify(sanitizeParagraphs(body.aboutParagraphs)),
    sanitizeText(body.location, 120),
    JSON.stringify(sanitizeLinks(body.links)),
    new Date().toISOString(),
  );
  res.json({ profile: toResponse(getProfileRow()) });
});

adminProfileRouter.post("/photo", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No image uploaded." });
    return;
  }
  try {
    const existing = getProfileRow();
    const publicPath = await saveOptimizedImage(req.file.buffer, "profile");
    deleteStoredImage(existing.photo_path);
    db.prepare("UPDATE profile SET photo_path = ?, updated_at = ? WHERE id = 1").run(
      publicPath,
      new Date().toISOString(),
    );
    res.json({ profile: toResponse(getProfileRow()) });
  } catch {
    res.status(400).json({ error: "Couldn't process that image. Try a different file." });
  }
});

adminProfileRouter.delete("/photo", (_req, res) => {
  const existing = getProfileRow();
  deleteStoredImage(existing.photo_path);
  db.prepare("UPDATE profile SET photo_path = NULL, updated_at = ? WHERE id = 1").run(new Date().toISOString());
  res.json({ profile: toResponse(getProfileRow()) });
});
