import { useState } from "react";
import type { FormEvent } from "react";
import { isModerationRejection } from "../lib/commentsApi";
import styles from "./CommentForm.module.css";

interface CommentFormProps {
  onSubmit: (input: { authorName: string; body: string }) => Promise<void>;
}

export function CommentForm({ onSubmit }: CommentFormProps) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [justPosted, setJustPosted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setJustPosted(false);
    const trimmed = body.trim();

    if (trimmed.length < 8) {
      setErrorMessage("Give me a bit more detail — even one specific sentence helps a lot.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({ authorName: name.trim(), body: trimmed });
      setBody("");
      setName("");
      setJustPosted(true);
    } catch (err) {
      if (isModerationRejection(err)) {
        setErrorMessage(err.message); // body stays in the textarea so they can rewrite it
      } else {
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong posting that.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h3 className={styles.prompt}>Found something that could be better? Tell me.</h3>
      <p className={styles.subPrompt}>What confused you? What would you change? What worked well?</p>

      <div className={styles.fieldRow}>
        <div className={styles.nameField}>
          <label className={styles.label} htmlFor="comment-name">
            Name (optional)
          </label>
          <input
            id="comment-name"
            type="text"
            className={styles.input}
            placeholder="Anonymous"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      <label className={styles.label} htmlFor="comment-body">
        Your feedback
      </label>
      <textarea
        id="comment-body"
        className={styles.textarea}
        placeholder="e.g. The navigation was a little confusing on mobile — I couldn't find the back button at first."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-describedby={errorMessage ? "comment-error" : undefined}
        aria-invalid={Boolean(errorMessage)}
      />

      <div className={styles.footerRow}>
        <span className={styles.hint}>Be specific — that's what actually helps.</span>
        <button type="submit" className={`btn-reset ${styles.submitBtn}`} disabled={submitting}>
          {submitting ? "Posting…" : "Send feedback"}
        </button>
      </div>

      {errorMessage && (
        <p id="comment-error" className={styles.errorBox} role="alert">
          {errorMessage}
        </p>
      )}
      {justPosted && !errorMessage && (
        <p className={styles.successBox} role="status">
          Thanks — that's posted below. Genuinely useful, appreciate it.
        </p>
      )}
    </form>
  );
}
