import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../AdminAuthContext";
import { ApiError } from "../../lib/apiClient";
import styles from "./Login.module.css";

export function Login() {
  const { status, login } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "authenticated") {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Couldn't reach the server. Is it running?");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandDot} aria-hidden="true" />
          workshop admin
        </div>
        <h1 className={styles.title}>Sign in</h1>
        <form onSubmit={handleSubmit} noValidate>
          <label className={styles.label} htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
          />
          <button type="submit" className={`btn-reset ${styles.submitBtn}`} disabled={submitting || !password}>
            {submitting ? "Checking…" : "Sign in"}
          </button>
        </form>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
    </div>
  );
}
