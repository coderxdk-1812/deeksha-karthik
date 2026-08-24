import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { projectsApi } from "../lib/adminApi";
import type { AdminProject } from "../lib/types";
import type { Project } from "../../data/types";
import { ProjectDetailView } from "../../components/ProjectDetailView";
import { isAuthError, useAdminAuth } from "../AdminAuthContext";
import { useToast } from "../AdminToastContext";
import styles from "./ProjectPreview.module.css";

function toPublicShape(p: AdminProject): Project {
  return {
    name: p.name,
    slug: p.slug,
    icon: p.icon,
    shortDescription: p.shortDescription,
    description: p.description,
    url: p.url,
    category: p.category,
    status: p.status,
    accent: p.accent,
    madeWith: p.madeWith,
    whyIMadeIt: p.whyIMadeIt || undefined,
    whoItsFor: p.whoItsFor || undefined,
    whatILearned: p.whatILearned || undefined,
    catalogNumber: undefined,
    screenshots: p.screenshots.map((s) => ({ src: s.src, caption: s.caption })),
  };
}

export function ProjectPreview() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<AdminProject | null>(null);
  const { handleUnauthorized } = useAdminAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!id) return;
    projectsApi
      .get(id)
      .then((res) => setProject(res.project))
      .catch((err) => {
        if (isAuthError(err)) handleUnauthorized();
        else showToast("Couldn't load that project.", "error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className={styles.frame}>
      <div className={styles.banner}>
        <div className={styles.bannerLeft}>
          <span className={styles.bannerDot} aria-hidden="true" />
          Preview {project ? `— ${project.publishState === "published" ? "already live" : "not published yet"}` : ""}
        </div>
        {project && (
          <Link to={`/admin/projects/${project.id}/edit`} className={styles.bannerLink}>
            ← back to editor
          </Link>
        )}
      </div>

      {!project ? (
        <div className={styles.loading}>Loading preview…</div>
      ) : (
        <div className="container" style={{ paddingTop: 32 }}>
          <ProjectDetailView project={toPublicShape(project)} />
        </div>
      )}
    </div>
  );
}
