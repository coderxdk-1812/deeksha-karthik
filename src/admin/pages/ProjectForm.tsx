import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { projectsApi } from "../lib/adminApi";
import type { AdminProject } from "../lib/types";
import { ImageUploader } from "../components/ImageUploader";
import { ScreenshotManager } from "../components/ScreenshotManager";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { useToast } from "../AdminToastContext";
import { isAuthError, useAdminAuth } from "../AdminAuthContext";
import styles from "./ProjectForm.module.css";

const ACCENTS: { value: AdminProject["accent"]; hex: string }[] = [
  { value: "terracotta", hex: "#bd5433" },
  { value: "butter", hex: "#dfa438" },
  { value: "green", hex: "#5d6e42" },
  { value: "blue", hex: "#4c6e78" },
];

interface FormFields {
  name: string;
  shortDescription: string;
  description: string;
  url: string;
  category: string;
  status: AdminProject["status"];
  accent: AdminProject["accent"];
  madeWith: string;
  whyIMadeIt: string;
  whoItsFor: string;
  whatILearned: string;
  adminNotes: string;
}

function toFields(p: AdminProject): FormFields {
  return {
    name: p.name,
    shortDescription: p.shortDescription,
    description: p.description,
    url: p.url,
    category: p.category,
    status: p.status,
    accent: p.accent,
    madeWith: p.madeWith.join(", "),
    whyIMadeIt: p.whyIMadeIt,
    whoItsFor: p.whoItsFor,
    whatILearned: p.whatILearned,
    adminNotes: p.adminNotes,
  };
}

