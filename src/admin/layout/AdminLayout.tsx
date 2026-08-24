import { NavLink, Outlet } from "react-router-dom";
import { useAdminAuth } from "../AdminAuthContext";
import styles from "./AdminLayout.module.css";

const NAV_ITEMS = [
  { to: "/admin", label: "Projects", end: true },
  { to: "/admin/about", label: "About Me", end: false },
  { to: "/admin/feedback", label: "Feedback", end: false },
  { to: "/admin/settings", label: "Settings", end: false },
];

export function AdminLayout() {
  const { logout } = useAdminAuth();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandDot} aria-hidden="true" />
          workshop admin
        </div>

        <nav className={styles.nav} aria-label="Admin">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <a href="/" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
            View live site ↗
          </a>
          <button type="button" className={`btn-reset ${styles.logoutBtn}`} onClick={() => logout()}>
            Log out
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <Outlet />
      </div>
    </div>
  );
}
