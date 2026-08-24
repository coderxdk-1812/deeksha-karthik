import { useEffect, useRef, useState } from "react";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  title: string;
  body: string;
  /** The name of the thing being deleted, shown emphasized. */
  target?: string;
  /** If set, the confirm button stays disabled until the user types this exact text. */
  requireTypedConfirmation?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConfirmDialog({
  title,
  body,
  target,
  requireTypedConfirmation,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  busy,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const canConfirm = !requireTypedConfirmation || typed.trim() === requireTypedConfirmation;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.card} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.body}>
          {body} {target && <span className={styles.target}>"{target}"</span>}
        </p>

        {requireTypedConfirmation && (
          <div className={styles.confirmField}>
            <label className={styles.confirmLabel} htmlFor="confirm-typed">
              Type <strong>{requireTypedConfirmation}</strong> to confirm
            </label>
            <input
              id="confirm-typed"
              className={styles.confirmInput}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}

        <div className={styles.actions}>
          <button ref={cancelRef} type="button" className={`btn-reset ${styles.cancelBtn}`} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn-reset ${styles.dangerBtn}`}
            onClick={onConfirm}
            disabled={!canConfirm || busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
