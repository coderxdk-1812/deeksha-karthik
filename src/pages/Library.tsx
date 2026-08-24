import { useMemo, useState } from "react";
import { useSiteData } from "../context/DataContext";
import { categoriesFrom } from "../lib/projectHelpers";
import { CatalogCard } from "../components/CatalogCard";
import styles from "./Library.module.css";

export function Library() {
  const { projects } = useSiteData();
  const categories = categoriesFrom(projects);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesCategory = category === "All" || p.category === category;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.madeWith ?? []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [projects, query, category]);

  return (
    <div className="container">
      <div className={styles.head}>
        <div>
          <span className={styles.kicker}>the shelf · {projects.length} items catalogued</span>
          <h1 className={styles.title}>Everything, browsable</h1>
        </div>
        <div className={styles.searchWrap}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.4" />
            <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="search the shelf..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search projects"
          />
        </div>
      </div>

      <div className={styles.filterRow} role="group" aria-label="Filter by category">
        <button
          type="button"
          aria-pressed={category === "All"}
          className={`${styles.filterTab} ${category === "All" ? styles.filterTabActive : ""}`}
          onClick={() => setCategory("All")}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            className={`${styles.filterTab} ${category === c ? styles.filterTabActive : ""}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <p className={styles.resultCount} aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "result" : "results"}
        {category !== "All" ? ` in ${category}` : ""}
        {query ? ` matching "${query}"` : ""}
      </p>

      {filtered.length > 0 ? (
        <div className={styles.list}>
          {filtered.map((p) => (
            <CatalogCard key={p.slug} project={p} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className={styles.empty}>
          <h3>The shelf is empty right now.</h3>
          <p>Nothing's been published yet — check back soon.</p>
        </div>
      ) : (
        <div className={styles.empty}>
          <h3>Nothing on the shelf matches that.</h3>
          <p>Try a different word, or clear the filter.</p>
          <button
            type="button"
            className={`btn-reset ${styles.emptyReset}`}
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
          >
            Reset search →
          </button>
        </div>
      )}
    </div>
  );
}
