import { useSiteData } from "../context/DataContext";
import styles from "./About.module.css";

export function About() {
  const { profile, projects } = useSiteData();
  if (!profile) return null;

  return (
    <div className="container">
      <div className={styles.wrap}>
        <div className={styles.sticky}>
          {profile.photo && (
            <div className={styles.photoWrap}>
              <img src={profile.photo} alt={`Photo of ${profile.name}`} />
            </div>
          )}
          <span className={styles.kicker}>about</span>
          <h1 className={styles.name}>{profile.name}</h1>
          <span className={styles.stamp}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path
                d="M2 6.5l3 3 6-6.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {projects.length} things built, {profile.location.toLowerCase()}
          </span>
          {profile.links.length > 0 && (
            <div className={styles.linkList}>
              {profile.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
          )}
        </div>

        <div className={styles.paragraphs}>
          {profile.aboutParagraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
