import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { projectsApi } from "../lib/adminApi";
import type { AdminProject } from "../lib/types";
import { formatRelativeTime } from "../lib/formatRelativeTime";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useToast } from "../AdminToastContext";
import { ApiError } from "../../lib/apiClient";
import { isAuthError, useAdminAuth } from "../AdminAuthContext";
import { ProjectIcon } from "../../components/ProjectIcon";
import styles from "./Dashboard.module.css";

type Tab = "all" | "draft" | "published";

export function Dashboard() {
  const [projects, setProjects] = useState<AdminProject[] | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [deleteTarget, setDeleteTarget] = useState<AdminProject | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { handleUnauthorized } = useAdminAuth();
  const navigate = useNavigate();

  function load() {
    projectsApi
      .list()
      .then((res) => setProjects(res.projects))
      .catch((err) => {
        if (isAuthError(err)) handleUnauthorized();
        else showToast("Couldn't load projects.", "error");
      });
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd() {
    try {
      const res = await projectsApi.create("Untitled project");
      navigate(`/admin/projects/${res.project.id}/edit`);
    } catch {
      showToast("Couldn't create a new project.", "error");
    }
  }

  async function handleTogglePublish(p: AdminProject) {
    setBusyId(p.id);
    try {
      const res = p.publishState === "published" ? await projectsApi.unpublish(p.id) : await projectsApi.publish(p.id);
      setProjects((prev) => prev!.map((x) => (x.id === p.id ? res.project : x)));
      showToast(res.project.publishState === "published" ? "Published." : "Moved back to draft.");
    } catch {
      showToast("That didn't save — try again.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(p: AdminProject) {
    setBusyId(p.id);
    try {
      const res = await projectsApi.duplicate(p.id);
      setProjects((prev) => [...prev!, res.project]);
      showToast(`Duplicated as "${res.project.name}".`);
    } catch {
      showToast("Couldn't duplicate that project.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await projectsApi.remove(deleteTarget.id);
      setProjects((prev) => prev!.filter((x) => x.id !== deleteTarget.id));
      showToast(`Deleted "${deleteTarget.name}".`);
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't delete that project.", "error");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = (projects ?? []).filter((p) => {
    if (tab === "draft") return p.publishState === "draft";
    if (tab === "published") return p.publishState === "published";
    return true;
  });

  const draftCount = (projects ?? []).filter((p) => p.publishState === "draft").length;
  const publishedCount = (projects ?? []).filter((p) => p.publishState === "published").length;

  return (
    <div>
      <div className={styles.headRow}>
        <h1 className={styles.title}>My Projects</h1>
        <button type="button" className={`btn-reset ${styles.addBtn}`} onClick={handleAdd}>
          + Add new project
        </button>
      </div>

      <div className={styles.tabs}>
        <button type="button" className={`btn-reset ${styles.tab} ${tab === "all" ? styles.tabActive : ""}`} onClick={() => setTab("all")}>
          All <span className={styles.tabCount}>{(projects ?? []).length}</span>
        </button>
        <button type="button" className={`btn-reset ${styles.tab} ${tab === "published" ? styles.tabActive : ""}`} onClick={() => setTab("published")}>
          Published <span className={styles.tabCount}>{publishedCount}</span>
        </button>
        <button type="button" className={`btn-reset ${styles.tab} ${tab === "draft" ? styles.tabActive : ""}`} onClick={() => setTab("draft")}>
          Drafts <span className={styles.tabCount}>{draftCount}</span>
        </button>
      </div>

      {projects === null ? (
        <div className={styles.table}>
          <div className={styles.empty}>Loading…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.table}>
          <div className={styles.empty}>
            {tab === "all" ? "Nothing here yet — add your first project." : `No ${tab} projects.`}
          </div>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.headerRow}>
            <span />
            <span>Project</span>
            <span>Status</span>
            <span>Updated</span>
            <span>Shots</span>
            <span>Feedback</span>
            <span />
          </div>
          {filtered.map((p) => (
            <div className={styles.row} key={p.id}>
              <span className={styles.iconCell}>
                <ProjectIcon name={p.name} icon={p.icon} accent={p.accent} size={34} />
              </span>
              <span className={styles.nameCell}>
                <span className={styles.name}>{p.name}</span>
                <span className={styles.slug}>/{p.slug}</span>
              </span>
              <span>
                <button
                  type="button"
                  className={`btn-reset ${styles.pill} ${p.publishState === "published" ? styles.pillPublished : styles.pillDraft}`}
                  onClick={() => handleTogglePublish(p)}
                  disabled={busyId === p.id}
                  title={p.publishState === "published" ? "Click to unpublish" : "Click to publish"}
                >
                  {p.publishState === "published" ? "Published" : "Draft"}
                </button>
              </span>
              <span className={styles.updatedCell}>{formatRelativeTime(p.updatedAt)}</span>
              <span className={styles.countsCell}>{p.screenshotCount}/5</span>
              <span className={styles.countsCell}>{p.commentCount}</span>
              <span className={styles.actions}>
                <Link to={`/admin/projects/${p.id}/edit`} className={styles.iconBtn} title="Edit" aria-label="Edit">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M10.5 2l2.5 2.5L5.5 12H3v-2.5L10.5 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
                </Link>
                <Link to={`/admin/projects/${p.id}/preview`} className={styles.iconBtn} title="Preview" aria-label="Preview">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1 7.5S3.5 3 7.5 3 14 7.5 14 7.5 11.5 12 7.5 12 1 7.5 1 7.5z" stroke="currentColor" strokeWidth="1.4" /><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4" /></svg>
                </Link>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className={styles.iconBtn} title="Open live website" aria-label="Open live website">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M5 3h7v7M12 3L3 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </a>
                )}
                <button type="button" className={`btn-reset ${styles.iconBtn}`} title="Duplicate" aria-label="Duplicate" onClick={() => handleDuplicate(p)} disabled={busyId === p.id}>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M9.5 5V3.5a1.5 1.5 0 00-1.5-1.5H3.5A1.5 1.5 0 002 3.5V8a1.5 1.5 0 001.5 1.5H5" stroke="currentColor" strokeWidth="1.4" /></svg>
                </button>
                <button
                  type="button"
                  className={`btn-reset ${styles.iconBtn} ${styles.iconBtnDanger}`}
                  title="Delete"
                  aria-label="Delete"
                  onClick={() => setDeleteTarget(p)}
                  disabled={busyId === p.id}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 4.5h9M6 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5M4.5 4.5V12a1 1 0 001 1h5a1 1 0 001-1V4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this project?"
          body="This removes it from the site immediately. It can be restored from the database if needed, but there's no undo button — type the project name to confirm:"
          target={deleteTarget.name}
          requireTypedConfirmation={deleteTarget.name}
          confirmLabel="Delete project"
          busy={busyId === deleteTarget.id}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
