import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

interface Toast {
  id: number;
  message: string;
  kind: "success" | "error";
}

interface ToastContextValue {
  showToast: (message: string, kind?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, kind: "success" | "error" = "success") => {
    const id = idRef.current++;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 2000,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              color: t.kind === "success" ? "#293a10" : "#ae2f22",
              background: t.kind === "success" ? "#dde3c7" : "#f6e0dc",
              border: `1px solid ${t.kind === "success" ? "#46521f" : "#ae2f22"}`,
              boxShadow: "0 4px 14px rgba(36,26,16,0.12)",
              maxWidth: 320,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within AdminToastProvider");
  return ctx;
}
