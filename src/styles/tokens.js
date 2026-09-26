// src/theme/tokens.js
import { useMemo } from "react";
import { useStyles } from "@/styles/theme";

export function getTokens(dark) {
  return {
    text: {
      primary: dark ? "#F1F5F9" : "#1E293B",
      secondary: dark ? "#CBD5E1" : "#64748B",
      muted: dark ? "#94A3B8" : "#64748B",
      disabled: dark ? "#475569" : "#CBD5E1",
      inverse: dark ? "#1E293B" : "#F1F5F9",
      onPrimary: "#FFFFFF",
    },
    surface: {
      page: dark ? "#0F172A" : "#F8FAFC",
      default: dark ? "#1E293B" : "#FFFFFF",
      elevated: dark ? "#26334D" : "#FFFFFF",
      hover: dark ? "#26334D" : "#F8FAFC",
      input: dark ? "#0F172A" : "#F9FAFB",
      sidebar: dark ? "#0F172A" : "#FFFFFF",
      overlay: "rgba(15, 23, 42, 0.55)",
    },
    border: {
      default: dark ? "#334155" : "#E2E8F0",
      subtle: dark ? "#1E293B" : "#F1F5F9",
      focus: dark ? "#818CF8" : "#4F46E5",
      danger: "#EF4444",
    },
    accent: {
      primary: dark ? "#818CF8" : "#4F46E5",
      primaryHover: dark ? "#6366F1" : "#4338CA",
      primarySoft: dark ? "#312E81" : "#EEF2FF",
      secondary: dark ? "#A5B4FC" : "#6366F1",
    },
    status: {
      success: { fg: dark ? "#34D399" : "#065F46", bg: dark ? "#064E3B" : "#D1FAE5", border: dark ? "#065F46" : "#A7F3D0" },
      warning: { fg: dark ? "#FBBF24" : "#92400E", bg: dark ? "#78350F" : "#FEF3C7", border: dark ? "#92400E" : "#FDE68A" },
      danger: { fg: dark ? "#F87171" : "#B91C1C", bg: dark ? "#7F1D1D" : "#FEE2E2", border: dark ? "#991B1B" : "#FECACA" },
      info: { fg: dark ? "#38BDF8" : "#0369A1", bg: dark ? "#082F49" : "#E0F2FE", border: dark ? "#075985" : "#BAE6FD" },
      neutral: { fg: dark ? "#CBD5E1" : "#475569", bg: dark ? "#334155" : "#F1F5F9", border: dark ? "#475569" : "#E2E8F0" },
    },
    role: {
      admin: { fg: dark ? "#A5B4FC" : "#4338CA", bg: dark ? "#312E81" : "#EEF2FF" },
      superAdmin: { fg: dark ? "#FCA5A5" : "#B91C1C", bg: dark ? "#7F1D1D" : "#FEE2E2" },
      directeur: { fg: dark ? "#D8B4FE" : "#7E22CE", bg: dark ? "#581C87" : "#F3E8FF" },
      enseignant: { fg: dark ? "#86EFAC" : "#15803D", bg: dark ? "#14532D" : "#DCFCE7" },
      parent: { fg: dark ? "#FDBA74" : "#C2410C", bg: dark ? "#7C2D12" : "#FFEDD5" },
      eleve: { fg: dark ? "#67E8F9" : "#0E7490", bg: dark ? "#164E63" : "#CFFAFE" },
      disciplinaire: { fg: dark ? "#FCA5A5" : "#B91C1C", bg: dark ? "#7F1D1D" : "#FEE2E2" },
      comptable: { fg: dark ? "#5EEAD4" : "#0F766E", bg: dark ? "#134E4A" : "#CCFBF1" },
    },
    space: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
    radius: { sm: 6, md: 10, lg: 16, xl: 20, full: 9999 },
    shadow: {
      none: "none",
      sm: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      md: dark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.1)",
      lg: dark ? "0 20px 40px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.15)",
    },
    font: {
      family: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      mono: "ui-monospace, 'SF Mono', Menlo, monospace",
      size: { xs: 11, sm: 12, md: 14, lg: 16, xl: 18, xxl: 22, xxxl: 28 },
      weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    },
    transition: { fast: "0.15s ease", normal: "0.2s ease", slow: "0.3s ease" },
    breakpoint: { mobile: 768, tablet: 1024, desktop: 1280 },
  };
}

export function useTokens() {
  const { dark } = useStyles();
  return useMemo(() => getTokens(dark), [dark]);
}