import type { Comment } from "../data/types";

/**
 * A small, honest heuristic: looks for a short list of UX-relevant
 * words that show up in more than one distinct comment, and surfaces
 * the most frequent one. This is real word-frequency analysis over
 * actual comment text — not a fabricated stat — but it's simplistic
 * on purpose. Nothing is shown unless the data actually supports it.
 */
const WATCHED_WORDS = [
  "mobile",
  "navigation",
  "nav",
  "button",
  "buttons",
  "confusing",
  "slow",
  "loading",
  "layout",
  "contrast",
  "text",
  "font",
  "screen",
  "image",
  "images",
  "screenshot",
  "link",
  "links",
  "dark",
  "small",
  "tap",
  "click",
  "scroll",
  "trackpad",
  "sidebar",
];

export function commonThread(comments: Comment[]): string | null {
  if (comments.length < 3) return null;

  const counts = new Map<string, Set<string>>(); // word -> set of comment ids mentioning it

  for (const comment of comments) {
    const words = comment.body.toLowerCase().match(/[a-z]+/g) ?? [];
    const uniqueWordsInComment = new Set(words);
    for (const word of uniqueWordsInComment) {
      if (!WATCHED_WORDS.includes(word)) continue;
      if (!counts.has(word)) counts.set(word, new Set());
      counts.get(word)!.add(comment.id);
    }
  }

  let bestWord: string | null = null;
  let bestCount = 1;
  for (const [word, ids] of counts) {
    if (ids.size > bestCount) {
      bestCount = ids.size;
      bestWord = word;
    }
  }

  if (!bestWord || bestCount < 2) return null;
  return `Common thread: ${bestCount} people mentioned "${bestWord}."`;
}
