import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useSiteData } from "../context/DataContext";
import styles from "./Nav.module.css";

const NAV_ITEMS = [
  { to: "/", label: "Home", end: true },
  { to: "/projects", label: "Projects", end: false },
  { to: "/about", label: "About", end: false },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const { profile } = useSiteData();
  const name = profile?.name ?? "";

  return (
    <header className={styles.header}>
      <div className="container">
        <div className={styles.bar}>
          <NavLink to="/" className={styles.mark} aria-label={name ? `${name} — home` : "Home"}>
            <span className={styles.markStamp} aria-hidden="true">
              {name.slice(0, 1) || "·"}
            </span>
            things I made
          </NavLink>

          <nav className={styles.links} aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ""}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
          </button>
        </div>

        <nav
          id="mobile-nav"
          className={`${styles.mobilePanel} ${open ? styles.mobilePanelOpen : ""}`}
          aria-label="Primary, mobile"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
