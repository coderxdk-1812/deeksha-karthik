# things I made — portfolio + admin CMS

A personal project portfolio with a real backend and a private admin dashboard behind it, so adding/editing projects never means touching code.

## Architecture

```
portfolio-site/
  src/               React + TypeScript frontend (public site + /admin)
  server/            Express + TypeScript API (auth, data, images)
    src/db.ts        SQLite schema
    src/seed.ts      One-time seed of placeholder content
    data/app.db      SQLite database file (gitignored, created on first run)
    uploads/         Uploaded images, optimized to WebP (gitignored)
```

**Why this stack:** the environment has no pre-provisioned cloud database/auth/storage
provider, so this uses a self-contained, file-based backend that needs zero external
accounts to run: **SQLite** (via `better-sqlite3`) for data, the local filesystem for
images, and hand-rolled **server-side sessions** (bcrypt + httpOnly cookies, no JWT,
no localStorage-as-auth) for the admin login. Everything lives in one Express process.

This is a completely legitimate architecture for a single-admin personal site. If you
later deploy this somewhere and want a managed database/auth/storage provider instead
(Supabase, Postgres + S3, etc.), the swap points are intentionally narrow:
- `server/src/db.ts` — swap the SQLite connection for your DB client
- `server/src/lib/images.ts` — swap local disk writes for S3/Cloud Storage uploads
- `server/src/lib/auth.ts` — swap the sessions table for your auth provider's session/JWT verification

Nothing in the React frontend needs to change — it only talks to `/api/*`.

## Setup

```bash
npm install
npm run install:server

cp server/.env.example server/.env
# edit server/.env and set ADMIN_PASSWORD to something real
```

## Environment variables (`server/.env`)

| Variable | Required | Notes |
|---|---|---|
| `ADMIN_PASSWORD` | Yes, first boot only | Seeds the admin account's bcrypt hash the *first* time the server runs against an empty database. Changing it later does nothing — use Settings → Change password in the admin UI instead. |
| `PORT` | No (default `4000`) | API server port. |
| `CORS_ORIGIN` | No (default `http://localhost:5173`) | Needed in dev since the Vite client and API run on different ports. Not used in production (server serves the built frontend itself, same-origin). |
| `NODE_ENV` | No | Set to `production` for the production build/start flow. |

## Running it

```bash
npm run dev
```

Starts both the Vite dev server (`:5173`, proxies `/api` and `/uploads` to the API)
and the Express API (`:4000`) together. Open `http://localhost:5173`.

Log into the admin dashboard at **`/admin`** with the password from `server/.env`.
There's no link to it anywhere in the public site's navigation by design — the URL
isn't secret, but it doesn't matter, because every `/api/admin/*` route independently
requires a valid server-side session regardless of how the client got there.

## Production

```bash
npm run build:all   # builds the API (server/dist) and the frontend (dist)
npm start           # serves both from the Express process on PORT
```

In production the Express server also serves the built frontend directly, so the
admin session cookie is same-origin — no CORS involved at all.

## Data & security notes

- **Drafts never leak.** The public API (`/api/public/*`) only ever returns projects
  with `publishState = "published"`, and the response shape (`toPublicProject`) is a
  hand-picked allowlist of fields — `adminNotes`, `publishState`, database ids, etc.
  are structurally impossible to include, not just hidden by the UI.
- **Moderation is server-side and authoritative.** The client shows instant validation,
  but the actual gate is `server/src/lib/moderation.ts`, run on every `POST /api/public/comments`
  regardless of how the request was made. It's a coarse regex heuristic — good enough
  for a personal site, not a production-grade safety system. Swap in a real provider
  (Perspective API, OpenAI moderation, etc.) there before this matters at scale.
- **Images are validated and optimized server-side**: type-checked (JPEG/PNG/WebP/GIF
  only), size-capped at 10MB pre-optimization, then resized and re-encoded to WebP
  via `sharp` before being written to disk — so a giant upload never ships to visitors
  at full size.
- **Deletes are soft.** Deleting a project sets `deleted_at` rather than removing the
  row; it disappears from both the public site and the admin list immediately, but the
  data isn't destroyed.
