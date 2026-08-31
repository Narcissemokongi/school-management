import { useState, useMemo, useEffect } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile";

export function DataTable({
  columns = [],
  data = [],
  loading = false,
  searchPlaceholder = "Rechercher...",
  pageSize = 10,
  emptyTitle,
  emptyMessage,
}) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile(); // détection mobile

  // Couleurs adaptatives (inchangées)
  const headerBg = dark ? "#0f172a" : "#f8fafc";
  // ... autres constantes inchangées

  // Filtrer les colonnes à afficher sur mobile (celles avec hideOnMobile sont masquées)
  const visibleColumns = useMemo(() => {
    if (!isMobile) return columns;
    return columns.filter(col => !col.hideOnMobile);
  }, [columns, isMobile]);

  // ... reste du code identique, mais en utilisant visibleColumns pour le rendu

  // Ajustements responsives
  const cellPadding = isMobile ? "8px 6px" : "10px 12px";
  const fontSize = isMobile ? 13 : 14;
  const headerPadding = isMobile ? "8px 6px" : "10px 12px";

  // ... dans le rendu du tableau, utilisez visibleColumns et les nouveaux styles

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={40} />
        ))}
      </div>
    );
  }

  if (!loading && filteredData.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div>
      {/* Barre de recherche */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <label htmlFor="datatable-search" style={{ display: "none" }}>Rechercher</label>
        <Search size={18} color={iconColor} aria-hidden="true" />
        <input
          id="datatable-search"
          type="search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          style={{ ...S.input, marginBottom: 0, flex: 1, fontSize: isMobile ? 16 : 14 }} // 16px pour éviter le zoom iOS
          aria-label={searchPlaceholder}
        />
      </div>

      {/* Résumé des résultats */}
      <div style={{ fontSize: isMobile ? 12 : 13, color: S.textMuted, marginBottom: 8 }}>
        {filteredData.length} résultat(s)
      </div>

      {/* Tableau avec défilement horizontal */}
      <div style={{ overflowX: "auto", maxWidth: "100%", borderRadius: 8, border: `1px solid ${rowBorder}`, WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", minWidth: isMobile ? 600 : "auto", borderCollapse: "collapse", fontSize: fontSize }}>
          <thead>
            <tr style={{ background: headerBg, borderBottom: `2px solid ${headerBorder}` }}>
              {visibleColumns.map((col) => {
                const isSortable = col.sortable !== false && col.accessor;
                const isActive = sortKey === col.accessor;
                return (
                  <th
                    key={col.accessor || col.header}
                    onClick={() => isSortable && handleSort(col.accessor)}
                    style={{
                      padding: headerPadding,
                      textAlign: "left",
                      fontWeight: 600,
                      color: headerText,
                      cursor: isSortable ? "pointer" : "default",
                      userSelect: "none",
                    }}
                    aria-sort={isActive ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    aria-label={isSortable ? `Trier par ${col.header}` : col.header}
                    tabIndex={isSortable ? 0 : -1}
                    onKeyDown={(e) => {
                      if (isSortable && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        handleSort(col.accessor);
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {col.header}
                      {isActive &&
                        (sortDir === "asc" ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr
                key={row._id || idx}
                style={{
                  borderBottom: `1px solid ${rowBorder}`,
                  background: idx % 2 === 0 ? rowEven : rowOdd,
                }}
              >
                {visibleColumns.map((col) => (
                  <td
                    key={col.accessor || col.header}
                    style={{ padding: cellPadding, color: cellText }}
                  >
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination inchangée */}
      {/* ... */}
    </div>
  );
}