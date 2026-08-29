import { useStyles } from "../styles/theme";

export function Skeleton({
  width = "100%",
  height = 20,
  style,
  variant = "rect", // "rect" | "circle" | "text" | "card"
  lines = 3,          // pour variant "text"
  gap = 8,            // espacement entre lignes (text) ou éléments
}) {
  const { dark } = useStyles();

  // Couleurs adaptatives pour le dégradé
  const baseColor = dark ? "#334155" : "#E2E8F0";
  const highlightColor = dark ? "#475569" : "#F1F5F9";

  const shimmerStyle = {
    background: `linear-gradient(90deg, ${baseColor} 25%, ${highlightColor} 50%, ${baseColor} 75%)`,
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
    borderRadius: 8,
  };

  // Variante cercle (avatar, icône)
  if (variant === "circle") {
    return (
      <div
        style={{
          width,
          height: width, // pour un cercle parfait
          borderRadius: "50%",
          ...shimmerStyle,
          ...style,
        }}
        aria-hidden="true"
      />
    );
  }

  // Variante texte (plusieurs lignes simulées)
  if (variant === "text") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap, width }}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            style={{
              width: index === lines - 1 ? "70%" : "100%", // dernière ligne plus courte
              height,
              ...shimmerStyle,
              ...style,
            }}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  // Variante carte (rectangles empilés avec contenu simulé)
  if (variant === "card") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 16,
          borderRadius: 12,
          border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
          background: dark ? "#1E293B" : "#FFFFFF",
          boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
          width,
          ...style,
        }}
        aria-hidden="true"
      >
        {/* Image simulée */}
        <div style={{ width: "100%", height: height * 3, ...shimmerStyle }} />
        {/* Lignes de texte simulées */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ width: "80%", height: height * 0.7, ...shimmerStyle }} />
          <div style={{ width: "60%", height: height * 0.7, ...shimmerStyle }} />
        </div>
      </div>
    );
  }

  // Variante rectangle standard
  return (
    <div
      style={{
        width,
        height,
        ...shimmerStyle,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}