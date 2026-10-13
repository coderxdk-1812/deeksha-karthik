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

The frontend doesn't need a `.env` for local dev — it defaults to talking to the API
at `http://localhost:4000`. Copy `.env.example` to `.env` at the repo root only if you
want to point it somewhere else.

## Environment variables

**`server/.env`** (see `server/.env.example` for the full commented version):

| Variable | Required | Notes |
|---|---|---|
| `ADMIN_PASSWORD` | Yes, first boot only | Seeds the admin account's bcrypt hash the *first* time the server runs against an empty database. Changing it later does nothing — use Settings → Change password in the admin UI instead. |
| `PORT` | No (default `4000`) | API server port. Render sets this itself for Web Services. |
| `ALLOWED_ORIGIN` | No (default `http://localhost:5173`) | The frontend's origin, for CORS + cross-origin cookies. Comma-separate to allow more than one. |
| `NODE_ENV` | No | `production` also switches the session cookie to `sameSite: "none"; secure: true`, required when frontend and backend are on different HTTPS origins. Local dev uses `sameSite: "lax"` over plain HTTP. |
| `DB_PATH` | No | Full path to the SQLite file. Falls back to `server/data/app.db`. Point this at a persistent disk in production (e.g. `/data/app.db`) — the parent directory is created automatically if it doesn't exist. |
| `UPLOADS_DIR` | No | Full path to the uploaded-images folder. Falls back to `server/uploads`. Point this at a persistent disk in production (e.g. `/data/uploads`) — created automatically if it doesn't exist. |

**repo root `.env`** (frontend, build-time — see `.env.example`):

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | No (default `http://localhost:4000`) | Base URL of the backend API. Vite inlines this at build time, so it must be set *before* `npm run build` runs, not just at server-start time. |

## Running it

```bash
npm run dev
```

Starts both the Vite dev server (`:5173`) and the Express API (`:4000`) together.
The frontend talks to the API over an absolute URL (`VITE_API_URL`, defaulting to
`http://localhost:4000`) rather than a dev proxy — that keeps the dev and production
code paths identical. Open `http://localhost:5173`.

Log into the admin dashboard at **`/admin`** with the password from `server/.env`.
There's no link to it anywhere in the public site's navigation by design — the URL
isn't secret, but it doesn't matter, because every `/api/admin/*` route independently
requires a valid server-side session regardless of how the client got there.

## Production

```bash
npm run build:all   # builds the API (server/dist) and the frontend (dist)
npm start           # runs the API from server/dist on PORT
```

`npm run build:all` also happens to work for a single-service deploy: if `dist/`
(the built frontend) is sitting next to the server when it boots with
`NODE_ENV=production`, the Express server serves it directly, same-origin, and the
admin cookie doesn't need `sameSite: "none"` at all. This repo is deployed as **two**
separate Render services instead (see below), so that path is skipped in practice —
but it still works if you ever want to self-host both from one process.

## Deploying to Render

Two services, deployed from this same repo:

**1. Backend — Web Service**
- Root directory: `server`
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Add a **persistent disk**, e.g. mounted at `/data` (paid plans only — see "Without a persistent disk" below for the free tier)
- Environment variables:
  | Variable | Value |
  |---|---|
  | `ADMIN_PASSWORD` | `Deesankar@c2403` (or whatever you rotate it to afterwards via Settings) |
  | `NODE_ENV` | `production` |
  | `ALLOWED_ORIGIN` | Your Static Site's URL, e.g. `https://deeksha-portfolio.onrender.com` |
  | `DB_PATH` | `/data/app.db` |
  | `UPLOADS_DIR` | `/data/uploads` |

  Render sets `PORT` itself — don't add it manually.

**2. Frontend — Static Site**
- Root directory: repo root (`portfolio-site`)
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Environment variables:
  | Variable | Value |
  |---|---|
  | `VITE_API_URL` | Your backend Web Service's URL, e.g. `https://deeksha-portfolio-api.onrender.com` |

