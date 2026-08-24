/**
 * Server-side moderation — this is the authoritative gate. The
 * client also runs a copy of this logic for instant UX feedback, but
 * since anyone can POST directly to the API, only this copy actually
 * protects the data. Same caveat as the client version: this is a
 * coarse heuristic demo, not a production-grade safety system. Wire
 * up a real provider (Perspective API, OpenAI moderation, etc) here
 * before this matters for real traffic.
 */

export type ModerationReason = "hateful" | "threat" | "spam" | null;

export interface ModerationResult {
  allowed: boolean;
  reason: ModerationReason;
  /** true if the comment is allowed but worth a human look */
  flagged: boolean;
  flaggedReason?: string;
}

const HATE_PATTERNS: RegExp[] = [
  /\bk+y+s+\b/i,
  /\bkill\s*your\s*self\b/i,
  /\bkill\s*yourself\b/i,
  /\bgo\s*die\b/i,
  /\bi\s*hope\s*you\s*die\b/i,
  /\bi'?ll\s*kill\s*you\b/i,
  /\bi\s*will\s*kill\s*you\b/i,
  /\bretard(ed)?\b/i,
  /\bf[a4]gg?[o0]t\b/i,
  /\bn[i1]gg[ea]r\b/i,
  /\bch[i1]nk\b/i,
  /\bsp[i1]c\b/i,
  /\btr[a4]nny\b/i,
  /\bwh[o0]re\b/i,
  /\bsl[u*]t\b/i,
  /\bc[u*]nt\b/i,
];

const SPAM_PATTERNS: RegExp[] = [
  /https?:\/\/\S+\.(ru|xyz|top|click)\b/i,
  /\b(buy now|limited offer|click here|earn \$\d)/i,
];

// Allowed, but flagged for a human to glance at — harsh tone without being hateful.
const FLAG_WORDS = ["stupid", "sucks", "worst", "terrible", "garbage", "hate", "awful", "pathetic"];

function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function moderateComment(text: string): ModerationResult {
  const normalized = normalize(text);
  const collapsed = normalized.replace(/[\s._-]/g, "");

  for (const pattern of HATE_PATTERNS) {
    if (pattern.test(normalized) || pattern.test(collapsed)) {
      return { allowed: false, reason: "hateful", flagged: false };
    }
  }
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(normalized)) {
      return { allowed: false, reason: "spam", flagged: false };
    }
  }

  const words: string[] = normalized.match(/[a-z]+/g) ?? [];
  const hitWord = FLAG_WORDS.find((w) => words.includes(w));
  if (hitWord) {
    return { allowed: true, reason: null, flagged: true, flaggedReason: `mentions "${hitWord}"` };
  }

  return { allowed: true, reason: null, flagged: false };
}

export const moderationRedirectCopy: Record<Exclude<ModerationReason, null>, string> = {
  hateful:
    "Let's keep feedback useful, not hurtful. Try telling me what didn't work, what was confusing, or what you'd change instead.",
  threat:
    "That reads as a threat, so it's not going through. If something genuinely upset you, I'd rather hear the specific, calmer version.",
  spam: "That looked like a link/promo rather than feedback on the project — mind rewriting it as an actual comment?",
};
