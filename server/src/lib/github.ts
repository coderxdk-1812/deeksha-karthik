import { createHash } from "node:crypto";

/**
 * A minimal GitHub client — just enough to read files from the repo and to
 * commit several files at once. Uses the Git Data API so a save is one atomic
 * commit (the content file and its images land together), with no extra
 * dependency; Node's built-in fetch is enough.
 *
 * Configured entirely through environment variables:
 *   GITHUB_TOKEN   fine-grained token with "Contents: read and write" on the repo
 *   GITHUB_REPO    "owner/name"
 *   GITHUB_BRANCH  branch to save to (default "main")
 *   GITHUB_API_URL override for tests (default https://api.github.com)
 */

export interface GitHubConfig {
  token: string;
  repo: string;
  branch: string;
  apiUrl: string;
}

export function githubConfig(): GitHubConfig | null {
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  if (!token || !repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return null;
  return {
    token,
    repo,
    branch: process.env.GITHUB_BRANCH?.trim() || "main",
    apiUrl: (process.env.GITHUB_API_URL?.trim() || "https://api.github.com").replace(/\/$/, ""),
  };
}

export class GitHubError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function config(): GitHubConfig {
  const c = githubConfig();
  if (!c) throw new GitHubError(0, "GitHub is not configured (GITHUB_TOKEN / GITHUB_REPO).");
  return c;
}

async function request(path: string, init: RequestInit & { raw?: boolean } = {}): Promise<Response> {
  const c = config();
  const { raw, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${c.apiUrl}/repos/${c.repo}${path}`, {
      ...rest,
      signal: AbortSignal.timeout(20_000),
      headers: {
        Authorization: `Bearer ${c.token}`,
        Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "portfolio-content-sync",
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
      },
    });
  } catch (err) {
    throw new GitHubError(0, `Couldn't reach GitHub (${err instanceof Error ? err.message : "network error"}).`);
  }
  return res;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `GitHub returned ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message += `: ${body.message}`;
    } catch {
      /* no body */
    }
    if (res.status === 401 || res.status === 403) message += " — check that GITHUB_TOKEN is valid and has Contents read/write on this repo.";
    throw new GitHubError(res.status, message);
  }
  return (await res.json()) as T;
}

/** SHA git itself would give a file with this content — lets us skip re-uploading unchanged files. */
export function gitBlobSha(content: Buffer): string {
  return createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex");
}

export async function isRepoPrivate(): Promise<boolean> {
  const info = await json<{ private: boolean }>(await request(""));
  return Boolean(info.private);
}

async function getHead(): Promise<{ commitSha: string; treeSha: string }> {
  const c = config();
  const ref = await json<{ object: { sha: string } }>(await request(`/git/ref/heads/${c.branch}`));
  const commit = await json<{ tree: { sha: string } }>(await request(`/git/commits/${ref.object.sha}`));
  return { commitSha: ref.object.sha, treeSha: commit.tree.sha };
}

/** Every file path (and blob sha) in the repo under `prefix`, at the branch head. */
export async function listFiles(prefix: string): Promise<Map<string, string>> {
  const { treeSha } = await getHead();
  const tree = await json<{ tree: { path: string; type: string; sha: string }[]; truncated?: boolean }>(
    await request(`/git/trees/${treeSha}?recursive=1`),
  );
  if (tree.truncated) throw new GitHubError(0, "The repository tree is too large to list.");
  const files = new Map<string, string>();
  for (const entry of tree.tree) {
    if (entry.type === "blob" && entry.path.startsWith(prefix)) files.set(entry.path, entry.sha);
  }
  return files;
}

/** Reads a file from the branch head. Returns null if it doesn't exist. */
export async function readFile(path: string): Promise<Buffer | null> {
  const c = config();
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const res = await request(`/contents/${encoded}?ref=${encodeURIComponent(c.branch)}`, { raw: true });
  if (res.status === 404) return null;
  if (!res.ok) await json(res); // throws a descriptive GitHubError
  return Buffer.from(await res.arrayBuffer());
}

export interface FileChange {
  path: string;
  content: Buffer;
}

/**
 * Commits `upserts` and `deletes` as a single commit on the branch. Retries
 * if the branch moved while we were preparing the commit.
 */
export async function commitChanges(opts: { message: string; upserts: FileChange[]; deletes: string[] }): Promise<void> {
  const c = config();
  for (let attempt = 1; ; attempt++) {
    const head = await getHead();

    const entries: { path: string; mode: "100644"; type: "blob"; sha: string | null }[] = [];
    for (const file of opts.upserts) {
      const blob = await json<{ sha: string }>(
        await request("/git/blobs", {
          method: "POST",
          body: JSON.stringify({ content: file.content.toString("base64"), encoding: "base64" }),
        }),
      );
      entries.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
    }
    for (const path of opts.deletes) entries.push({ path, mode: "100644", type: "blob", sha: null });

    const tree = await json<{ sha: string }>(
      await request("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: head.treeSha, tree: entries }) }),
    );
    const commit = await json<{ sha: string }>(
      await request("/git/commits", {
        method: "POST",
        body: JSON.stringify({ message: opts.message, tree: tree.sha, parents: [head.commitSha] }),
      }),
    );

    const res = await request(`/git/refs/heads/${c.branch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
    if (res.ok) return;
    if (res.status === 422 && attempt < 3) continue; // branch moved under us — rebuild on the new head
    await json(res);
  }
}