Deploy the backend first so you have its URL for `ALLOWED_ORIGIN`/`VITE_API_URL`, or
deploy both once and circle back to fill in each other's URLs — Render lets you edit
env vars and redeploy after the fact.

## Saving admin changes to GitHub

On Render's free tier the server's disk is wiped on every deploy and every time the
service wakes from sleep, so anything saved only in the server's database is lost.
Instead, **every change you make in the admin panel is committed into this repo**
(`server/content/`: a `content.json` plus the uploaded images) a few seconds after you
make it, and the server **loads it back from GitHub every time it starts**. So code
pushes, sleep and restarts no longer touch your content, and my code updates never
overwrite it: once saved content exists, the starter content in `seed.ts` and
`migrations.ts` is no longer used.

What's saved: your profile and photo, every project (text, icon, screenshots, order,
published/draft), and your private notes. What isn't: visitor comments and your
replies to them, the admin password, and login sessions (you'll be logged out
whenever the service restarts).

The admin sidebar shows the state: **Saving to GitHub…**, **Saved to GitHub**, or a
warning. Changes made within a few seconds of a shutdown are flushed first.

### Setup (once)

1. **Make the repo private** (GitHub → repo → Settings → General → Danger Zone →
   Change visibility). Render can still deploy it. This matters: while the repo is
   public the server saves **only published content**, because drafts and private
   notes must never be written to a public repository. You'll see a warning in the
   admin until it's private.
2. **Create a token**: GitHub → Settings → Developer settings → Personal access
   tokens → *Fine-grained tokens* → Generate. Repository access: **Only select
   repositories → this repo**. Permissions → Repository permissions →
   **Contents: Read and write** (nothing else). Choose an expiry; when it expires the
   admin will say it couldn't save, and you replace the token.
3. **Add to the backend service on Render** (Environment): `GITHUB_TOKEN` (the
   token) and `GITHUB_REPO` (`coderxdk-1812/deeksha-karthik`). Redeploy once.
4. **Recommended, on both services** (Settings → Build & Deploy → Build Filters →
   Ignored Paths): `server/content/**`. Otherwise every save also triggers a redeploy
   of both services (which works, but is wasteful and logs you out). The server reads
   content from GitHub when it starts, so it doesn't need a redeploy to stay current.

### Things to know

- The first change you make after setup saves the whole current site, so the repo
  gets a complete baseline.
- **Pull before you push.** The server commits to `main`, so your local copy falls
  behind: run `git pull --rebase` first.
- Saving is **paused**, with the reason shown, rather than risk overwriting anything
  if (a) GitHub couldn't be reached when the server started, or (b) the saved file
  was changed by something else since the server loaded it. Restart the service to
  recover. Edits made while paused only live on the server until then.
- Don't hand-edit `server/content/content.json`. If you must, restart the service so it
  reloads it.
- Without these variables (local development) nothing is committed and the admin says
  so.

## Branding

`branding/site-logo.png` is the source logo. `node scripts/make-brand-assets.mjs`
regenerates the favicon set (`public/favicon.ico`, 16/32px PNGs, apple-touch icon)
and the transparent nav mark (`src/assets/logo-mark.png`) from it. The script reuses
`sharp` from `server/node_modules`, so run `npm run install:server` first.

Accent colours are `slate` (dusty blue-slate) and `taupe` (a near-neutral gray), each with
a deep shade for text/hover and a pale tint, defined in `src/index.css` and mirrored in
`src/lib/accent.ts` (project icons and placeholder art) and the admin stylesheets, which
hard-code their hexes. Projects alternate between the two down the shelf. Text colours
and the cream paper are separate and unchanged. There is deliberately no orange, rust,
yellow, green, or purple anywhere; the admin's destructive actions use a cool crimson,
the only other hue.

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
