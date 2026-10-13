import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../db.js";
import { UPLOADS_ROOT } from "./images.js";
import {
  commitChanges,
  githubConfig,
  gitBlobSha,
  isRepoPrivate,
  listFiles,
  readFile,
  type FileChange,
} from "./github.js";

/**
 * Content lives in the GitHub repo, not on the server.
 *
 * The free hosting tier wipes the server's disk on every deploy and every
 * time it wakes from sleep, so anything stored only in the local database is
 * lost. Instead, every admin change is written to `server/content/` in the
 * repo (a JSON file plus the uploaded images) shortly after it's made, and
 * the server reloads from there each time it starts.
 *
 * Safety rules, because this overwrites the source of truth:
 *  - Public repo: only published content is saved. Drafts and the private
 *    admin notes are never written to a public repository.
 *  - If the saved content couldn't be loaded at startup, saving is paused, so
 *    starter text can't overwrite the real thing.
 *  - If the saved file changed since this server loaded it (someone else
 *    wrote it), saving is paused rather than silently overwriting.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONTENT_DIR = "server/content";
const SNAPSHOT_PATH = `${CONTENT_DIR}/content.json`;
const UPLOADS_PREFIX = `${CONTENT_DIR}/uploads/`;
/** The copy that ships inside the deployed checkout — an older fallback if GitHub is unreachable. */
const LOCAL_CONTENT_DIR = path.resolve(__dirname, "../../content");

const DEBOUNCE_MS = Number(process.env.CONTENT_SYNC_DEBOUNCE_MS ?? 15_000);
const MAX_RETRIES = 5;

// ---------------------------------------------------------------- snapshot --

interface SnapshotScreenshot {
  id: string;
  path: string | null;
  caption: string;
  position: number;
}

interface SnapshotProject {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  url: string;
  githubUrl: string | null;
  category: string;
  status: string;
  publishState: string;
  icon: string | null;
  accent: string;
  madeWith: string[];
  whyIMadeIt: string | null;
  whoItsFor: string | null;
  whatILearned: string | null;
  adminNotes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  screenshots: SnapshotScreenshot[];
}

export interface Snapshot {
  version: 1;
  /** False when saved to a public repo: no drafts, no private notes. */
  includesPrivate: boolean;
  profile: {
    name: string;
    heroBlurb: string;
    aboutParagraphs: string[];
    location: string;
    links: { label: string; href: string }[];
    photo: string | null;
  };
  portfolioNotes?: string;
  projects: SnapshotProject[];
}

const IMAGE_PATH = /^\/uploads\/(projects|profile)\/[\w.-]+$/;

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const optStr = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const imagePath = (v: unknown): string | null => (typeof v === "string" && IMAGE_PATH.test(v) ? v : null);
const strArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function buildSnapshot(includePrivate: boolean): Snapshot {
  const profile = db.prepare("SELECT * FROM profile WHERE id = 1").get() as
    | {
        name: string;
        hero_blurb: string;
        about_paragraphs: string;
        location: string;
        links: string;
        photo_path: string | null;
      }
    | undefined;

  const projectRows = db
    .prepare(
      `SELECT * FROM projects WHERE deleted_at IS NULL ${includePrivate ? "" : "AND publish_state = 'published'"}
       ORDER BY sort_order ASC, created_at ASC`,
    )
    .all() as Record<string, unknown>[];
  const shotsStmt = db.prepare("SELECT * FROM screenshots WHERE project_id = ? ORDER BY position ASC");

  const snapshot: Snapshot = {
    version: 1,
    includesPrivate: includePrivate,
    profile: {
      name: profile?.name ?? "",
      heroBlurb: profile?.hero_blurb ?? "",
      aboutParagraphs: JSON.parse(profile?.about_paragraphs || "[]"),
      location: profile?.location ?? "",
      links: JSON.parse(profile?.links || "[]"),
      photo: imagePath(profile?.photo_path),
    },
    projects: projectRows.map((r) => {
      const project: SnapshotProject = {
        id: String(r.id),
        slug: String(r.slug),
        name: String(r.name),
        shortDescription: str(r.short_description),
        description: str(r.description),
        url: str(r.url),
        githubUrl: optStr(r.github_url),
        category: str(r.category),
        status: str(r.status, "in-progress"),
        publishState: str(r.publish_state, "draft"),
        icon: imagePath(r.icon_path),
        accent: str(r.accent, "slate"),
        madeWith: JSON.parse(str(r.made_with, "[]")),
        whyIMadeIt: optStr(r.why_i_made_it),
        whoItsFor: optStr(r.who_its_for),
        whatILearned: optStr(r.what_i_learned),
        sortOrder: Number(r.sort_order) || 0,
        createdAt: str(r.created_at),
        updatedAt: str(r.updated_at),
        screenshots: (shotsStmt.all(r.id) as Record<string, unknown>[]).map((s) => ({
          id: String(s.id),
          path: imagePath(s.path),
          caption: str(s.caption),
          position: Number(s.position) || 0,
        })),
      };
      if (includePrivate) project.adminNotes = str(r.admin_notes);
      return project;
    }),
  };

  if (includePrivate) {
    const notes = db.prepare("SELECT notes FROM portfolio_notes WHERE id = 1").get() as { notes: string } | undefined;
    snapshot.portfolioNotes = notes?.notes ?? "";
  }
  return snapshot;
}

