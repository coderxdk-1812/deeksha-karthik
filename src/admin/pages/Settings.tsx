import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { miscApi } from "../lib/adminApi";
import { ApiError } from "../../lib/apiClient";
import { useToast } from "../AdminToastContext";
import { isAuthError, useAdminAuth } from "../AdminAuthContext";
import styles from "./AboutEditor.module.css";

export function Settings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [notes, setNotes] = useState<string | null>(null);
  const [savedNotes, setSavedNotes] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);

  const { showToast } = useToast();
  const { handleUnauthorized } = useAdminAuth();

  useEffect(() => {
    miscApi
      .getNotes()
      .then((res) => {
        setNotes(res.notes);
        setSavedNotes(res.notes);
      })
      .catch((err) => {
        if (isAuthError(err)) handleUnauthorized();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password needs to be at least 8 characters.");
      return;
    }
    setChanging(true);
    try {
      await miscApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password changed.");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Couldn't change the password.");
    } finally {
      setChanging(false);
    }
  }

  async function handleSaveNotes() {
    if (notes === null) return;
    setSavingNotes(true);
    try {
      const res = await miscApi.updateNotes(notes);
      setSavedNotes(res.notes);
      showToast("Notes saved.");
    } catch {
      showToast("Couldn't save notes.", "error");
    } finally {
      setSavingNotes(false);
    }
  }

  const notesDirty = notes !== null && notes !== savedNotes;

  return (
    <div>
      <div className={styles.headRow}>
        <h1 className={styles.title}>Settings</h1>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Change admin password</h2>
        <form onSubmit={handleChangePassword}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="s-current">Current password</label>
            <input
              id="s-current"
              type="password"
              className={styles.input}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="s-new">New password</label>
            <input
              id="s-new"
              type="password"
              className={styles.input}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="s-confirm">Confirm new password</label>
            <input
              id="s-confirm"
              type="password"
              className={styles.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {passwordError && <p style={{ color: "#a32a3c", fontSize: 13, marginBottom: 12 }}>{passwordError}</p>}
          <button type="submit" className={`btn-reset ${styles.saveBtn}`} disabled={changing || !currentPassword || !newPassword}>
            {changing ? "Changing…" : "Change password"}
          </button>
        </form>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          Portfolio notes <span style={{ fontWeight: 400, color: "#93897a" }}>— private, for you only</span>
        </h2>
        <div className={styles.field}>
          <textarea
            className={styles.textarea}
            style={{ minHeight: 160 }}
            value={notes ?? ""}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="General notes about the portfolio — ideas, todos, things to revisit."
          />
        </div>
        <button type="button" className={`btn-reset ${styles.saveBtn}`} onClick={handleSaveNotes} disabled={savingNotes || !notesDirty}>
          {savingNotes ? "Saving…" : "Save notes"}
        </button>
      </div>
    </div>
  );
}
