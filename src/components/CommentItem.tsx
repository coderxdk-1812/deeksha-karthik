import { useState } from "react";
import type { Comment } from "../data/types";
import { commentsApi } from "../lib/commentsApi";
import styles from "./CommentItem.module.css";

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function CommentItem({ comment }: { comment: Comment }) {
  const [count, setCount] = useState(comment.helpfulCount);
  const [marked, setMarked] = useState(() => commentsApi.hasMarkedHelpful(comment.id));

  async function handleHelpful() {
    if (marked) return;
    setMarked(true);
    setCount((c) => c + 1);
    await commentsApi.markHelpful(comment.id);
  }

  return (
    <li className={`${styles.item} ${comment.isAdmin ? styles.itemAdmin : ""}`}>
      <div className={styles.head}>
        <span className={styles.author}>{comment.authorName || "Anonymous"}</span>
        {comment.isAdmin && (
          <span className={styles.authorBadge}>
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1.5l1.4 3 3.1.4-2.3 2.2.6 3.2L6 8.7 3.2 10.3l.6-3.2L1.5 4.9l3.1-.4L6 1.5z" fill="currentColor" />
            </svg>
            Maker
          </span>
        )}
        <span className={styles.date}>{formatDate(comment.createdAt)}</span>
      </div>
      <p className={styles.body}>{comment.body}</p>
      <button
        type="button"
        className={`btn-reset ${styles.helpfulBtn} ${marked ? styles.helpfulBtnActive : ""}`}
        onClick={handleHelpful}
        disabled={marked}
        aria-pressed={marked}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M6 1.5l1.4 3 3.1.4-2.3 2.2.6 3.2L6 8.7 3.2 10.3l.6-3.2L1.5 4.9l3.1-.4L6 1.5z" fill="currentColor" />
        </svg>
        {marked ? "Marked helpful" : "Helpful"}
        {count > 0 ? ` · ${count}` : ""}
      </button>
    </li>
  );
}
