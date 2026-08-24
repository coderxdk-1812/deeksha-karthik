import type { Comment } from "../data/types";
import { api, ApiError } from "./apiClient";

/**
 * Talks to the real backend now — comments persist server-side in
 * SQLite, and moderation is enforced there too (see server/src/lib/moderation.ts).
 * The one piece that stays purely client-side is "have I already
 * marked this comment helpful" — that's cosmetic dedupe, not
 * security, so localStorage is a fine, honest place for it.
 */

const HELPFUL_KEY = "portfolio:helpful-marks:v1";

function readHelpfulMarks(): Set<string> {
  try {
    const raw = window.localStorage.getItem(HELPFUL_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function writeHelpfulMarks(marks: Set<string>): void {
  window.localStorage.setItem(HELPFUL_KEY, JSON.stringify(Array.from(marks)));
}

export interface ModerationRejection {
  reason: string | null;
  message: string;
}

export const commentsApi = {
  async list(projectSlug: string): Promise<Comment[]> {
    const res = await api.get<{ comments: Comment[] }>(`/api/public/comments/${encodeURIComponent(projectSlug)}`);
    return res.comments;
  },

  /** Throws ModerationRejection (via ApiError.payload) on 422; caller should catch and show the message. */
  async add(input: { projectSlug: string; authorName: string; body: string }): Promise<Comment> {
    try {
      const res = await api.post<{ comment: Comment }>("/api/public/comments", input);
      return res.comment;
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const payload = err.payload as { reason: string | null; message: string };
        const rejection: ModerationRejection = { reason: payload.reason, message: payload.message };
        throw rejection;
      }
      throw err;
    }
  },

  async markHelpful(commentId: string): Promise<number> {
    const marks = readHelpfulMarks();
    if (marks.has(commentId)) return -1; // already marked, caller keeps current count
    const res = await api.post<{ helpfulCount: number }>(`/api/public/comments/${commentId}/helpful`);
    marks.add(commentId);
    writeHelpfulMarks(marks);
    return res.helpfulCount;
  },

  hasMarkedHelpful(commentId: string): boolean {
    return readHelpfulMarks().has(commentId);
  },
};

export function isModerationRejection(err: unknown): err is ModerationRejection {
  return typeof err === "object" && err !== null && "message" in err && "reason" in err && !(err instanceof Error);
}
