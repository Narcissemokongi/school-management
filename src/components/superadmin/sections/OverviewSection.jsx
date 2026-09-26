// src/components/SuperAdmin/sections/OverviewSection.jsx
import { OverviewTab } from "../OverviewTab";

export function OverviewSection({ stats, ecoles, user, onNavigate, onRefresh }) {
  return (
    <OverviewTab
      globalStats={stats}
      ecolesAvecUsers={ecoles}
      onNavigate={onNavigate}
      onRefresh={onRefresh}
      user={user}
    />
  );
}