
import { api } from "../../../convex/_generated/api";
import { useStyles } from "../../styles/theme";
export function StatCard({ icon, value, label, color }) {
  return (
    <div style={{
      background: "#FFF",
      borderRadius: 16,
      padding: 20,
      display: "flex",
      alignItems: "center",
      gap: 16,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      transition: "transform 0.2s",
      cursor: "default"
    }}>
      <div style={{ width: 48, height: 48, background: `${color}15`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#1E293B" }}>{value ?? "—"}</div>
        <div style={{ fontSize: 14, color: "#64748B" }}>{label}</div>
      </div>
    </div>
  );
}