import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { projectsApi } from "../lib/adminApi";
import type { AdminProject, AdminScreenshot } from "../lib/types";
import { useToast } from "../AdminToastContext";
import { resolveAssetUrl } from "../../lib/apiClient";
import styles from "./ScreenshotManager.module.css";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SHOTS = 5;

interface ScreenshotManagerProps {
  projectId: string;
  screenshots: AdminScreenshot[];
  onChange: (project: AdminProject) => void;
}

export function ScreenshotManager({ projectId, screenshots, onChange }: ScreenshotManagerProps) {
  const addInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetId = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const { showToast } = useToast();

  function validate(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) return "Use JPEG, PNG, WebP, or GIF.";
    if (file.size > MAX_BYTES) return "That file is over 10MB — try a smaller one.";
    return null;
  }

  async function handleAdd(file: File) {
    const problem = validate(file);
    if (problem) {
      showToast(problem, "error");
      return;
    }
    setBusy(true);
    try {
      const res = await projectsApi.addScreenshot(projectId, file, "");
      onChange(res.project);
    } catch {
      showToast("Couldn't upload that screenshot.", "error");
    } finally {
      setBusy(false);
      if (addInputRef.current) addInputRef.current.value = "";
    }
  }

  async function handleReplace(file: File) {
    const targetId = replaceTargetId.current;
    if (!targetId) return;
    const problem = validate(file);
    if (problem) {
      showToast(problem, "error");
      return;
    }
    setBusy(true);
    try {
      const res = await projectsApi.replaceScreenshot(projectId, targetId, file);
      onChange(res.project);
    } catch {
      showToast("Couldn't replace that screenshot.", "error");
    } finally {
      setBusy(false);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  }

  async function handleRemove(id: string) {
    setBusy(true);
    try {
      const res = await projectsApi.removeScreenshot(projectId, id);
      onChange(res.project);
    } catch {
      showToast("Couldn't remove that screenshot.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleCaptionBlur(id: string, caption: string) {
    try {
      const res = await projectsApi.updateScreenshotCaption(projectId, id, caption);
      onChange(res.project);
    } catch {
      showToast("Couldn't save that caption.", "error");
    }
  }

  async function commitReorder(nextOrder: AdminScreenshot[]) {
    try {
      const res = await projectsApi.reorderScreenshots(projectId, nextOrder.map((s) => s.id));
      onChange(res.project);
    } catch {
      showToast("Couldn't save the new order.", "error");
    }
  }

  function handleDrop(e: DragEvent, targetId: string) {
    e.preventDefault();
    setDragOverId(null);
    if (!dragId || dragId === targetId) return;
    const current = [...screenshots];
    const fromIndex = current.findIndex((s) => s.id === dragId);
    const toIndex = current.findIndex((s) => s.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    setDragId(null);
    commitReorder(current);
  }

  return (
    <div>
      <div className={styles.grid}>
        {screenshots.map((shot, index) => (
          <div
            key={shot.id}
            className={`${styles.tile} ${dragId === shot.id ? styles.dragging : ""} ${dragOverId === shot.id ? styles.dragOver : ""}`}
            draggable
            onDragStart={() => setDragId(shot.id)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverId(shot.id);
            }}
            onDragLeave={() => setDragOverId((cur) => (cur === shot.id ? null : cur))}
            onDrop={(e) => handleDrop(e, shot.id)}
            onDragEnd={() => {
              setDragId(null);
              setDragOverId(null);
            }}
          >
            <div className={styles.thumb}>
              {shot.src ? <img src={resolveAssetUrl(shot.src)} alt={shot.caption || "Screenshot"} /> : <div />}
              {index === 0 && <span className={styles.primaryTag}>Featured</span>}
              <span className={styles.dragHandle} title="Drag to reorder" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="3" cy="3" r="1" fill="currentColor" /><circle cx="9" cy="3" r="1" fill="currentColor" />
                  <circle cx="3" cy="6" r="1" fill="currentColor" /><circle cx="9" cy="6" r="1" fill="currentColor" />
                  <circle cx="3" cy="9" r="1" fill="currentColor" /><circle cx="9" cy="9" r="1" fill="currentColor" />
                </svg>
              </span>
            </div>
            <div className={styles.tileBody}>
              <input
                className={styles.captionInput}
                defaultValue={shot.caption}
                placeholder="Caption…"
                onBlur={(e) => handleCaptionBlur(shot.id, e.target.value)}
              />
              <div className={styles.tileActions}>
                <button
                  type="button"
                  className={`btn-reset ${styles.tileBtn}`}
                  onClick={() => {
                    replaceTargetId.current = shot.id;
                    replaceInputRef.current?.click();
                  }}
                  disabled={busy}
                >
                  Replace
                </button>
                <button
                  type="button"
                  className={`btn-reset ${styles.tileBtn} ${styles.tileBtnDanger}`}
                  onClick={() => handleRemove(shot.id)}
                  disabled={busy}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        {screenshots.length < MAX_SHOTS && (
          <button
            type="button"
            className={`btn-reset ${styles.addTile}`}
            onClick={() => addInputRef.current?.click()}
            disabled={busy}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M11 5v12M5 11h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Add screenshot
          </button>
        )}
      </div>

      <p className={styles.footer}>
        {screenshots.length}/{MAX_SHOTS} screenshots · drag tiles to reorder · first one is the featured image
      </p>

      <input
        ref={addInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="visually-hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleAdd(file);
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="visually-hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleReplace(file);
        }}
      />
    </div>
  );
}
