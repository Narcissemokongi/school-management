import { useState, useMemo, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

export function DataTable({
  columns = [],
  data = [],
  loading = false,
  searchPlaceholder = "Rechercher...",
  pageSize = 10,
  emptyTitle = "Aucune donnée",
  emptyMessage = "Aucun élément à afficher.",
  searchable = true,
  rowKey = "_id",
}) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile();

  // ==================== ÉTATS ====================
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page quand la recherche change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, data.length]);

  // ==================== COULEURS ====================
  const headerBg = dark ? "#0F172A" : "#F8FAFC";
  const headerText = dark ? "#CBD5E1" : "#475569";
  const headerBorder = dark ? "#334155" : "#E2E8F0";
  const rowBorder = dark ? "#1E293B" : "#E2E8F0";
  const rowEven = dark ? "#0F172A" : "#FFFFFF";
  const rowOdd = dark ? "#111827" : "#FAFBFC";
  const cellText = dark ? "#F1F5F9" : "#1E293B";
  const iconColor = dark ? "#94A3B8" : "#64748B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const mutedText = dark ? "#94A3B8" : "#64748B";

  // ==================== COLONNES VISIBLES ====================
  const visibleColumns = useMemo(() => {
    if (!isMobile) return columns;
    return columns.filter((col) => !col.hideOnMobile);
  }, [columns, isMobile]);

  // ==================== FILTRAGE ====================
  const filteredData = useMemo(() => {
    if (!debouncedSearch.trim()) return data;
    const q = debouncedSearch.toLowerCase().trim();
    return data.filter((row) =>
      columns.some((col) => {
        if (!col.accessor) return false;
        const val = row[col.accessor];
        if (val == null) return false;
        return String(val).toLowerCase().includes(q);
      })
    );
  }, [data, debouncedSearch, columns]);

  // ==================== TRI ====================
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      // Comparaison numérique si les deux sont des nombres
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDir === "asc" ? valA - valB : valB - valA;
      }
      // Sinon comparaison alphabétique
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDir === "asc" ? -1 : 1;
      if (strA > strB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDir]);

  // ==================== PAGINATION ====================
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // ==================== HANDLERS ====================
  const handleSort = (accessor) => {
    if (!accessor) return;
    if (sortKey === accessor) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(accessor);
      setSortDir("asc");
    }
  };

  const goToPage = (page) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
  };

  // ==================== STYLES RESPONSIVES ====================
  const cellPadding = isMobile ? "8px 10px" : "12px 14px";
  const headerPadding = isMobile ? "10px 10px" : "12px 14px";
  const fontSize = isMobile ? 13 : 14;

  // ==================== LOADING ====================
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={40} />
        ))}
      </div>
    );
  }

  // ==================== EMPTY ====================
  if (!loading && filteredData.length === 0) {
    return (
      <>
        {searchable && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <label htmlFor="datatable-search" style={{ display: "none" }}>
              Rechercher
            </label>
            <Search size={18} color={iconColor} aria-hidden="true" />
            <input
              id="datatable-search"
              type="search"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                marginBottom: 0,
                flex: 1,
                fontSize: isMobile ? 16 : 14,
                padding: isMobile ? "10px 12px" : "8px 12px",
                borderRadius: 8,
                border: `1px solid ${rowBorder}`,
                background: dark ? "#0F172A" : "#FFFFFF",
                color: cellText,
                outline: "none",
              }}
              aria-label={searchPlaceholder}
            />
          </div>
        )}
        <EmptyState title={emptyTitle} message={emptyMessage} />
      </>
    );
  }

  // ==================== RENDU PRINCIPAL ====================
  return (
    <div>
      {/* Barre de recherche */}
      {searchable && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <label htmlFor="datatable-search" style={{ display: "none" }}>
            Rechercher
          </label>
          <Search size={18} color={iconColor} aria-hidden="true" />
          <input
            id="datatable-search"
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              marginBottom: 0,
              flex: 1,
              fontSize: isMobile ? 16 : 14,
              padding: isMobile ? "10px 12px" : "8px 12px",
              borderRadius: 8,
              border: `1px solid ${rowBorder}`,
              background: dark ? "#0F172A" : "#FFFFFF",
              color: cellText,
              outline: "none",
            }}
            aria-label={searchPlaceholder}
          />
        </div>
      )}

      {/* Résumé */}
      <div
        style={{
          fontSize: isMobile ? 12 : 13,
          color: mutedText,
          marginBottom: 8,
        }}
      >
        {filteredData.length} résultat{filteredData.length > 1 ? "s" : ""}
        {totalPages > 1 ? ` · page ${currentPage}/${totalPages}` : ""}
      </div>

      {/* Tableau avec défilement horizontal */}
      <div
        style={{
          overflowX: "auto",
          maxWidth: "100%",
          borderRadius: 8,
          border: `1px solid ${rowBorder}`,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: isMobile ? 500 : "auto",
            borderCollapse: "collapse",
            fontSize,
          }}
        >
          <thead>
            <tr
              style={{
                background: headerBg,
                borderBottom: `2px solid ${headerBorder}`,
              }}
            >
              {visibleColumns.map((col) => {
                const isSortable = col.sortable !== false && col.accessor;
                const isActive = sortKey === col.accessor;
                return (
                  <th
                    key={col.accessor || col.header}
                    onClick={() => isSortable && handleSort(col.accessor)}
                    style={{
                      padding: headerPadding,
                      textAlign: col.align || "left",
                      fontWeight: 600,
                      color: headerText,
                      cursor: isSortable ? "pointer" : "default",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                    }}
                    aria-sort={
                      isActive
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    aria-label={
                      isSortable ? `Trier par ${col.header}` : col.header
                    }
                    tabIndex={isSortable ? 0 : -1}
                    onKeyDown={(e) => {
                      if (isSortable && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        handleSort(col.accessor);
                      }
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        justifyContent:
                          col.align === "right"
                            ? "flex-end"
                            : col.align === "center"
                            ? "center"
                            : "flex-start",
                      }}
                    >
                      {col.header}
                      {isActive &&
                        (sortDir === "asc" ? (
                          <ChevronUp size={14} aria-hidden="true" />
                        ) : (
                          <ChevronDown size={14} aria-hidden="true" />
                        ))}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr
                key={row[rowKey] || row._id || idx}
                style={{
                  borderBottom: `1px solid ${rowBorder}`,
                  background: idx % 2 === 0 ? rowEven : rowOdd,
                }}
              >
                {visibleColumns.map((col) => (
                  <td
                    key={col.accessor || col.header}
                    style={{
                      padding: cellPadding,
                      color: cellText,
                      textAlign: col.align || "left",
                    }}
                  >
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: isMobile ? 12 : 13,
              color: mutedText,
            }}
          >
            Page {currentPage} sur {totalPages}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Page précédente"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: isMobile ? "10px 12px" : "8px 12px",
                borderRadius: 8,
                border: `1px solid ${rowBorder}`,
                background: dark ? "#0F172A" : "#FFFFFF",
                color: currentPage <= 1 ? mutedText : cellText,
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                opacity: currentPage <= 1 ? 0.5 : 1,
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label="Page suivante"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: isMobile ? "10px 12px" : "8px 12px",
                borderRadius: 8,
                border: `1px solid ${rowBorder}`,
                background: dark ? "#0F172A" : "#FFFFFF",
                color: currentPage >= totalPages ? mutedText : cellText,
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                opacity: currentPage >= totalPages ? 0.5 : 1,
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}