import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import { useSiteData } from "./context/DataContext";
import styles from "./App.module.css";

function AppShell() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <Nav />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

function App() {
  const { loading, error, refetch } = useSiteData();

  if (loading) {
    return (
      <div className={styles.stateScreen}>
        <p className={styles.stateText}>loading the workshop…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateScreen}>
        <p className={styles.stateText}>{error}</p>
        <button type="button" className={`btn-reset ${styles.retryBtn}`} onClick={refetch}>
          Try again
        </button>
      </div>
    );
  }

  return <AppShell />;
}

export default App;
