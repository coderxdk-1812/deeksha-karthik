import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * On Render, set UPLOADS_DIR to a folder inside your persistent
 * disk's mount path, e.g. `/data/uploads`. Without it, this falls
 * back to the local dev location (server/uploads) so nothing changes
 * for local work.
 */
export const UPLOADS_ROOT = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(__dirname, "../../uploads");

fs.mkdirSync(path.join(UPLOADS_ROOT, "projects"), { recursive: true });
fs.mkdirSync(path.join(UPLOADS_ROOT, "profile"), { recursive: true });

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB pre-optimization ceiling

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error("Unsupported file type. Use JPEG, PNG, WebP, or GIF."));
      return;
    }
    cb(null, true);
  },
});

export type ImageKind = "icon" | "screenshot" | "profile";

type FitMode = "cover" | "contain" | "fill" | "inside" | "outside";

const PRESETS: Record<ImageKind, { width: number; height?: number; quality: number; fit: FitMode }> = {
  icon: { width: 256, height: 256, quality: 90, fit: "cover" },
  screenshot: { width: 1920, quality: 82, fit: "inside" },
  profile: { width: 800, height: 800, quality: 88, fit: "cover" },
};

/**
 * Resizes/re-encodes an uploaded image buffer to WebP and writes it
 * to disk under uploads/{projects|profile}. Returns the public path
 * (e.g. "/uploads/projects/<uuid>.webp") to store on the record.
 */
export async function saveOptimizedImage(buffer: Buffer, kind: ImageKind): Promise<string> {
  const preset = PRESETS[kind];
  const subdir = kind === "profile" ? "profile" : "projects";
  const filename = `${randomUUID()}.webp`;
  const destPath = path.join(UPLOADS_ROOT, subdir, filename);

  const oriented = await sharp(buffer).rotate().toBuffer(); // bake in EXIF orientation first
  let width = preset.width;
  let height = preset.height;

  if (height !== undefined) {
    // Icons and the profile photo are always square. Shrink the target to the
    // source's shorter side instead of using `withoutEnlargement`, which
    // leaves a small non-square upload non-square (and a stretched icon).
    const meta = await sharp(oriented).metadata();
    const side = Math.min(preset.width, height, meta.width ?? preset.width, meta.height ?? height);
    width = side;
    height = side;
  }

  await sharp(oriented)
    .resize({
      width,
      height,
      fit: preset.fit,
      // For the profile photo, crop around the most prominent subject (skin
      // tones, contrast, saturation) rather than blindly around the middle,
      // so a person who isn't dead-centre in the original isn't cut off.
      position: kind === "profile" ? sharp.strategy.attention : undefined,
      withoutEnlargement: true,
    })
    .webp({ quality: preset.quality })
    .toFile(destPath);

  return `/uploads/${subdir}/${filename}`;
}

/** Best-effort delete of a previously stored upload when it's replaced/removed. */
export function deleteStoredImage(publicPath: string | null | undefined): void {
  if (!publicPath || !publicPath.startsWith("/uploads/")) return;
  const abs = path.join(UPLOADS_ROOT, publicPath.replace("/uploads/", ""));
  fs.rm(abs, { force: true }, () => {});
}
