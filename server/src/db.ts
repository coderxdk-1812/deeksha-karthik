import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * On Render (or any host with an ephemeral filesystem), set DB_PATH to
 * a file inside your persistent disk's mount path, e.g.
 * `/data/app.db`. Without it, this falls back to the local dev
 * location (server/data/app.db) so nothing changes for local work.
 */
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(__dirname, "../data/app.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/**
 * Plain CREATE TABLE IF NOT EXISTS migrations. Good enough for a
 * single-admin personal CMS — for a bigger project you'd reach for a
 * real migration runner (drizzle-kit, knex, etc).
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL DEFAULT '',
    hero_blurb TEXT NOT NULL DEFAULT '',
    about_paragraphs TEXT NOT NULL DEFAULT '[]',
    location TEXT NOT NULL DEFAULT '',
    links TEXT NOT NULL DEFAULT '[]',
    photo_path TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS portfolio_notes (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    notes TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    short_description TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    github_url TEXT,
    category TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'in-progress',
    publish_state TEXT NOT NULL DEFAULT 'draft',
    icon_path TEXT,
    accent TEXT NOT NULL DEFAULT 'brown',
    made_with TEXT NOT NULL DEFAULT '[]',
    why_i_made_it TEXT,
    who_its_for TEXT,
    what_i_learned TEXT,
    admin_notes TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS screenshots (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    path TEXT,
    caption TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    project_slug TEXT NOT NULL,
    author_name TEXT NOT NULL DEFAULT 'Anonymous',
    body TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    hidden INTEGER NOT NULL DEFAULT 0,
    flagged INTEGER NOT NULL DEFAULT 0,
    flagged_reason TEXT,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_comments_slug ON comments(project_slug);
  CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`);

// CREATE TABLE IF NOT EXISTS won't add columns to a table that already
// exists, so columns introduced after the first release are added here.
function ensureColumn(table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn("projects", "github_url", "TEXT");
