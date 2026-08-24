import { useEffect, useState } from "react";
import { profileApi } from "../lib/adminApi";
import type { AdminProfile } from "../lib/types";
import { ImageUploader } from "../components/ImageUploader";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { useToast } from "../AdminToastContext";
import { isAuthError, useAdminAuth } from "../AdminAuthContext";
import styles from "./AboutEditor.module.css";

export function AboutEditor() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [fields, setFields] = useState<AdminProfile | null>(null);
  const [saved, setSaved] = useState<AdminProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { handleUnauthorized } = useAdminAuth();

  useEffect(() => {
    profileApi
      .get()
      .then((res) => {
        setProfile(res.profile);
        setFields(res.profile);
        setSaved(res.profile);
      })
      .catch((err) => {
        if (isAuthError(err)) handleUnauthorized();
        else showToast("Couldn't load your profile.", "error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = Boolean(fields && saved && JSON.stringify(fields) !== JSON.stringify(saved));
  useUnsavedChangesGuard(isDirty);

  if (!fields || !profile) {
    return <div style={{ padding: 60, textAlign: "center", color: "#93897a" }}>Loading…</div>;
  }

  async function handleSave() {
    if (!fields) return;
    setSaving(true);
    try {
      const res = await profileApi.update(fields);
      setProfile(res.profile);
      setFields(res.profile);
      setSaved(res.profile);
      showToast("Saved.");
    } catch {
      showToast("Couldn't save — try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  function updateParagraph(index: number, value: string) {
    setFields((prev) => {
      if (!prev) return prev;
      const next = [...prev.aboutParagraphs];
      next[index] = value;
      return { ...prev, aboutParagraphs: next };
    });
  }

  function addParagraph() {
    setFields((prev) => (prev ? { ...prev, aboutParagraphs: [...prev.aboutParagraphs, ""] } : prev));
  }

  function removeParagraph(index: number) {
    setFields((prev) => (prev ? { ...prev, aboutParagraphs: prev.aboutParagraphs.filter((_, i) => i !== index) } : prev));
  }

  function updateLink(index: number, key: "label" | "href", value: string) {
    setFields((prev) => {
      if (!prev) return prev;
      const next = [...prev.links];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, links: next };
    });
  }

  function addLink() {
    setFields((prev) => (prev ? { ...prev, links: [...prev.links, { label: "", href: "" }] } : prev));
  }

  function removeLink(index: number) {
    setFields((prev) => (prev ? { ...prev, links: prev.links.filter((_, i) => i !== index) } : prev));
  }

  return (
    <div>
      <div className={styles.headRow}>
        <h1 className={styles.title}>
          {isDirty && <span className={styles.dirtyDot} title="Unsaved changes" />}
          About Me
        </h1>
        <button type="button" className={`btn-reset ${styles.saveBtn}`} onClick={handleSave} disabled={saving || !isDirty}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Photo</h2>
        <ImageUploader
          label="Your photo"
          imageUrl={profile.photo}
          shape="circle"
          hint="Shown on the About page. Remove it and the layout adapts automatically."
          onUpload={async (file) => {
            const res = await profileApi.uploadPhoto(file);
            setProfile(res.profile);
            setFields((prev) => (prev ? { ...prev, photo: res.profile.photo } : prev));
            setSaved((prev) => (prev ? { ...prev, photo: res.profile.photo } : prev));
          }}
          onRemove={async () => {
            const res = await profileApi.removePhoto();
            setProfile(res.profile);
            setFields((prev) => (prev ? { ...prev, photo: res.profile.photo } : prev));
            setSaved((prev) => (prev ? { ...prev, photo: res.profile.photo } : prev));
          }}
        />
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Basics</h2>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="p-name">Name</label>
          <input id="p-name" className={styles.input} value={fields.name} onChange={(e) => setFields({ ...fields, name: e.target.value })} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="p-hero">Homepage intro</label>
          <textarea
            id="p-hero"
            className={styles.textarea}
            value={fields.heroBlurb}
            onChange={(e) => setFields({ ...fields, heroBlurb: e.target.value })}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="p-location">Tagline</label>
          <input
            id="p-location"
            className={styles.input}
            value={fields.location}
            onChange={(e) => setFields({ ...fields, location: e.target.value })}
            placeholder="e.g. Built on nights and weekends"
          />
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>About page paragraphs</h2>
        {fields.aboutParagraphs.map((p, i) => (
          <div className={styles.paragraphRow} key={i}>
            <textarea className={styles.textarea} value={p} onChange={(e) => updateParagraph(i, e.target.value)} />
            <button type="button" className={`btn-reset ${styles.removeBtn}`} onClick={() => removeParagraph(i)} aria-label="Remove paragraph">
              ×
            </button>
          </div>
        ))}
        <button type="button" className={`btn-reset ${styles.addBtn}`} onClick={addParagraph}>
          + Add paragraph
        </button>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Links</h2>
        {fields.links.map((link, i) => (
          <div className={styles.linkRow} key={i}>
            <input className={styles.input} placeholder="Label" value={link.label} onChange={(e) => updateLink(i, "label", e.target.value)} />
            <input className={styles.input} placeholder="https:// or mailto:" value={link.href} onChange={(e) => updateLink(i, "href", e.target.value)} />
            <button type="button" className={`btn-reset ${styles.removeBtn}`} onClick={() => removeLink(i)} aria-label="Remove link">
              ×
            </button>
          </div>
        ))}
        <button type="button" className={`btn-reset ${styles.addBtn}`} onClick={addLink}>
          + Add link
        </button>
      </div>
    </div>
  );
}
