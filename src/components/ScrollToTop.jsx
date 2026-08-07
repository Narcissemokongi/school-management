import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button
      onClick={scrollToTop}
      aria-label="Retour en haut de la page"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1000,
        background: "#4F46E5",
        color: "#FFFFFF",
        border: "none",
        borderRadius: "50%",
        width: 44,
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(79,70,229,0.3)",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.8)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <ChevronUp size={22} />
    </button>
  );
}