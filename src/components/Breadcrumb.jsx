import { ChevronRight, Home } from "lucide-react";
import { useStyles } from "../styles/theme";

export function Breadcrumb({ items = [] }) {
  const { S } = useStyles();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 14, color: S.textMuted }}>
      <Home size={16} />
      {items.map((item, idx) => (
        <span key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ChevronRight size={14} />
          <span style={{
            color: idx === items.length - 1 ? S.text : S.textMuted,
            fontWeight: idx === items.length - 1 ? 600 : 400
          }}>
            {item}
          </span>
        </span>
      ))}
    </div>
  );
}