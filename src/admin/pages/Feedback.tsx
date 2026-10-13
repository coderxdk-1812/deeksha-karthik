import { useEffect, useState } from "react";
import { commentsApi, projectsApi } from "../lib/adminApi";
import type { AdminComment, AdminProject } from "../lib/types";
import { formatRelativeTime } from "../lib/formatRelativeTime";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useToast } from "../AdminToastContext";
import { isAuthError, useAdminAuth } from "../AdminAuthContext";
import styles from "./Feedback.module.css";

export function Feedback() {
  const [comments, setComments] = useState<AdminComment[] | null>(null);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [projectFilter, setProjectFilter] = useState("all");
  const [replyProject, setReplyProject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminComment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { handleUnauthorized } = useAdminAuth();

  function load() {
    Promise.all([commentsApi.list(), projectsApi.list()])
      .then(([c, p]) => {
        setComments(c.comments);
        setProjects(p.projects);
        if (!replyProject && p.projects.length > 0) setReplyProject(p.projects[0].slug);
      })
      .catch((err) => {
        if (isAuthError(err)) handleUnauthorized();
        else showToast("Couldn't load feedback.", "error");
      });
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggleHidden(c: AdminComment) {
    setBusyId(c.id);
    try {
      await commentsApi.setHidden(c.id, !c.hidden);
      setComments((prev) => prev!.map((x) => (x.id === c.id ? { ...x, hidden: !x.hidden } : x)));
    } catch {
      showToast("Couldn't update that comment.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkUseful(c: AdminComment) {
    setBusyId(c.id);
    try {
      await commentsApi.markUseful(c.id);
      setComments((prev) => prev!.map((x) => (x.id === c.id ? { ...x, helpfulCount: x.helpfulCount + 1 } : x)));
    } catch {
      showToast("Couldn't mark that useful.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await commentsApi.remove(deleteTarget.id);
      setComments((prev) => prev!.filter((x) => x.id !== deleteTarget.id));
      showToast("Comment deleted.");
      setDeleteTarget(null);
    } catch {
      showToast("Couldn't delete that comment.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReply() {
    if (!replyProject || replyBody.trim().length === 0) return;
    setReplying(true);
    try {
      const res = await commentsApi.reply(replyProject, replyBody.trim());
      setComments((prev) => [res.comment, ...(prev ?? [])]);
      setReplyBody("");
      showToast("Reply posted.");
    } catch {
      showToast("Couldn't post that reply.", "error");
    } finally {
      setReplying(false);
    }
  }

  const filtered = (comments ?? []).filter((c) => projectFilter === "all" || c.projectSlug === projectFilter);

  return (
    <div>
      <div className={styles.headRow}>
        <h1 className={styles.title}>Feedback</h1>
        <select className={styles.select} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.replyCard}>
        <strong style={{ fontSize: 13, color: "#524f4a" }}>Reply as the maker</strong>
        <div className={styles.replyRow}>
          <select className={styles.select} value={replyProject} onChange={(e) => setReplyProject(e.target.value)}>
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
          <textarea
            className={styles.replyTextarea}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Reply to feedback on this project — shows with a Maker badge"
          />
          <button type="button" className={`btn-reset ${styles.replyBtn}`} onClick={handleReply} disabled={replying || !replyBody.trim()}>
            {replying ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      {comments === null ? (
        <div className={styles.empty}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>No feedback here yet.</div>
      ) : (
        <div className={styles.list}>
          {filtered.map((c) => (
            <div key={c.id} className={`${styles.item} ${c.flagged ? styles.itemFlagged : ""} ${c.hidden ? styles.itemHidden : ""}`}>
              <div className={styles.itemHead}>
                <span className={styles.author}>{c.authorName}</span>
                {c.isAdmin && <span className={styles.adminBadge}>Maker</span>}
                <span className={styles.projectTag}>on {c.projectName}</span>
                {c.flagged && <span className={styles.flagTag}>flagged{c.flaggedReason ? ` · ${c.flaggedReason}` : ""}</span>}
                {c.hidden && <span className={styles.hiddenTag}>hidden</span>}
                <span className={styles.date}>{formatRelativeTime(c.createdAt)}</span>
              </div>
              <p className={styles.body}>{c.body}</p>
              <div className={styles.actions}>
                <button type="button" className={`btn-reset ${styles.actionBtn}`} onClick={() => handleToggleHidden(c)} disabled={busyId === c.id}>
                  {c.hidden ? "Unhide" : "Hide"}
                </button>
                <button type="button" className={`btn-reset ${styles.actionBtn}`} onClick={() => handleMarkUseful(c)} disabled={busyId === c.id}>
                  Mark useful ({c.helpfulCount})
                </button>
                <button
                  type="button"
                  className={`btn-reset ${styles.actionBtn} ${styles.actionBtnDanger}`}
                  onClick={() => setDeleteTarget(c)}
                  disabled={busyId === c.id}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this comment?"
          body="This can't be undone. From"
          target={deleteTarget.authorName}
          confirmLabel="Delete comment"
          busy={busyId === deleteTarget.id}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
