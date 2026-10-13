import { randomUUID } from "node:crypto";
import { db } from "./db.js";

/**
 * One-time data migrations, tracked in the `schema_migrations` table.
 *
 * Content that must survive a redeploy belongs here (or in seed.ts), not
 * only in the admin panel: on a host without a persistent disk the SQLite
 * file is recreated on every boot, so anything typed into the live admin
 * UI is lost on the next restart. These run after the seed, so they apply
 * to a brand-new database and, exactly once, to an existing one.
 */

interface FeaturedProject {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  url: string;
  githubUrl: string;
  category: string;
  status: "live" | "in-progress" | "resting";
  madeWith: string[];
  accent: "brown" | "butter" | "green" | "blue";
  /** Negative so these always sort ahead of the seeded placeholders (0, 1, 2, …). */
  sortOrder: number;
}

const featuredProjects: FeaturedProject[] = [
  {
    slug: "kedayam",
    name: "Kedayam",
    shortDescription:
      "A free browser extension that protects you from phishing, scams, and accidentally exposing sensitive info — in real time, entirely on-device.",
    description: [
      "Kedayam is a free browser extension that watches out for you while you browse — in real time, entirely on your device.",
      "It detects phishing and lookalike websites, and catches ClickFix attacks, fake tech-support scams, and fake CAPTCHA scams. It flags suspicious file uploads, warns you when a page asks for unexpected camera, microphone, or location access, and warns you before you type sensitive data — passwords, API keys, card numbers, Aadhaar, PAN — into a page.",
      "All detection runs locally. Nothing is uploaded, there's no account or subscription, and no data is collected or sold to third parties.",
      "Currently v1.1.3 on the Chrome Web Store, rated 5.0 stars by early users.",
    ].join("\n\n"),
    url: "https://chromewebstore.google.com/detail/fjkkmabnlojmjnfajogjgmjhoopolkhk",
    githubUrl: "https://github.com/coderxdk-1812/kedayam",
    category: "Browser Extension / Security",
    status: "live",
    madeWith: [],
    accent: "brown",
    sortOrder: -3,
  },
  {
    slug: "zenith",
    name: "Zenith",
    shortDescription:
      "A gamified study app that helps students break assignments down into manageable steps and actually track their progress.",
    description: [
      "Zenith (formerly Questify) turns studying into something you can actually keep up with. You earn XP, levels, and coins and climb ranks from Novice to Legend, with streaks, achievements, and a virtual shop to spend your coins in.",
      "There's a friends list and leaderboard, a focus mode and timetable scheduler, and personalized daily quests.",
      "The standout piece is a local quest-breakdown engine: give it an assignment and it turns it into an ordered, time-estimated checklist of steps — without calling any external API, so the breakdown works fully offline.",
    ].join("\n\n"),
    url: "https://try-zenith.lovable.app/",
    githubUrl: "https://github.com/coderxdk-1812/quest-tracker",
    category: "Study Tool / Productivity",
    status: "live",
    madeWith: ["React", "TypeScript", "Tailwind", "shadcn/ui", "Supabase"],
    accent: "butter",
    sortOrder: -2,
  },
  {
    slug: "revisebot",
    name: "Revisebot",
    shortDescription: "An AI study companion that quizzes you on your own notes instead of generic flashcard decks.",
    description: [
      "Revisebot takes the notes you actually wrote — not a generic question bank — and turns them into a personalized quiz, so you're reviewing material the way you actually learned it rather than studying from someone else's flashcards.",
      "It's a cross-platform Flutter app (the repo has Android, iOS, web, Linux, macOS, and Windows targets) with a live web version at revisebot.in.",
    ].join("\n\n"),
    url: "https://revisebot.in/",
    // The repository is still named ExamBuoy on GitHub.
    githubUrl: "https://github.com/coderxdk-1812/ExamBuoy",
    category: "AI / Study Tool",
    status: "live",
    madeWith: ["Flutter"],
    accent: "green",
    sortOrder: -1,
  },
];

function upsertFeaturedProject(p: FeaturedProject): void {
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT id FROM projects WHERE slug = ?").get(p.slug) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE projects SET
         name = ?, short_description = ?, description = ?, url = ?, github_url = ?, category = ?,
         status = ?, publish_state = 'published', accent = ?, made_with = ?,
         why_i_made_it = NULL, who_its_for = NULL, what_i_learned = NULL,
         sort_order = ?, deleted_at = NULL, updated_at = ?
       WHERE id = ?`,
    ).run(
      p.name,
      p.shortDescription,
      p.description,
      p.url,
      p.githubUrl,
      p.category,
      p.status,
      p.accent,
      JSON.stringify(p.madeWith),
      p.sortOrder,
      now,
      existing.id,
    );
    // Placeholder screenshots described a made-up UI; real uploads (with a path) are kept.
    db.prepare("DELETE FROM screenshots WHERE project_id = ? AND path IS NULL").run(existing.id);
    return;
  }

  db.prepare(
    `INSERT INTO projects (
       id, slug, name, short_description, description, url, github_url, category, status,
       publish_state, icon_path, accent, made_with, why_i_made_it, who_its_for, what_i_learned,
       admin_notes, sort_order, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', NULL, ?, ?, NULL, NULL, NULL, '', ?, ?, ?)`,
  ).run(
    randomUUID(),
    p.slug,
    p.name,
    p.shortDescription,
    p.description,
    p.url,
    p.githubUrl,
    p.category,
    p.status,
    p.accent,
    JSON.stringify(p.madeWith),
    p.sortOrder,
    now,
    now,
  );
}

const migrations: { id: string; run: () => void }[] = [
  {
    id: "2026-10-accent-terracotta-to-brown",
    run() {
      db.prepare("UPDATE projects SET accent = 'brown' WHERE accent = 'terracotta'").run();
    },
  },
  {
    id: "2026-10-featured-projects-and-retire-safesurf",
    run() {
      for (const p of featuredProjects) upsertFeaturedProject(p);

      // SafeSurf was an older, non-functional version of Kedayam. Unpublishing
      // (rather than deleting) keeps it recoverable from the admin dashboard
      // without it ever showing up as a working project.
      const note = "Retired — an older, non-functional version of Kedayam. Unpublished so it doesn't read as a working project.";
      db.prepare(
        `UPDATE projects SET
           publish_state = 'draft',
           admin_notes = CASE WHEN admin_notes = '' THEN ? ELSE admin_notes || char(10) || ? END,
           updated_at = ?
         WHERE slug = 'safesurf' AND deleted_at IS NULL`,
      ).run(note, note, new Date().toISOString());
    },
  },
];

export function runMigrations(): void {
  const applied = new Set(
    (db.prepare("SELECT id FROM schema_migrations").all() as { id: string }[]).map((row) => row.id),
  );

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    db.transaction(() => {
      migration.run();
      db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
        migration.id,
        new Date().toISOString(),
      );
    })();
    console.log(`Applied migration ${migration.id}`);
  }
}
