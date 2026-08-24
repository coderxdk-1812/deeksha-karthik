import type { ProjectStatus } from "../data/types";
import { statusLabel } from "../lib/projectHelpers";
import styles from "./StatusBadge.module.css";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={styles.badge}>
      <span className={`${styles.dot} ${styles[status]}`} aria-hidden="true" />
      {statusLabel[status]}
    </span>
  );
}
