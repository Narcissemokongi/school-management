// src/components/SuperAdmin/schools/SchoolsToolbar.jsx
import { Search, X, Table, LayoutGrid, Download, Printer, CheckSquare, Square } from "lucide-react";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";

export function SchoolsToolbar({
  searchTerm,
  setSearchTerm,
  schoolFilter,
  setSchoolFilter,
  schoolView,
  setSchoolView,
  onExport,
  onPrint,
  stats = { total: 0, active: 0, suspended: 0 },
  selectedCount = 0,
  onSelectAll,
  allVisibleSelected = false,
}) {
  const t = useTokens();
  const isMobile = useIsMobile();

  const filters = [
    { id: "all", label: "Toutes" },
    { id: "active", label: "Actives" },
    { id: "suspendue", label: "Suspendues" },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: isMobile ? "stretch" : "center",
        gap: 12,
        marginBottom: 20,
        flexWrap: "wrap",
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      {/* Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: t.surface.default,
          borderRadius: t.radius.sm,
          padding: isMobile ? "10px 12px" : "8px 12px",
          border: `1px solid ${t.border.default}`,
          flex: 1,
          minWidth: isMobile ? "100%" : 200,
          gap: 8,
        }}
      >
        <Search size={18} color={t.text.muted} />
        <input
          placeholder="Rechercher une école..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            border: "none",
            outline: "none",
            fontSize: isMobile ? 16 : 14,
            width: "100%",
            background: "transparent",
            color: t.text.primary,
            fontFamily: t.font.family,
          }}
          aria-label="Rechercher une école"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}
            aria-label="Effacer la recherche"
          >
            <X size={16} color={t.text.muted} />
          </button>
        )}
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: 12,
          fontSize: isMobile ? 12 : 13,
          color: t.text.muted,
          flexWrap: "wrap",
          justifyContent: isMobile ? "space-between" : "flex-start",
        }}
      >
        <span>
          <strong style={{ color: t.text.primary }}>{stats.total}</strong> total
        </span>
        <span>
          <strong style={{ color: "#10B981" }}>{stats.active}</strong> actives
        </span>
        <span>
          <strong style={{ color: "#F59E0B" }}>{stats.suspended}</strong> suspendues
        </span>
      </div>

      {/* Filtres */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexDirection: isMobile ? "column" : "row",
          width: isMobile ? "100%" : "auto",
        }}
      >
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSchoolFilter(f.id)}
            aria-pressed={schoolFilter === f.id}
            style={{
              padding: isMobile ? "10px 12px" : "8px 16px",
              borderRadius: t.radius.sm,
              border: `1px solid ${t.border.default}`,
              background: schoolFilter === f.id ? t.accent.primary : "transparent",
              color: schoolFilter === f.id ? "#FFFFFF" : t.text.muted,
              fontWeight: schoolFilter === f.id ? 600 : 400,
              cursor: "pointer",
              fontSize: isMobile ? 14 : 13,
              width: isMobile ? "100%" : "auto",
              fontFamily: t.font.family,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Vue */}
      <div style={{ display: "flex", gap: 6, width: isMobile ? "100%" : "auto", justifyContent: "space-between" }}>
        <ToolbarToggle
          active={schoolView === "table"}
          onClick={() => setSchoolView("table")}
          icon={<Table size={18} />}
          label="Vue tableau"
        />
        <ToolbarToggle
          active={schoolView === "cards"}
          onClick={() => setSchoolView("cards")}
          icon={<LayoutGrid size={18} />}
          label="Vue cartes"
        />
      </div>

      {/* Export */}
      <div style={{ display: "flex", gap: 6, width: isMobile ? "100%" : "auto", justifyContent: "space-between" }}>
        <ToolbarToggle onClick={onExport} icon={<Download size={18} />} label="Exporter" />
        <ToolbarToggle onClick={onPrint} icon={<Printer size={18} />} label="Imprimer" />
      </div>

      {/* Select all */}
      {selectedCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <span style={{ fontSize: 13, color: t.text.muted }}>
            {selectedCount} sélectionnée(s)
          </span>
          <button
            type="button"
            onClick={onSelectAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              background: "transparent",
              border: `1px solid ${t.border.default}`,
              borderRadius: t.radius.sm,
              cursor: "pointer",
              fontSize: 13,
              color: t.text.primary,
              fontFamily: t.font.family,
            }}
          >
            {allVisibleSelected ? <CheckSquare size={14} /> : <Square size={14} />} Tout
          </button>
        </div>
      )}
    </div>
  );
}

function ToolbarToggle({ active = false, onClick, icon, label }) {
  const t = useTokens();
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      style={{
        padding: 10,
        borderRadius: t.radius.sm,
        border: `1px solid ${t.border.default}`,
        background: active ? t.accent.primary : "transparent",
        color: active ? "#FFFFFF" : t.text.muted,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        outline: "none",
      }}
    >
      {icon}
    </button>
  );
}