import { useSiteData } from "../context/DataContext";
import styles from "./Footer.module.css";

export function Footer() {
  const { profile, projects } = useSiteData();
  if (!profile) return null;

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.row}>
          <p className={styles.note}>
            {projects.length} things built so far · {profile.location} · made by {profile.name}
          </p>
          <nav className={styles.links} aria-label="Contact">
            {profile.links.map((link) => (
              <a key={link.label} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
