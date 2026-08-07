// src/components/OfflineBanner.jsx
import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import toast from "react-hot-toast";

export function OfflineBanner({ dark }) {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline = () => {
      setOffline(false);
      toast.success("Connexion rétablie", { icon: <Wifi size={18} />, duration: 3000 });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10000,
      background: dark ? "#ef4444" : "#ef4444",
      color: "#fff",
      padding: "8px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      fontSize: 14,
      fontWeight: 600,
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    }}>
      <WifiOff size={18} />
      Mode hors‑ligne – Certaines actions sont indisponibles
    </div>
  );
}