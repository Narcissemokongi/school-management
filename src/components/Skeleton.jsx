// src/components/Skeleton.jsx
import { useEffect, useState, useMemo, memo } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level (injectés UNE SEULE FOIS)
// ════════════════════════════════════════════════════════════════════
const SkeletonKeyframes = (
  <style>{`
    @keyframes sk-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .sk-shimmer {
        animation: none !important;
      }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// HELPERS — Normalisation numérique
// ════════════════════════════════════════════════════════════════════

/** Convertit une valeur CSS en nombre (pour les calculs arithmétiques). */
function toNumber(value, fallback) {
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    if (!isNaN(n)) return n;
  }
  return fallback;
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT
// ════════════════════════════════════════════════════════════════════
function SkeletonBase({
  width = "100%",
  height = 20,
  style,
  variant = "rect",
  lines = 3,
  gap = 8,
  count = 1,
  animated = true,
  speed = 1.5,
  borderRadius = 8,
  className,
  // ✅ NOUVEAU — pour les groupes de skeletons (évite les annonces multiples)
  decorative = false,
  ariaLabel = "Chargement…",
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

  // ✅ FIX #1 & #2 — Normalisation numérique
  // Garantit que height et borderRadius sont TOUJOURS des nombres
  const safeHeight = useMemo(() => toNumber(height, 20), [height]);
  const safeBorderRadius = useMemo(
    () => toNumber(borderRadius, 8),
    [borderRadius]
  );
  const safeGap = useMemo(() => toNumber(gap, 8), [gap]);
  const safeLines = useMemo(
    () => Math.max(1, Math.floor(toNumber(lines, 3))),
    [lines]
  );
  const safeCount = useMemo(
    () => Math.max(1, Math.floor(toNumber(count, 1))),
    [count]
  );

  // ✅ Responsive tokens
  const effectiveGap = isMobile ? Math.min(safeGap, 6) : safeGap;
  const effectivePadding = isMobile ? 10 : 12;
  const effectiveBorderRadius = isMobile ? 6 : safeBorderRadius;

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
      boxSizing: "border-box",
    }),
    [baseColor, highlightColor, shouldAnimate, safeSpeed, effectiveBorderRadius]
  );

  // ✅ FIX #3 — A11y : wrapper optionnellement silencieux
  const wrap = (content, extraWrapperStyle = {}) => (
    <>
      {SkeletonKeyframes}
      <div
        className={className}
        {...(decorative
          ? { "aria-hidden": "true" }
          : {
              role: "status",
              "aria-busy": "true",
              "aria-live": "polite",
            })}
        data-skeleton
        style={{
          boxSizing: "border-box",
          minWidth: 0,
          maxWidth: "100%",
          ...extraWrapperStyle,
          ...style,
        }}
      >
        {!decorative && (
          <span
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: "hidden",
              clip: "rect(0 0 0 0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
          >
            {ariaLabel}
          </span>
        )}
        {content}
      </div>
    </>
  );

  // ════════════════════════════════════════════════════════════════════
  // VARIANTES (utilisent safeHeight partout)
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
      {Array.from({ length: safeLines }).map((_, index) => (
        <div
          key={index}
          style={{
            width: index === safeLines - 1 ? "70%" : "100%",
            height: safeHeight,
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
          height: safeHeight * 3,
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
          style={{ width: "80%", height: safeHeight * 0.7, ...shimmerStyle }}
          aria-hidden="true"
        />
        <div
          style={{ width: "60%", height: safeHeight * 0.7, ...shimmerStyle }}
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
      {Array.from({ length: safeCount }).map((_, idx) => (
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
              style={{ width: "70%", height: safeHeight * 0.6, ...shimmerStyle }}
              aria-hidden="true"
            />
            <div
              style={{ width: "40%", height: safeHeight * 0.5, ...shimmerStyle }}
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
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <table
        role="presentation"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr>
            {Array.from({ length: safeLines }).map((_, idx) => (
              <th
                key={idx}
                scope="col"
                style={{
                  padding: effectivePadding,
                  borderBottom: `1px solid ${borderColor}`,
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    width: "80%",
                    height: safeHeight * 0.6,
                    ...shimmerStyle,
                  }}
                  aria-hidden="true"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: safeCount }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: safeLines }).map((_, colIdx) => (
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
                      width: colIdx === safeLines - 1 ? "60%" : "90%",
                      height: safeHeight * 0.6,
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

  const renderAvatar = () => {
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
          style={{ width: "70%", height: safeHeight * 0.6, ...shimmerStyle }}
          aria-hidden="true"
        />
        <div
          style={{ width: "40%", height: safeHeight * 0.5, ...shimmerStyle }}
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
            height: safeHeight,
            ...shimmerStyle,
          }}
          aria-hidden="true"
        />,
        { width }
      );
  }
}

// ✅ FIX #4 — React.memo : évite les re-renders inutiles
export const Skeleton = memo(SkeletonBase);
Skeleton.displayName = "Skeleton";