import { Link } from "react-router-dom";
import type { Project } from "../data/types";
import { ProjectIcon } from "./ProjectIcon";
import { ScreenshotPlaceholder } from "./ScreenshotPlaceholder";
import { StatusBadge } from "./StatusBadge";
import { resolveAssetUrl } from "../lib/apiClient";
import styles from "./CatalogCard.module.css";

export function CatalogCard({ project }: { project: Project }) {
  const shot = project.screenshots[0];

  return (
    <Link to={`/projects/${project.slug}`} className={styles.card}>
      <div className={styles.thumbWrap}>
        {shot?.src ? (
          <img src={resolveAssetUrl(shot.src)} alt="" />
        ) : (
          <ScreenshotPlaceholder accent={project.accent} index={0} />
        )}
        <span className={styles.iconOverlay}>
          <ProjectIcon name={project.name} icon={project.icon} accent={project.accent} size={28} />
        </span>
      </div>

      <div className={styles.main}>
        <div className={styles.topRow}>
          <span className={styles.number}>No. {project.catalogNumber ?? "—"}</span>
          <h3 className={styles.name}>{project.name}</h3>
        </div>
        <p className={styles.desc}>{project.shortDescription}</p>
        <div className={styles.tagsRow}>
          <span className={styles.category}>{project.category}</span>
          <StatusBadge status={project.status} />
        </div>
      </div>

      <svg className={styles.arrow} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
