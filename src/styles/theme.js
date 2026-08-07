import { useTheme } from "../components/ThemeProvider";
export const theme = {
  bg: "#f5f7fb",
  card: "#ffffff",
  accent: "#4f46e5",
  accentLight: "#6366f1",
  danger: "#ef4444",
  warning: "#f59e0b",
  success: "#10b981",
  text: "#1e293b",
  grave: "#ef4444",
  moyenne: "#f59e0b",
  legere: "#10b981",
  radius: "16px",
  radiusSm: "12px",
};

export const graviteColor = (g) =>
  g === "Grave" ? theme.grave : g === "Moyenne" ? theme.warning : theme.success;

export const getStyles = (dark) => ({
  wrapper: {
    minHeight: "100vh",
    backgroundColor: dark ? "#0f172a" : "#f5f7fb",
    fontFamily: "'Inter', 'Poppins', sans-serif",
    color: dark ? "#e2e8f0" : "#1e293b",
    display: "flex",
    flexDirection: "column"
  },
  navbar: {
    background: dark ? "#1e293b" : "#ffffff",
    borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 20px",
    height: 64,
    position: "sticky",
    top: 0,
    zIndex: 100,
    flexWrap: "wrap"
  },
  navbarBrand: {
    fontWeight: 800,
    fontSize: 20,
    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginRight: 20
  },
  navTabs: {
    display: "flex",
    gap: 8,
    flex: 1,
    justifyContent: "center",
    overflowX: "auto"
  },
  tab: (active) => ({
    padding: "8px 16px",
    borderRadius: 20,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    color: active ? "#fff" : dark ? "#cbd5e1" : "#64748b",
    background: active ? "#4f46e5" : "transparent",
    border: "none",
    transition: "all 0.2s",
    whiteSpace: "nowrap"
  }),
  bottomNav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: dark ? "#1e293b" : "#ffffff",
    borderTop: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
    display: "flex",
    justifyContent: "space-around",
    padding: "8px 0",
    zIndex: 100
  },
  bottomTab: (active) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    color: active ? "#4f46e5" : dark ? "#cbd5e1" : "#64748b",
    fontWeight: active ? 700 : 500,
    fontSize: 11,
    background: "none",
    border: "none",
    cursor: "pointer",
    flex: 1
  }),
  main: {
    flex: 1,
    width: "100%",
    maxWidth: 900,
    margin: "0 auto",
    padding: "20px 20px 100px",
    display: "flex",
    flexDirection: "column",
    gap: 20
  },
  card: {
    background: dark ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 20,
    boxShadow: dark ? "0 4px 6px -1px rgba(0,0,0,0.3)" : "0 4px 6px -1px rgba(0,0,0,0.05)",
    border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`
  },
  input: {
    width: "100%",
    border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 15,
    backgroundColor: dark ? "#0f172a" : "#f9fafb",
    color: dark ? "#e2e8f0" : "#1e293b",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 12
  },
  select: {
    width: "100%",
    border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 15,
    backgroundColor: dark ? "#0f172a" : "#f9fafb",
    color: dark ? "#e2e8f0" : "#1e293b",
    outline: "none",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 16px center",
    backgroundSize: 16,
    marginBottom: 12,
    boxSizing: "border-box"
  },
  btn: (color = "#4f46e5") => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "12px 24px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    transition: "background 0.2s"
  }),
  btnSm: (color = "#4f46e5") => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer"
  }),
  badge: (color) => ({
    background: color + "18",
    color: color,
    border: `1px solid ${color}40`,
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: 4
  }),
  label: {
    fontSize: 13,
    color: dark ? "#cbd5e1" : "#64748b",
    marginBottom: 6,
    display: "block",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  h2: {
    fontSize: 24,
    fontWeight: 800,
    marginBottom: 4,
    color: dark ? "#f1f5f9" : "#1e293b"
  },
  h3: {
    fontSize: 16,
    fontWeight: 700,
    color: dark ? "#e2e8f0" : "#1e293b",
    marginBottom: 2
  },
  muted: {
    fontSize: 13,
    color: dark ? "#94a3b8" : "#64748b"
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 10
  },
  between: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  cardBorder: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
  textMuted: dark ? "#94a3b8" : "#64748b",
  textDim: dark ? "#94a3b8" : "#94a3b8",
  shadow: dark ? "0 4px 6px -1px rgba(0,0,0,0.3)" : "0 4px 6px -1px rgba(0,0,0,0.05)",
});

export function useStyles() {
  const { dark, toggle } = useTheme();
  const S = getStyles(dark);
  return { S, dark, toggle };
}