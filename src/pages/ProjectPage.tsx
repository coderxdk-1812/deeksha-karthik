import { Link, useParams } from "react-router-dom";
import { useSiteData } from "../context/DataContext";
import { ProjectDetailView } from "../components/ProjectDetailView";
import { CommentSection } from "../components/CommentSection";
import styles from "./ProjectPage.module.css";

export function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const { projects } = useSiteData();
  const project = slug ? projects.find((p) => p.slug === slug) : undefined;

  if (!project) {
    return (
      <div className="container" style={{ padding: "100px 0", textAlign: "center" }}>
        <h1 style={{ fontSize: 32, marginBottom: 14 }}>Couldn't find that project.</h1>
        <p style={{ color: "var(--ink-soft)", marginBottom: 20 }}>It might have moved, or the link is off.</p>
        <Link to="/projects" style={{ color: "var(--slate-deep)", fontWeight: 700, textDecoration: "underline" }}>
          Back to the collection →
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.backRow}>
        <Link to="/projects" className={styles.backLink}>
          ← back to the shelf
        </Link>
      </div>

      <ProjectDetailView project={project} />

      <div className={styles.commentsWrap}>
        <CommentSection key={project.slug} projectSlug={project.slug} />
      </div>
    </div>
  );
}
