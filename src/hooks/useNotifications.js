// src/hooks/useNotifications.js
import { useEffect } from "react";
import toast from "react-hot-toast";

export function useNotifications(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [enabled]);

  const notify = (title, options = {}) => {
    toast(title, { icon: "🔔", duration: 4000 });
    if (
      "Notification" in window &&
      Notification.permission === "granted" &&
      document.hidden
    ) {
      new Notification(title, {
        icon: "/pwa-192x192.png",
        ...options,
      });
    }
  };

  return { notify };
}