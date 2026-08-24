import { useEffect, useState } from "react";
import type { Comment } from "../data/types";
import { commentsApi, isModerationRejection } from "../lib/commentsApi";
import { commonThread } from "../lib/commonThread";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";
import styles from "./CommentSection.module.css";

export function CommentSection({ projectSlug }: { projectSlug: string }) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    commentsApi
      .list(projectSlug)
      .then((list) => {
        if (!cancelled) setComments(list);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [projectSlug]);

  async function handleAdd(input: { authorName: string; body: string }) {
    try {
      const created = await commentsApi.add({ projectSlug, ...input });
      setComments((prev) => [created, ...(prev ?? [])]);
    } catch (err) {
      if (isModerationRejection(err)) {
        throw err; // CommentForm shows err.message inline
      }
      throw new Error("Couldn't post that — the server might be unreachable. Try again in a moment.");
    }
  }

  const thread = comments ? commonThread(comments) : null;

  return (
    <section className={styles.section} aria-labelledby="feedback-heading">
      <div className={styles.headRow}>
        <h2 id="feedback-heading" className={styles.heading}>
          Feedback
        </h2>
        {comments && comments.length > 0 && (
          <span className={styles.summary}>
            {comments.length} {comments.length === 1 ? "person has" : "people have"} left feedback
          </span>
        )}
      </div>
      {thread && <p className={styles.thread}>{thread}</p>}

      <CommentForm onSubmit={handleAdd} />

      {loadError && (
        <p className={styles.errorBanner} role="alert">
          Couldn't load existing feedback right now — the server might be unreachable. You can still write
          a comment above once this clears up.
        </p>
      )}

      <div className={styles.list}>
        {comments === null && !loadError && <p className={styles.loading}>Loading feedback…</p>}
        {comments && comments.length === 0 && (
          <p className={styles.emptyList}>No feedback yet — be the first to say something.</p>
        )}
        {comments && comments.length > 0 && (
          <ul>
            {comments.map((c) => (
              <CommentItem key={c.id} comment={c} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
