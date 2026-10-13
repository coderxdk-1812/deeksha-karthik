import { useRouteError } from "react-router-dom";
import styles from "./RouteError.module.css";

/**
 * Shown when a page throws while rendering, in place of React Router's
 * developer-facing default. The most likely cause for a visitor is a tab
 * left open across a deploy, which a reload fixes. Plain elements rather
 * than router links, since the router itself may be what failed.
 */
export function RouteError() {
  const error = useRouteError();
  if (error) console.error(error);

  return (
    <div className={styles.wrap} role="alert">
      <h1 className={styles.title}>Something broke on this page.</h1>
      <p className={styles.body}>
        This usually happens right after an update when a tab was left open — reloading almost always fixes it.
      </p>
      <div className={styles.actions}>
        <button type="button" className={`btn-reset ${styles.reload}`} onClick={() => window.location.reload()}>
          Reload the page
        </button>
        <a className={styles.home} href="/">
          Back to the homepage
        </a>
      </div>
    </div>
  );
}
