import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Warns before the user loses unsaved changes — both for in-app
 * navigation (via the router's blocker, requires a data router) and
 * for closing/refreshing the tab (via beforeunload).
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const proceed = window.confirm("You have unsaved changes. Leave without saving?");
    if (proceed) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    if (!isDirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
