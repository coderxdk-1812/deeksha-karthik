import { Link } from "react-router-dom";
import { useSiteData } from "../context/DataContext";
import { categoriesFrom } from "../lib/projectHelpers";
import { ShelfCard } from "../components/ShelfCard";
import { ProjectIcon } from "../components/ProjectIcon";
import styles from "./Home.module.css";

export function Home() {
  const { projects, profile } = useSiteData();
  if (!profile) return null;

  const [feature, medium1, medium2, ...rest] = projects;
  const liveCount = projects.filter((p) => p.status === "live").length;
  const categories = categoriesFrom(projects);

  return (
    <>
      <section className="container">
        <div className={styles.hero}>
          <div>
            <span className={styles.kicker}>a working collection, not a mockup</span>
            <h1 className={styles.title}>
              things I made <span className={styles.titleAccent}>on the internet</span>
            </h1>
            <p className={styles.blurb}>{profile.heroBlurb}</p>
            <div className={styles.heroActions}>
              <Link to="/projects" className={styles.primaryBtn}>
                Browse the collection ↓
              </Link>
              <Link to="/about" className={styles.secondaryLink}>
                Who's behind this?
              </Link>
            </div>
          </div>

          <div className={styles.heroSide}>
            <div className={styles.statList}>
              <div>
                <div className={styles.statNum}>{projects.length}</div>
                <div className={styles.statLabel}>things built &amp; shelved here</div>
              </div>
              <div>
                <div className={styles.statNum}>{liveCount}</div>
                <div className={styles.statLabel}>live and usable right now</div>
              </div>
              <div>
                <div className={styles.statNum}>{categories.length}</div>
                <div className={styles.statLabel}>categories, loosely defined</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {feature ? (
        <section className={`container ${styles.shelfSection}`} aria-labelledby="shelf-heading">
          <div className={styles.shelfHeadRow}>
            <h2 id="shelf-heading" className={styles.shelfHeading}>
              From the shelf
            </h2>
            <Link to="/projects" className={styles.secondaryLink}>
              See everything →
            </Link>
          </div>

          <div
            className={`${styles.shelfGrid} ${!medium1 ? styles.shelfGridSingle : !medium2 ? styles.shelfGridDouble : ""}`}
          >
            <div className={styles.shelfFeature}>
              <ShelfCard project={feature} size="feature" />
            </div>
            {medium1 && (
              <div className={styles.shelfMedium1}>
                <ShelfCard project={medium1} size="medium" />
              </div>
            )}
            {medium2 && (
              <div className={styles.shelfMedium2}>
                <ShelfCard project={medium2} size="medium" />
              </div>
            )}
          </div>

          {rest.length > 0 && (
            <div className={styles.moreSection}>
              <span className={styles.moreLabel}>also on the shelf</span>
              <div className={styles.chipRow}>
                {rest.map((p) => (
                  <Link key={p.slug} to={`/projects/${p.slug}`} className={styles.chip}>
                    <ProjectIcon name={p.name} icon={p.icon} accent={p.accent} size={26} />
                    {p.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className={`container ${styles.shelfSection}`}>
          <p className={styles.emptyShelf}>
            Nothing on the shelf yet — the first project is still being polished. Check back soon.
          </p>
        </section>
      )}

      {profile.aboutParagraphs[0] && (
        <section className="container">
          <div className={styles.aboutSection}>
            <div>
              <span className={styles.aboutLabel}>the short version</span>
              <h2 className={styles.aboutHeading}>Why this exists</h2>
            </div>
            <p className={styles.aboutText}>
              {profile.aboutParagraphs[0]} <Link to="/about">Read the rest →</Link>
            </p>
          </div>
        </section>
      )}

      <section className="container">
        <div className={styles.feedbackBanner}>
          <div>
            <h2>Found something confusing in one of these?</h2>
            <p>Every project has a feedback box at the bottom. That's not decoration — I actually read it.</p>
          </div>
          <Link to="/projects" className={styles.primaryBtn}>
            Go poke around →
          </Link>
        </div>
      </section>
    </>
  );
}
