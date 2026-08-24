import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Project, Profile } from "../data/types";
import { api } from "../lib/apiClient";

interface DataContextValue {
  projects: Project[];
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api.get<{ projects: Project[] }>("/api/public/projects"),
      api.get<{ profile: Profile }>("/api/public/profile"),
    ])
      .then(([projectsRes, profileRes]) => {
        if (cancelled) return;
        setProjects(projectsRes.projects);
        setProfile(profileRes.profile);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't reach the server. Is the API running?");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  const value = useMemo(
    () => ({ projects, profile, loading, error, refetch }),
    [projects, profile, loading, error, refetch],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useSiteData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useSiteData must be used within DataProvider");
  return ctx;
}
