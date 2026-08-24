import { useState } from "react";
import type { Screenshot } from "../data/types";
import type { Accent } from "../lib/accent";
import { ScreenshotPlaceholder } from "./ScreenshotPlaceholder";
import { Lightbox } from "./Lightbox";
import { resolveAssetUrl } from "../lib/apiClient";
import styles from "./ScreenshotGallery.module.css";

interface ScreenshotGalleryProps {
  screenshots: Screenshot[];
  accent: Accent;
  projectName: string;
}

export function ScreenshotGallery({ screenshots, accent, projectName }: ScreenshotGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (screenshots.length === 0) return null;

  const [primary, ...supporting] = screenshots;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={`btn-reset ${styles.primaryBtn}`}
        onClick={() => setOpenIndex(0)}
        aria-label={`View larger — ${primary.caption}`}
      >
        {primary.src ? (
          <img src={resolveAssetUrl(primary.src)} alt={`${projectName} — ${primary.caption}`} />
        ) : (
          <ScreenshotPlaceholder accent={accent} index={0} />
        )}
        <span className={styles.primaryCaption}>{primary.caption}</span>
      </button>

      {supporting.length > 0 && (
        <div className={styles.thumbRow}>
          {supporting.map((shot, i) => (
            <button
              key={i}
              type="button"
              className={`btn-reset ${styles.thumbBtn}`}
              onClick={() => setOpenIndex(i + 1)}
              aria-label={`View larger — ${shot.caption}`}
            >
              <span className={styles.thumbImgWrap}>
                {shot.src ? (
                  <img src={resolveAssetUrl(shot.src)} alt={`${projectName} — ${shot.caption}`} />
                ) : (
                  <ScreenshotPlaceholder accent={accent} index={i + 1} />
                )}
              </span>
              <span className={styles.thumbCaption}>{shot.caption}</span>
            </button>
          ))}
        </div>
      )}

      {openIndex !== null && (
        <Lightbox
          screenshots={screenshots}
          initialIndex={openIndex}
          accent={accent}
          projectName={projectName}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}
