import { useState, useMemo, useEffect, useCallback } from "react";
import { useStyles } from "../../styles/theme";
import { Download } from "lucide-react";
import toast from "react-hot-toast";

export function BarChart({
  data,
  maxValue,
  labelWidth = 120,
  color = "#4F46E5",
  gradientTo = "#7C3AED",
  height = 24,
  showValues = true,
  showPercentage = true,
  sortBy = "desc",
  formatter = (value) => value.toLocaleString(),
  emptyMessage = "Aucune donnée disponible",
  valueKey = "userCount",
  labelKey = "nom",
  idKey = "_id",
  showRanking = true,
  animated = true,
  onBarClick,          // callback(item)
  exportable = false,  // affiche un bouton export CSV
  exportFileName = "bar-chart.csv",
}) {
  const { dark } = useStyles();
  const [isAnimating, setIsAnimating] = useState(false);

  const sortedData = useMemo(() => {
    if (sortBy === null) return data;
    return [...data].sort((a, b) => {
      const aVal = a[valueKey] || 0;
      const bVal = b[valueKey] || 0;
      return sortBy === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [data, sortBy, valueKey]);

  const safeMax = Math.max(maxValue || 0, ...sortedData.map(d => d[valueKey] || 0), 1);

  useEffect(() => {
    if (animated) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [animated, sortedData]);

  const handleExport = useCallback(() => {
    const csv = sortedData.map(d => `${d[labelKey]},${d[valueKey]}`).join("\n");
    const blob = new Blob([`Label,Valeur\n${csv}`], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = exportFileName;
    link.click();
    toast.success("Export CSV généré");
  }, [sortedData, labelKey, valueKey, exportFileName]);

  if (sortedData.length === 0) {
    return (
      <div role="status" aria-live="polite" style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: 24, color: dark ? "#94A3B8" : "#64748B", fontSize: 13,
        background: dark ? "#1E293B" : "#F9FAFB", borderRadius: 12,
        border: `1px dashed ${dark ? "#334155" : "#E2E8F0"}`,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M3 3v18h18" />
          <rect x="7" y="10" width="3" height="8" fill="currentColor" />
          <rect x="12" y="6" width="3" height="12" fill="currentColor" />
          <rect x="17" y="13" width="3" height="5" fill="currentColor" />
        </svg>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {exportable && (
        <button onClick={handleExport} style={{
          alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
          borderRadius: 6, background: "transparent", cursor: "pointer",
          color: dark ? "#94A3B8" : "#64748B", fontSize: 12,
        }}>
          <Download size={14} /> Export CSV
        </button>
      )}

      {sortedData.map((item, index) => {
        const value = item[valueKey] || 0;
        const percent = safeMax > 0 ? (value / safeMax) * 100 : 0;
        const label = item[labelKey] || "—";
        const itemId = item[idKey] || index;

        return (
          <div
            key={itemId}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              animation: animated ? `bar-fade-in 0.4s ease ${index * 0.05}s both` : "none",
            }}
          >
            {showRanking && (
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: index < 3 ? (dark ? "#312E81" : "#EEF2FF") : "transparent",
                color: index < 3 ? (dark ? "#A5B4FC" : "#4F46E5") : dark ? "#64748B" : "#94A3B8",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {index + 1}
              </div>
            )}

            <div title={label} style={{
              width: `clamp(80px, ${labelWidth}px, 200px)`,
              fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              color: dark ? "#E2E8F0" : "#1E293B", fontWeight: 500,
            }}>
              {label}
            </div>

            <div
              role="progressbar"
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={safeMax}
              aria-label={`${label}: ${formatter(value)}`}
              style={{
                flex: 1, background: dark ? "#334155" : "#F1F5F9", borderRadius: 6,
                height: `${height}px`, overflow: "hidden", position: "relative",
                cursor: onBarClick ? "pointer" : "default",
                transition: "box-shadow 0.2s",
              }}
              onClick={() => onBarClick && onBarClick(item)}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = dark ? "0 2px 8px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              <div
                style={{
                  width: isAnimating ? 0 : `${percent}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${color}, ${gradientTo})`,
                  borderRadius: 6,
                  minWidth: value > 0 ? 4 : 0,
                  transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
                title={`${label} : ${formatter(value)} (${Math.round(percent)}%)`}
              >
                {showPercentage && percent > 20 && (
                  <span style={{
                    position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                    fontSize: 11, fontWeight: 700, color: "white",
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}>
                    {Math.round(percent)}%
                  </span>
                )}
              </div>
            </div>

            {showValues && (
              <div style={{
                width: 60, textAlign: "right", fontSize: 13, fontWeight: 600,
                color: dark ? "#F1F5F9" : "#1E293B", fontVariantNumeric: "tabular-nums",
              }}>
                {formatter(value)}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes bar-fade-in {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}