// src/hooks/useActivityPing.js
import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

const PING_INTERVAL_MS = 5 * 60 * 1000; // 5 min

/**
 * Ping la présence du user toutes les 5 min.
 * Utilise navigator.userAgent pour info.
 */
export function useActivityPing(userId) {
  const pingM = useMutation(api.users.pingActivity);

  useEffect(() => {
    if (!userId) return;

    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

    const ping = () => {
      pingM({ userId, userAgent: ua }).catch(() => {});
    };

    // Ping initial
    ping();

    // Ping périodique
    const id = setInterval(ping, PING_INTERVAL_MS);

    // Ping au focus (retour d'onglet)
    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [userId, pingM]);
}