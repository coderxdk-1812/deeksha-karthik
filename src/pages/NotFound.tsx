import { Link } from "react-router-dom";
import styles from "./NotFound.module.css";

export function NotFound() {
  return (
    <div className={styles.wrap}>
      <span className={styles.stamp}>No. 404</span>
      <h1 className={styles.title}>Nothing built here yet.</h1>
      <p className={styles.body}>This corner of the workshop is empty. Might've been moved, or maybe it never existed.</p>
      <Link to="/projects" className={styles.link}>
        Back to the collection →
      </Link>
    </div>
  );
}