const serialize = (s: Snapshot): Buffer => Buffer.from(JSON.stringify(s, null, 2) + "\n");

/** Every uploaded image the snapshot refers to. */
function imagesIn(s: Snapshot): string[] {
  const found = new Set<string>();
  if (s.profile.photo) found.add(s.profile.photo);
  for (const p of s.projects) {
    if (p.icon) found.add(p.icon);
    for (const shot of p.screenshots) if (shot.path) found.add(shot.path);
  }
  return [...found];
}

const repoPathFor = (imagePathValue: string): string => `${CONTENT_DIR}${imagePathValue}`; // /uploads/x → server/content/uploads/x
const diskPathFor = (imagePathValue: string): string => path.join(UPLOADS_ROOT, imagePathValue.replace(/^\/uploads\//, ""));

function parseSnapshot(buffer: Buffer): Snapshot {
  const raw = JSON.parse(buffer.toString("utf8")) as Record<string, any>;
  if (raw.version !== 1 || typeof raw.profile !== "object" || !Array.isArray(raw.projects)) {
    throw new Error("The saved content file isn't in a format this version understands.");
  }
  const accents = new Set(["slate", "taupe"]);
  const statuses = new Set(["live", "in-progress", "resting"]);
  return {
    version: 1,
    includesPrivate: raw.includesPrivate === true,
    profile: {
      name: str(raw.profile.name),
      heroBlurb: str(raw.profile.heroBlurb),
      aboutParagraphs: strArray(raw.profile.aboutParagraphs),
      location: str(raw.profile.location),
      links: (Array.isArray(raw.profile.links) ? raw.profile.links : [])
        .filter((l: any) => l && typeof l.label === "string" && typeof l.href === "string")
        .map((l: any) => ({ label: l.label, href: l.href })),
      photo: imagePath(raw.profile.photo),
    },
    portfolioNotes: typeof raw.portfolioNotes === "string" ? raw.portfolioNotes : undefined,
    projects: raw.projects.map((p: any): SnapshotProject => ({
      id: str(p.id),
      slug: str(p.slug),
      name: str(p.name, "Untitled project"),
      shortDescription: str(p.shortDescription),
      description: str(p.description),
      url: str(p.url),
      githubUrl: optStr(p.githubUrl),
      category: str(p.category),
      status: statuses.has(p.status) ? p.status : "in-progress",
      publishState: p.publishState === "published" ? "published" : "draft",
      icon: imagePath(p.icon),
      accent: accents.has(p.accent) ? p.accent : "slate",
      madeWith: strArray(p.madeWith),
      whyIMadeIt: optStr(p.whyIMadeIt),
      whoItsFor: optStr(p.whoItsFor),
      whatILearned: optStr(p.whatILearned),
      adminNotes: typeof p.adminNotes === "string" ? p.adminNotes : undefined,
      sortOrder: Number(p.sortOrder) || 0,
      createdAt: str(p.createdAt, new Date().toISOString()),
      updatedAt: str(p.updatedAt, new Date().toISOString()),
      screenshots: (Array.isArray(p.screenshots) ? p.screenshots : []).map((s: any, i: number) => ({
        id: str(s.id),
        path: imagePath(s.path),
        caption: str(s.caption),
        position: Number.isFinite(Number(s.position)) ? Number(s.position) : i,
      })),
    })),
  };
}

/** Replaces the profile, notes and every project with what the snapshot says. Comments are untouched. */
function applySnapshot(s: Snapshot): void {
  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare(
      "UPDATE profile SET name = ?, hero_blurb = ?, about_paragraphs = ?, location = ?, links = ?, photo_path = ?, updated_at = ? WHERE id = 1",
    ).run(
      s.profile.name,
      s.profile.heroBlurb,
      JSON.stringify(s.profile.aboutParagraphs),
      s.profile.location,
      JSON.stringify(s.profile.links),
      s.profile.photo,
      now,
    );

    // A public-repo snapshot has no notes; keep whatever is already here.
    if (s.includesPrivate && s.portfolioNotes !== undefined) {
      db.prepare("UPDATE portfolio_notes SET notes = ?, updated_at = ? WHERE id = 1").run(s.portfolioNotes, now);
    }

    db.prepare("DELETE FROM projects").run(); // screenshots cascade
    const insertProject = db.prepare(
      `INSERT INTO projects (
         id, slug, name, short_description, description, url, github_url, category, status, publish_state,
         icon_path, accent, made_with, why_i_made_it, who_its_for, what_i_learned, admin_notes,
         sort_order, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertShot = db.prepare("INSERT INTO screenshots (id, project_id, path, caption, position) VALUES (?, ?, ?, ?, ?)");
    for (const p of s.projects) {
      insertProject.run(
        p.id, p.slug, p.name, p.shortDescription, p.description, p.url, p.githubUrl, p.category, p.status,
        p.publishState, p.icon, p.accent, JSON.stringify(p.madeWith), p.whyIMadeIt, p.whoItsFor, p.whatILearned,
        p.adminNotes ?? "", p.sortOrder, p.createdAt, p.updatedAt,
      );
      for (const shot of p.screenshots) insertShot.run(shot.id, p.id, shot.path, shot.caption, shot.position);
    }
  })();
}

// ------------------------------------------------------------------ status --

type SyncState = "off" | "idle" | "pending" | "syncing" | "ok" | "error" | "paused";

const status = {
  state: "off" as SyncState,
  lastSyncedAt: null as string | null,
  lastError: null as string | null,
  pausedReason: null as string | null,
  repoPrivate: null as boolean | null,
};

export function getSyncStatus() {
  const cfg = githubConfig();
  return {
    configured: Boolean(cfg),
    repo: cfg?.repo ?? null,
    branch: cfg?.branch ?? null,
    state: cfg ? status.state : ("off" as SyncState),
    lastSyncedAt: status.lastSyncedAt,
    lastError: status.lastError,
    pausedReason: status.pausedReason,
    repoPrivate: status.repoPrivate,
    // Whether drafts and private notes are being saved (only if the repo is private).
    savesPrivateContent: status.repoPrivate === null ? null : status.repoPrivate,
  };
}

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err));

// ----------------------------------------------------------------- restore --

/**
 * undefined = the saved content was never loaded, so we don't know what's in
 * the repo and must not write. null = loaded, and no content file exists yet.
 * string = blob sha of the content file as we last loaded or wrote it.
 */
let lastKnownSha: string | null | undefined;

function pause(reason: string): void {
  status.state = "paused";
  status.pausedReason = reason;
  console.error(`Content sync paused: ${reason}`);
}

async function downloadImages(snapshot: Snapshot): Promise<void> {
  const missing = imagesIn(snapshot).filter((p) => !fs.existsSync(diskPathFor(p)));
  let next = 0;
  const worker = async () => {
    while (next < missing.length) {
      const p = missing[next++];
      try {
        const data = await readFile(repoPathFor(p));
        if (!data) {
          console.warn(`Saved image ${p} isn't in the repo.`);
          continue;
        }
        fs.mkdirSync(path.dirname(diskPathFor(p)), { recursive: true });
        fs.writeFileSync(diskPathFor(p), data);
      } catch (err) {
        console.warn(`Couldn't restore image ${p}: ${errorText(err)}`);
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
}

/** Runs once at startup, before the server accepts requests. */
export async function restoreContent(): Promise<void> {
  const cfg = githubConfig();
  if (!cfg) {
    status.state = "off";
    console.log("Content sync is off (GITHUB_TOKEN / GITHUB_REPO not set): admin changes stay in the local database only.");
    return;
  }

  try {
    status.repoPrivate = await isRepoPrivate();
    const file = await readFile(SNAPSHOT_PATH);
    if (file === null) {
      lastKnownSha = null;
      status.state = "idle";
      console.log("No saved content in the repo yet; starting from the built-in content. The first admin change will save it.");
      return;
    }
    const snapshot = parseSnapshot(file);
    applySnapshot(snapshot);
    lastKnownSha = gitBlobSha(file);
    await downloadImages(snapshot);
    status.state = "ok";
    status.lastSyncedAt = new Date().toISOString();
    console.log(`Loaded saved content from GitHub: ${snapshot.projects.length} projects.`);
  } catch (err) {
    // Fall back to the copy that shipped with this deploy, and refuse to write.
    const reason = errorText(err);
    let usedFallback = false;
    try {
      const local = fs.readFileSync(path.join(LOCAL_CONTENT_DIR, "content.json"));
      const snapshot = parseSnapshot(local);
      applySnapshot(snapshot);
      for (const p of imagesIn(snapshot)) {
        const source = path.join(LOCAL_CONTENT_DIR, p.replace(/^\//, ""));
        if (!fs.existsSync(diskPathFor(p)) && fs.existsSync(source)) {
          fs.mkdirSync(path.dirname(diskPathFor(p)), { recursive: true });
          fs.copyFileSync(source, diskPathFor(p));
        }
      }
      usedFallback = true;
    } catch {
      /* no usable local copy */
    }
    pause(
      `Couldn't load your saved content from GitHub at startup (${reason}). ` +
        (usedFallback ? "Showing the version from the last deploy. " : "Showing the built-in starter content. ") +
        "Saving is paused so nothing is overwritten — restart the service to try again.",
    );
  }
}

// -------------------------------------------------------------------- sync --

class ConflictError extends Error {}

async function syncOnce(): Promise<void> {
  if (lastKnownSha === undefined) throw new ConflictError("Saved content was never loaded.");

  const repoPrivate = await isRepoPrivate();
  status.repoPrivate = repoPrivate;

  const snapshot = buildSnapshot(repoPrivate);
  const snapshotFile = serialize(snapshot);

  const remote = await listFiles(`${CONTENT_DIR}/`);
  const remoteSha = remote.get(SNAPSHOT_PATH) ?? null;
  if (remoteSha !== lastKnownSha) {
    throw new ConflictError(
      "The saved content in GitHub changed since this server loaded it (someone or something else wrote it). " +
        "Saving is paused so it isn't overwritten — restart the service to load the latest.",
    );
  }

  const upserts: FileChange[] = [];
  const keep = new Set<string>();
  for (const image of imagesIn(snapshot)) {
    const repoPath = repoPathFor(image);
    keep.add(repoPath); // even if the file is missing locally, never delete what the content still refers to
    const disk = diskPathFor(image);
    if (!fs.existsSync(disk)) continue;
    const data = fs.readFileSync(disk);
    if (remote.get(repoPath) !== gitBlobSha(data)) upserts.push({ path: repoPath, content: data });
  }
  if (remoteSha !== gitBlobSha(snapshotFile)) upserts.push({ path: SNAPSHOT_PATH, content: snapshotFile });

  const deletes = [...remote.keys()].filter((p) => p.startsWith(UPLOADS_PREFIX) && !keep.has(p));
  if (upserts.length === 0 && deletes.length === 0) return;

  await commitChanges({ message: "Update site content from the admin panel", upserts, deletes });
  lastKnownSha = gitBlobSha(snapshotFile);
}

let timer: NodeJS.Timeout | null = null;
let dirty = false;
let inflight: Promise<void> | null = null;
let retries = 0;

function run(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    status.state = "syncing";
    try {
      while (dirty) {
        dirty = false;
        await syncOnce();
      }
      status.state = "ok";
      status.lastSyncedAt = new Date().toISOString();
      status.lastError = null;
      retries = 0;
    } catch (err) {
      if (err instanceof ConflictError) {
        dirty = false;
        pause(err.message);
      } else {
        dirty = true; // keep the change queued and try again
        status.state = "error";
        status.lastError = errorText(err);
        console.error(`Content sync failed: ${status.lastError}`);
        if (retries++ < MAX_RETRIES) {
          timer = setTimeout(() => void run(), Math.min(60_000 * retries, 300_000));
          timer.unref();
        }
      }
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Call after any admin change to content. Saves to GitHub shortly after the last change. */
export function scheduleSync(): void {
  if (!githubConfig() || status.pausedReason) return;
  dirty = true;
  if (!inflight) status.state = "pending";
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void run(), DEBOUNCE_MS);
  timer.unref();
}

/** Saves right now (the "Save now" button, and shutdown). Resolves when done. */
export async function flushNow(): Promise<void> {
  if (!githubConfig() || status.pausedReason) return;
  if (timer) clearTimeout(timer);
  if (inflight) await inflight;
  dirty = true;
  await run();
}

/** On shutdown, make sure a change made just before the process stops still gets saved. */
export async function flushOnShutdown(timeoutMs = 20_000): Promise<void> {
  if (!githubConfig() || status.pausedReason || !(dirty || inflight)) return;
  await Promise.race([flushNow(), new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
}
