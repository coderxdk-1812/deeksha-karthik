import { Link } from "react-router-dom";
import type { Project } from "../data/types";
import { ProjectIcon } from "./ProjectIcon";
import { ScreenshotPlaceholder } from "./ScreenshotPlaceholder";
import { StatusBadge } from "./StatusBadge";
import { resolveAssetUrl } from "../lib/apiClient";
import styles from "./ShelfCard.module.css";

interface ShelfCardProps {
  project: Project;
  size?: "feature" | "medium";
}

export function ShelfCard({ project, size = "medium" }: ShelfCardProps) {
  const shot = project.screenshots[0];

  return (
    <Link to={`/projects/${project.slug}`} className={`${styles.card} ${styles[size]}`}>
      <div className={styles.thumb}>
        {shot?.src ? (
          <img src={resolveAssetUrl(shot.src)} alt={`${project.name} — ${shot.caption}`} />
        ) : (
          <ScreenshotPlaceholder accent={project.accent} index={0} />
        )}
        <span className={styles.iconBadge}>
          <ProjectIcon name={project.name} icon={project.icon} accent={project.accent} size={size === "feature" ? 52 : 44} />
        </span>
      </div>
      <div className={styles.body}>
        <div className={styles.metaRow}>
          <span className={styles.category}>{project.category}</span>
          <StatusBadge status={project.status} />
        </div>
        <h3 className={styles.name}>{project.name}</h3>
        <p className={styles.desc}>{project.shortDescription}</p>
        <span className={styles.cue}>Take a look →</span>
      </div>
    </Link>
  );
}
