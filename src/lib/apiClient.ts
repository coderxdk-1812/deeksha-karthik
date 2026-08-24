/**
 * Thin fetch wrapper. Always sends cookies (`credentials: "include"`)
 * so the admin session works.
 *
 * Frontend and backend run on two different origins — two separate
 * Render services in production, two separate localhost ports in
 * dev — so every request needs an absolute base URL. `VITE_API_URL`
 * is a build-time env var (set it in the Render Static Site's
 * environment, or in a local `.env`); unset, it falls back to the
 * local backend at localhost:4000. The backend's CORS + cookie
 * settings (see server/src/index.ts and server/src/lib/auth.ts) are
 * what actually make cross-origin requests with cookies work.
 */
const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

/** Prefixes a server-relative path (e.g. "/api/public/projects") with the API's base URL. */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/**
 * Prefixes an uploaded-file path (e.g. "/uploads/projects/xyz.webp",
 * as stored on project/profile records) with the API's base URL,
 * since uploads are served by the backend, not the static frontend.
 * Passes through absolute URLs (http://, blob:, data:) untouched, and
 * returns undefined for empty input so callers can keep writing
 * `src={resolveAssetUrl(project.icon)}` without an extra null check.
 */
export function resolveAssetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  return apiUrl(path);
}

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    headers:
      init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
    ...init,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = (payload as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message, payload);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData, method: "POST" | "PUT" = "POST") =>
    request<T>(path, { method, body: formData }),
};
