import { useCallback, useEffect, useState } from "react";
import { syncApi } from "../lib/adminApi";
import type { SyncStatus as SyncStatusData } from "../lib/types";
import { formatRelativeTime } from "../lib/formatRelativeTime";
import styles from "./SyncStatus.module.css";

/**
 * Shows whether admin changes are being saved into the GitHub repo — the only
 * place they survive a restart on the free hosting tier — so it's never a
 * mystery whether an edit is safe.
 */
export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatusData | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await syncApi.status());
    } catch {
      /* the page's own requests handle expired sessions */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(refresh, 5000);
    return () => window.clearInterval(id);
  }, [refresh]);

  async function saveNow() {
    setBusy(true);
    try {
      setStatus(await syncApi.now());
    } catch {
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;

  if (!status.configured) {
    return (
      <div className={`${styles.box} ${styles.muted}`}>
        <strong>Not saving to GitHub</strong>
        <span>Changes here only live on this server and are lost when it restarts.</span>
      </div>
    );
  }

  const problem = status.state === "paused" || status.state === "error";

  return (
    <div className={`${styles.box} ${problem ? styles.problem : ""}`} role="status" aria-live="polite">
      {status.state === "ok" && (
        <strong>
          <span className={styles.dot} aria-hidden="true" /> Saved to GitHub
          {status.lastSyncedAt && <span className={styles.when}> · {formatRelativeTime(status.lastSyncedAt)}</span>}
        </strong>
      )}
      {status.state === "idle" && (
        <>
          <strong>Connected to GitHub</strong>
          <span>Your first change will be saved there automatically.</span>
        </>
      )}
      {(status.state === "pending" || status.state === "syncing") && <strong>Saving to GitHub…</strong>}
      {status.state === "error" && (
        <>
          <strong>Couldn’t save to GitHub</strong>
          <span>{status.lastError} It will keep retrying.</span>
          <button type="button" className={`btn-reset ${styles.action}`} onClick={saveNow} disabled={busy}>
            {busy ? "Trying…" : "Try again now"}
          </button>
        </>
      )}
      {status.state === "paused" && (
        <>
          <strong>Saving to GitHub is paused</strong>
          <span>{status.pausedReason}</span>
        </>
      )}
      {status.state === "ok" && (
        <button type="button" className={`btn-reset ${styles.action}`} onClick={saveNow} disabled={busy}>
          {busy ? "Saving…" : "Save now"}
        </button>
      )}
      {status.repoPrivate === false && (
        <span className={styles.warn}>
          Your repo is public, so drafts and private notes are <em>not</em> saved. Make the repo private to keep them.
        </span>
      )}
    </div>
  );
}
