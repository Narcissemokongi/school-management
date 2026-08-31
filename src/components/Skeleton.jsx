import { useEffect, useState } from "react";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook

export function Skeleton({
  width = "100%",
  height = 20,
  style,
  variant = "rect", // "rect" | "circle" | "text" | "card" | "list" | "table" | "avatar" | "list-item"
  lines = 3,          // pour variant "text" ou "list"
  gap = 8,            // espacement entre lignes ou éléments
  count = 1,          // nombre d'éléments pour les variantes répétitives
  animated = true,    // activer/désactiver l'animation shimmer
  speed = 1.5,        // durée de l'animation en secondes
  borderRadius = 8,   // rayon de bordure pour les rectangles
  className,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mediaQuery.matches);
    const handler = (e) => setReduceMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const shouldAnimate = animated && !reduceMotion;

  // Ajustements automatiques pour mobile
  const effectiveGap = isMobile ? Math.min(gap, 6) : gap;
  const effectivePadding = isMobile ? 10 : 12;
  const effectiveBorderRadius = isMobile ? 6 : borderRadius;

  const baseColor = dark ? "#334155" : "#E2E8F0";
  const highlightColor = dark ? "#475569" : "#F1F5F9";

  const shimmerStyle = {
    background: `linear-gradient(90deg, ${baseColor} 25%, ${highlightColor} 50%, ${baseColor} 75%)`,
    backgroundSize: "200% 100%",
    animation: shouldAnimate ? `shimmer ${speed}s infinite` : "none",
    borderRadius: effectiveBorderRadius,
  };

  // Rendu d'un rectangle simple
  const renderRect = (w, h, extraStyle = {}) => (
    <div
      style={{
        width: w,
        height: h,
        ...shimmerStyle,
        ...extraStyle,
      }}
      aria-hidden="true"
    />
  );

  // Rendu d'une ligne de texte (width par défaut 100%, dernière plus courte)
  const renderTextLines = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: effectiveGap, width }} role="status" aria-busy="true">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          style={{
            width: index === lines - 1 ? "70%" : "100%",
            height,
            ...shimmerStyle,
            ...style,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );

  // Rendu d'une carte
  const renderCard = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: effectiveGap,
        padding: effectivePadding,
        borderRadius: effectiveBorderRadius + 4,
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        background: dark ? "#1E293B" : "#FFFFFF",
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        width,
        ...style,
      }}
      role="status"
      aria-busy="true"
    >
      <div style={{ width: "100%", height: height * 3, ...shimmerStyle }} />
      <div style={{ display: "flex", flexDirection: "column", gap: effectiveGap }}>
        <div style={{ width: "80%", height: height * 0.7, ...shimmerStyle }} />
        <div style={{ width: "60%", height: height * 0.7, ...shimmerStyle }} />
      </div>
    </div>
  );

  // Rendu d'une liste d'éléments
  const renderList = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: effectiveGap, width }} role="status" aria-busy="true">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "center",
            gap: effectiveGap,
            padding: effectivePadding,
            borderRadius: effectiveBorderRadius,
            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            background: dark ? "#1E293B" : "#FFFFFF",
            ...style,
          }}
        >
          <div style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: "50%", ...shimmerStyle }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ width: "70%", height: height * 0.6, ...shimmerStyle }} />
            <div style={{ width: "40%", height: height * 0.5, ...shimmerStyle }} />
          </div>
        </div>
      ))}
    </div>
  );

  // Rendu d'un tableau
  const renderTable = () => (
    <div style={{ width, ...style }} role="status" aria-busy="true">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {Array.from({ length: lines }).map((_, idx) => (
              <th key={idx} style={{ padding: effectivePadding, borderBottom: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
                <div style={{ width: "80%", height: height * 0.6, ...shimmerStyle }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: count }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: lines }).map((_, colIdx) => (
                <td key={colIdx} style={{ padding: effectivePadding, borderBottom: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
                  <div style={{ width: colIdx === lines - 1 ? "60%" : "90%", height: height * 0.6, ...shimmerStyle }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Rendu d'un avatar
  const renderAvatar = () => (
    <div
      style={{
        width,
        height: width,
        borderRadius: "50%",
        ...shimmerStyle,
        ...style,
      }}
      role="status"
      aria-busy="true"
    />
  );

  // Rendu d'un élément de liste simple (avatar + texte)
  const renderListItem = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: effectiveGap,
        padding: effectivePadding,
        borderRadius: effectiveBorderRadius,
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        background: dark ? "#1E293B" : "#FFFFFF",
        width,
        ...style,
      }}
      role="status"
      aria-busy="true"
    >
      <div style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: "50%", ...shimmerStyle }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ width: "70%", height: height * 0.6, ...shimmerStyle }} />
        <div style={{ width: "40%", height: height * 0.5, ...shimmerStyle }} />
      </div>
    </div>
  );

  switch (variant) {
    case "circle":
      return renderAvatar();
    case "text":
      return renderTextLines();
    case "card":
      return renderCard();
    case "list":
      return renderList();
    case "table":
      return renderTable();
    case "avatar":
      return renderAvatar();
    case "list-item":
      return renderListItem();
    case "rect":
    default:
      return (
        <div
          style={{
            width,
            height,
            ...shimmerStyle,
            ...style,
          }}
          role="status"
          aria-busy="true"
        />
      );
  }
}