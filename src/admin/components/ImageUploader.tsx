import { useRef, useState } from "react";
import styles from "./ImageUploader.module.css";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 10 * 1024 * 1024;

interface ImageUploaderProps {
  label: string;
  imageUrl?: string;
  shape?: "square" | "circle";
  hint?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}

export function ImageUploader({ label, imageUrl, shape = "square", hint, onUpload, onRemove }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) return "Use JPEG, PNG, WebP, or GIF.";
    if (file.size > MAX_BYTES) return "That file is over 10MB — try a smaller one.";
    return null;
  }

  async function handleFile(file: File) {
    const problem = validate(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onUpload(file);
    } catch {
      setError("Upload failed — try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await onRemove();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={`${styles.preview} ${shape === "circle" ? styles.previewCircle : ""}`}>
        {imageUrl ? (
          <img src={imageUrl} alt={`${label} preview`} />
        ) : (
          <svg className={styles.placeholderIcon} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8.5" cy="9" r="1.5" fill="currentColor" />
            <path d="M21 15l-5-5-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <div className={styles.controls}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#241a10" }}>{label}</span>
        <div className={styles.buttonRow}>
          <button type="button" className={`btn-reset ${styles.uploadBtn}`} onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? "Uploading…" : imageUrl ? "Replace" : "Upload"}
          </button>
          {imageUrl && (
            <button type="button" className={`btn-reset ${styles.removeBtn}`} onClick={handleRemove} disabled={busy}>
              Remove
            </button>
          )}
        </div>
        {hint && !error && <span className={styles.hint}>{hint}</span>}
        {error && <span className={styles.error}>{error}</span>}
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          className="visually-hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    </div>
  );
}