export function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { handleUnauthorized } = useAdminAuth();

  const [project, setProject] = useState<AdminProject | null>(null);
  const [fields, setFields] = useState<FormFields | null>(null);
  const [savedFields, setSavedFields] = useState<FormFields | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    projectsApi
      .get(id)
      .then((res) => {
        setProject(res.project);
        const f = toFields(res.project);
        setFields(f);
        setSavedFields(f);
      })
      .catch((err) => {
        if (isAuthError(err)) handleUnauthorized();
        else showToast("Couldn't load that project.", "error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isDirty = Boolean(fields && savedFields && JSON.stringify(fields) !== JSON.stringify(savedFields));
  useUnsavedChangesGuard(isDirty);

  if (!project || !fields) {
    return <div className={styles.loading}>Loading…</div>;
  }

  function updateField<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!project || !fields) return;
    setSaving(true);
    try {
      const res = await projectsApi.update(project.id, {
        name: fields.name,
        shortDescription: fields.shortDescription,
        description: fields.description,
        url: fields.url,
        category: fields.category,
        status: fields.status,
        accent: fields.accent,
        madeWith: fields.madeWith.split(",").map((s) => s.trim()).filter(Boolean),
        whyIMadeIt: fields.whyIMadeIt,
        whoItsFor: fields.whoItsFor,
        whatILearned: fields.whatILearned,
        adminNotes: fields.adminNotes,
      });
      setProject(res.project);
      const f = toFields(res.project);
      setFields(f);
      setSavedFields(f);
      showToast("Saved.");
    } catch {
      showToast("Couldn't save — the server might be unreachable. Nothing was lost, try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish() {
    if (!project) return;
    if (isDirty) {
      showToast("Save your changes first, then publish.", "error");
      return;
    }
    setPublishBusy(true);
    try {
      const res = project.publishState === "published" ? await projectsApi.unpublish(project.id) : await projectsApi.publish(project.id);
      setProject(res.project);
      showToast(res.project.publishState === "published" ? "Published — it's live now." : "Moved back to draft.");
    } catch {
      showToast("That didn't go through.", "error");
    } finally {
      setPublishBusy(false);
    }
  }

  return (
    <div>
      <Link to="/admin" className={styles.backLink}>
        ← back to projects
      </Link>

      <div className={styles.headRow}>
        <h1 className={styles.title}>
          {isDirty && <span className={styles.dirtyDot} title="Unsaved changes" />}
          {project.name || "Untitled project"}
        </h1>
        <div className={styles.headActions}>
          <button
            type="button"
            className={`btn-reset ${styles.pill} ${project.publishState === "published" ? styles.pillPublished : styles.pillDraft}`}
            onClick={handleTogglePublish}
            disabled={publishBusy}
          >
            {project.publishState === "published" ? "Published — click to unpublish" : "Draft — click to publish"}
          </button>
          <button type="button" className={`btn-reset ${styles.saveBtn}`} onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <div>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Basic information</h2>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="f-name">Project name</label>
              <input id="f-name" className={styles.input} value={fields.name} onChange={(e) => updateField("name", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="f-short">Short description</label>
              <input
                id="f-short"
                className={styles.input}
                value={fields.shortDescription}
                onChange={(e) => updateField("shortDescription", e.target.value)}
                placeholder="One line — shown on cards"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="f-desc">Full description</label>
              <textarea
                id="f-desc"
                className={styles.textarea}
                value={fields.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="What it does — shown as the main write-up on the project page"
              />
            </div>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="f-url">Project URL</label>
                <input id="f-url" className={styles.input} value={fields.url} onChange={(e) => updateField("url", e.target.value)} placeholder="https://…" />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="f-category">Category</label>
                <input id="f-category" className={styles.input} value={fields.category} onChange={(e) => updateField("category", e.target.value)} />
              </div>
            </div>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="f-status">Status label</label>
                <select id="f-status" className={styles.select} value={fields.status} onChange={(e) => updateField("status", e.target.value as FormFields["status"])}>
                  <option value="live">Live — up and running</option>
                  <option value="in-progress">In progress — still tinkering</option>
                  <option value="resting">Resting — paused for now</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Accent colour</label>
                <div className={styles.swatchRow}>
                  {ACCENTS.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      className={`btn-reset ${styles.swatch} ${fields.accent === a.value ? styles.swatchActive : ""}`}
                      style={{ background: a.hex }}
                      onClick={() => updateField("accent", a.value)}
                      aria-label={a.value}
                      aria-pressed={fields.accent === a.value}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="f-icon">Project icon</label>
              <ImageUploader
                label="Icon"
                imageUrl={project.icon}
                hint="Square works best, min 128×128"
                onUpload={async (file) => {
                  const res = await projectsApi.uploadIcon(project.id, file);
                  setProject(res.project);
                }}
                onRemove={async () => {
                  const res = await projectsApi.removeIcon(project.id);
                  setProject(res.project);
                }}
              />
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Screenshots</h2>
            <ScreenshotManager projectId={project.id} screenshots={project.screenshots} onChange={setProject} />
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Additional information <span className={styles.labelHint}>— all optional, only shown publicly if filled in</span></h2>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="f-why">Why I made it</label>
              <textarea id="f-why" className={styles.textarea} value={fields.whyIMadeIt} onChange={(e) => updateField("whyIMadeIt", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="f-who">Who it's for</label>
              <textarea id="f-who" className={styles.textarea} value={fields.whoItsFor} onChange={(e) => updateField("whoItsFor", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="f-learned">What I learned</label>
              <textarea id="f-learned" className={styles.textarea} value={fields.whatILearned} onChange={(e) => updateField("whatILearned", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="f-madewith">Made with <span className={styles.labelHint}>(comma-separated)</span></label>
              <input id="f-madewith" className={styles.input} value={fields.madeWith} onChange={(e) => updateField("madeWith", e.target.value)} placeholder="React, TypeScript, Vite" />
            </div>
          </div>

          <div className={`${styles.card} ${styles.notesCard}`}>
            <div className={styles.notesLabel}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2.5" y="5" width="7" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M4 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.2" /></svg>
              Admin notes — private, never shown publicly
            </div>
            <textarea
              className={styles.textarea}
              value={fields.adminNotes}
              onChange={(e) => updateField("adminNotes", e.target.value)}
              placeholder="e.g. Need to replace screenshot 3 after fixing mobile nav."
            />
          </div>
        </div>

        <div>
          <div className={styles.sidebarCard}>
            <h2 className={styles.cardTitle}>Info</h2>
            <p style={{ fontSize: 12.5, color: "#5a5040", marginBottom: 8 }}>
              Slug: <code>{project.slug}</code>
            </p>
            <p style={{ fontSize: 12.5, color: "#93897a", marginBottom: 8 }}>
              {project.screenshotCount} screenshot{project.screenshotCount === 1 ? "" : "s"} · {project.commentCount} comment{project.commentCount === 1 ? "" : "s"}
            </p>
            <p style={{ fontSize: 12.5, color: "#93897a" }}>
              Icon and screenshot changes save immediately. Text fields need "Save changes".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
