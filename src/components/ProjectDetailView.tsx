import type { Project } from "../data/types";
import { ProjectIcon } from "./ProjectIcon";
import { StatusBadge } from "./StatusBadge";
import { ScreenshotGallery } from "./ScreenshotGallery";
import styles from "../pages/ProjectPage.module.css";

/**
 * The header + gallery + about-blocks presentation for a project.
 * Shared by the public project page and the admin preview, so a
 * preview genuinely shows what will go live — not an approximation.
 */
export function ProjectDetailView({ project }: { project: Project }) {
  const aboutBlocks: { label: string; text: string }[] = [{ label: "What it does", text: project.description }];
  if (project.whyIMadeIt) aboutBlocks.push({ label: "Why I made it", text: project.whyIMadeIt });
  if (project.whoItsFor) aboutBlocks.push({ label: "Who it's for", text: project.whoItsFor });
  if (project.whatILearned) aboutBlocks.push({ label: "What I learned", text: project.whatILearned });

  return (
    <>
      <header className={styles.header}>
        <div className={styles.iconCol}>
          <ProjectIcon name={project.name} icon={project.icon} accent={project.accent} size={72} />
        </div>

        <div className={styles.titleCol}>
          <div className={styles.metaRow}>
            <span className={styles.number}>No. {project.catalogNumber ?? "—"}</span>
            <span className={styles.category}>{project.category}</span>
            <StatusBadge status={project.status} />
          </div>
          <h1 className={styles.name}>{project.name}</h1>
          <p className={styles.short}>{project.shortDescription}</p>
          {project.madeWith && project.madeWith.length > 0 && (
            <div className={styles.madeWith}>
              <span className={styles.madeWithLabel}>made with</span>
              {project.madeWith.map((t) => (
                <span key={t} className={styles.tech}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.ctaCol}>
          <a href={project.url} target="_blank" rel="noopener noreferrer" className={styles.openBtn}>
            Open website
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path d="M5 3h7v7M12 3L3 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <span className={styles.openHint}>opens in a new tab</span>
        </div>
      </header>

      <div className={project.screenshots.length > 0 ? styles.body : styles.bodyNoGallery}>
        {project.screenshots.length > 0 && (
          <ScreenshotGallery screenshots={project.screenshots} accent={project.accent} projectName={project.name} />
        )}

        <div className={styles.about}>
          {aboutBlocks.map((block) => (
            <div key={block.label} className={styles.aboutBlock}>
              <span className={styles.aboutLabel}>{block.label}</span>
              <p className={styles.aboutText}>{block.text}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
