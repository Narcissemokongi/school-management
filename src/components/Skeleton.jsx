// src/components/Skeleton.jsx
import { useEffect, useState, useMemo } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level (injectés UNE SEULE FOIS via <style>)
// React déduplique par référence JSX stable → pas de rendu multiple
// ════════════════════════════════════════════════════════════════════
const SkeletonKeyframes = (
  <style>{`
    @keyframes sk-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .sk-shimmer,
      [data-skeleton] {
        animation: none !important;
      }
    }
  `}</style>
);

export function Skeleton({
  width = "100%",
  height = 20,
  style,
  variant = "rect", // "rect" | "circle" | "text" | "card" | "list" | "table" | "avatar" | "list-item"
  lines = 3,
  gap = 8,
  count = 1,
  animated = true,
  speed = 1.5,
  borderRadius = 8,
  className,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const [reduceMotion, setReduceMotion] = useState(false);

  // ✅ Respect prefers-reduced-motion (fallback Safari < 14)
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);

    const handler = (e) => setReduceMotion(e.matches);

    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else if (mq.addListener) {
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
  }, []);

  const shouldAnimate = animated && !reduceMotion;

  // ✅ Validation : speed positive uniquement
  const safeSpeed = useMemo(
    () => (typeof speed === "number" && speed > 0 ? speed : 1.5),
    [speed]
  );

  // ✅ Responsive tokens
  const effectiveGap = isMobile ? Math.min(gap, 6) : gap;
  const effectivePadding = isMobile ? 10 : 12;
  const effectiveBorderRadius = isMobile ? 6 : borderRadius;

  const baseColor = dark ? "#334155" : "#E2E8F0";
  const highlightColor = dark ? "#475569" : "#F1F5F9";
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const surfaceBg = dark ? "#1E293B" : "#FFFFFF";

  // ✅ Style du shimmer (partagé)
  const shimmerStyle = useMemo(
    () => ({
      background: `linear-gradient(90deg, ${baseColor} 25%, ${highlightColor} 50%, ${baseColor} 75%)`,
      backgroundSize: "200% 100%",
      animation: shouldAnimate
        ? `sk-shimmer ${safeSpeed}s linear infinite`
        : "none",
      borderRadius: effectiveBorderRadius,
      // ✅ FIX — box-sizing pour éviter le débordement
      boxSizing: "border-box",
    }),
    [baseColor, highlightColor, shouldAnimate, safeSpeed, effectiveBorderRadius]
  );

  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX MAJEUR — Plus de `display: contents`
  // On utilise un fragment <> qui laisse chaque Skeleton être un vrai
  // élément de layout dans le parent (grid item, flex item, block...).
  // ════════════════════════════════════════════════════════════════════
  const wrap = (content, extraWrapperStyle = {}) => (
    <>
      {SkeletonKeyframes}
      <div
        className={className}
        role="status"
        aria-busy="true"
        aria-live="polite"
        data-skeleton
        style={{
          // ✅ Box model cohérent partout
          boxSizing: "border-box",
          minWidth: 0,
          maxWidth: "100%",
          // ✅ Le style utilisateur est appliqué sur le wrapper (pas en dessous)
          ...extraWrapperStyle,
          ...style,
        }}
      >
        <span
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
          }}
        >
          Chargement…
        </span>
        {content}
      </div>
    </>
  );

  // ════════════════════════════════════════════════════════════════════
  // VARIANTES
  // ════════════════════════════════════════════════════════════════════

  const renderTextLines = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: effectiveGap,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          style={{
            width: index === lines - 1 ? "70%" : "100%",
            height,
            ...shimmerStyle,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );

  const renderCard = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: effectiveGap,
        padding: effectivePadding,
        borderRadius: effectiveBorderRadius + 4,
        border: `1px solid ${borderColor}`,
        background: surfaceBg,
        boxShadow: dark
          ? "0 1px 3px rgba(0,0,0,0.3)"
          : "0 1px 3px rgba(0,0,0,0.05)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          height: height * 3,
          ...shimmerStyle,
        }}
        aria-hidden="true"
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: effectiveGap,
        }}
      >
        <div
          style={{ width: "80%", height: height * 0.7, ...shimmerStyle }}
          aria-hidden="true"
        />
        <div
          style={{ width: "60%", height: height * 0.7, ...shimmerStyle }}
          aria-hidden="true"
        />
      </div>
    </div>
  );

  const renderList = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: effectiveGap,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "center",
            gap: effectiveGap,
            padding: effectivePadding,
            borderRadius: effectiveBorderRadius,
            border: `1px solid ${borderColor}`,
            background: surfaceBg,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: isMobile ? 28 : 32,
              height: isMobile ? 28 : 32,
              borderRadius: "50%",
              flexShrink: 0,
              ...shimmerStyle,
            }}
            aria-hidden="true"
          />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minWidth: 0,
            }}
          >
            <div
              style={{ width: "70%", height: height * 0.6, ...shimmerStyle }}
              aria-hidden="true"
            />
            <div
              style={{ width: "40%", height: height * 0.5, ...shimmerStyle }}
              aria-hidden="true"
            />
          </div>
        </div>
      ))}
    </div>
  );

  const renderTable = () => (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        overflowX: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr>
            {Array.from({ length: lines }).map((_, idx) => (
              <th
                key={idx}
                style={{
                  padding: effectivePadding,
                  borderBottom: `1px solid ${borderColor}`,
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    width: "80%",
                    height: height * 0.6,
                    ...shimmerStyle,
                  }}
                  aria-hidden="true"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: count }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: lines }).map((_, colIdx) => (
                <td
                  key={colIdx}
                  style={{
                    padding: effectivePadding,
                    borderBottom: `1px solid ${borderColor}`,
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      width: colIdx === lines - 1 ? "60%" : "90%",
                      height: height * 0.6,
                      ...shimmerStyle,
                    }}
                    aria-hidden="true"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ✅ FIX — renderAvatar : width ET height explicites, jamais "100%"
  const renderAvatar = () => {
    // Si width n'est pas numérique, on prend 40 par défaut
    const avatarSize =
      typeof width === "number"
        ? width
        : typeof width === "string" && /^\d+/.test(width)
        ? parseInt(width, 10)
        : 40;

    return (
      <div
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: "50%",
          flexShrink: 0,
          ...shimmerStyle,
        }}
        aria-hidden="true"
      />
    );
  };

  const renderListItem = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: effectiveGap,
        padding: effectivePadding,
        borderRadius: effectiveBorderRadius,
        border: `1px solid ${borderColor}`,
        background: surfaceBg,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: isMobile ? 28 : 32,
          height: isMobile ? 28 : 32,
          borderRadius: "50%",
          flexShrink: 0,
          ...shimmerStyle,
        }}
        aria-hidden="true"
      />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minWidth: 0,
        }}
      >
        <div
          style={{ width: "70%", height: height * 0.6, ...shimmerStyle }}
          aria-hidden="true"
        />
        <div
          style={{ width: "40%", height: height * 0.5, ...shimmerStyle }}
          aria-hidden="true"
        />
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════
  // RENDU PAR VARIANTE
  // ════════════════════════════════════════════════════════════════════
  switch (variant) {
    case "text":
      return wrap(renderTextLines(), { width });

    case "card":
      return wrap(renderCard(), { width });

    case "list":
      return wrap(renderList(), { width });

    case "table":
      return wrap(renderTable(), { width });

    case "circle":
    case "avatar":
      return wrap(renderAvatar());

    case "list-item":
      return wrap(renderListItem(), { width });

    case "rect":
    default:
      return wrap(
        <div
          style={{
            width: "100%",
            height,
            ...shimmerStyle,
          }}
          aria-hidden="true"
        />,
        { width }
      );
  }
}