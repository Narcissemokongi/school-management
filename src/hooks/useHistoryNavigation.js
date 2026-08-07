import { useEffect } from "react";

export function useHistoryNavigation(onBack) {
  useEffect(() => {
    const handlePopState = () => {
      onBack();
    };
    window.addEventListener("popstate", handlePopState);
    // On pousse un état initial pour que le premier retour ne quitte pas l'appli
    if (window.history.state === null) {
      window.history.pushState(null, "", window.location.href);
    }
    return () => window.removeEventListener("popstate", handlePopState);
  }, [onBack]);
}