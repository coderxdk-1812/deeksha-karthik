import { useEffect, useRef, useState } from "react";
import type { Screenshot } from "../data/types";
import type { Accent } from "../lib/accent";
import { ScreenshotPlaceholder } from "./ScreenshotPlaceholder";
import { resolveAssetUrl } from "../lib/apiClient";
import styles from "./Lightbox.module.css";

interface LightboxProps {
  screenshots: Screenshot[];
  initialIndex: number;
  accent: Accent;
  projectName: string;
  onClose: () => void;
}

export function Lightbox({ screenshots, initialIndex, accent, projectName, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    closeBtnRef.current?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        setIndex((i) => (i + 1) % screenshots.length);
      } else if (e.key === "ArrowLeft") {
        setIndex((i) => (i - 1 + screenshots.length) % screenshots.length);
      } else if (e.key === "Tab" && overlayRef.current) {
        const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [screenshots.length, onClose]);

  const shot = screenshots[index];

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${projectName} screenshot ${index + 1} of ${screenshots.length}`}
        className={styles.figure}
      >
        <div className={styles.imgWrap}>
          {shot.src ? (
            <img src={resolveAssetUrl(shot.src)} alt={`${projectName} — ${shot.caption}`} />
          ) : (
            <ScreenshotPlaceholder accent={accent} index={index} />
          )}
        </div>
        <div className={styles.caption}>
          <p className={styles.captionText}>{shot.caption}</p>
          <span className={styles.counter}>
            {index + 1} / {screenshots.length}
          </span>
        </div>
      </div>

      <button ref={closeBtnRef} type="button" className={`btn-reset ${styles.closeBtn}`} onClick={onClose} aria-label="Close screenshot viewer">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {screenshots.length > 1 && (
        <>
          <button
            type="button"
            className={`btn-reset ${styles.navBtn} ${styles.navPrev}`}
            onClick={() => setIndex((i) => (i - 1 + screenshots.length) % screenshots.length)}
            aria-label="Previous screenshot"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className={`btn-reset ${styles.navBtn} ${styles.navNext}`}
            onClick={() => setIndex((i) => (i + 1) % screenshots.length)}
            aria-label="Next screenshot"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
