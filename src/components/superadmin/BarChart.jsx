import { api } from "../../../convex/_generated/api";
import { useStyles } from "../../styles/theme";
export function BarChart({ data, maxValue }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {data.map(item => (
        <div key={item._id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 100, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nom}</div>
          <div style={{ flex: 1, background: "#F1F5F9", borderRadius: 6, height: 20, overflow: "hidden" }}>
            <div style={{
              width: `${(item.userCount / maxValue) * 100}%`,
              height: "100%",
              background: "linear-gradient(90deg, #4F46E5, #7C3AED)",
              borderRadius: 6,
              minWidth: 4
            }} />
          </div>
          <div style={{ width: 30, textAlign: "right", fontSize: 13, fontWeight: 600 }}>{item.userCount}</div>
        </div>
      ))}
    </div>
  );
}