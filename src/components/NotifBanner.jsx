export function NotifBanner({ notifs }) {
  if (!notifs.length) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 500, zIndex: 9999, pointerEvents: "none" }}>
      {notifs.map((n, i) => (
        <div key={i} style={{ background: "#ef4444", color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, animation: "slideDown .4s ease", borderRadius: 12, margin: "4px 8px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Alerte disciplinaire</div>
            <div style={{ fontSize: 13, opacity: 0.95 }}>{n}</div>
          </div>
        </div>
      ))}
    </div>
  );
}