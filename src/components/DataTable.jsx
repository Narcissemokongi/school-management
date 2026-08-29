import { useState, useMemo, useEffect } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useStyles } from "../styles/theme";

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

  // Couleurs adaptatives
  const headerBg = dark ? "#0f172a" : "#f8fafc";
  const headerBorder = dark ? "#334155" : "#e2e8f0";
  const headerText = dark ? "#cbd5e1" : "#475569";
  const rowEven = dark ? "#1e293b" : "#ffffff";
  const rowOdd = dark ? "#0f172a" : "#f9fafb";
  const rowBorder = dark ? "#334155" : "#e2e8f0";
  const cellText = dark ? "#f1f5f9" : "#334155";
  const iconColor = dark ? "#94a3b8" : "#94a3b8";
  const paginationBg = dark ? "#1e293b" : "#ffffff";
  const paginationBorder = dark ? "#334155" : "#e2e8f0";

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearch = useDebounce(search, 200);

  // Filtrage
  const filteredData = useMemo(() => {
    if (!debouncedSearch) return data;
    return data.filter((row) =>
      columns.some((col) => {
        if (!col.accessor) return false;
        const val = row[col.accessor];
        return String(val)
          .toLowerCase()
          .includes(debouncedSearch.toLowerCase());
      })
    );
  }, [data, debouncedSearch, columns]);

  // Tri
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = columns.find((c) => c.accessor === sortKey)?.sortValue
        ? columns.find((c) => c.accessor === sortKey).sortValue(a)
        : a[sortKey] ?? "";
      const bVal = columns.find((c) => c.accessor === sortKey)?.sortValue
        ? columns.find((c) => c.accessor === sortKey).sortValue(b)
        : b[sortKey] ?? "";

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: "base" })
        : String(bVal).localeCompare(String(aVal), undefined, { numeric: true, sensitivity: "base" });
    });
  }, [filteredData, sortKey, sortDir, columns]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

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
          style={{ ...S.input, marginBottom: 0, flex: 1 }}
          aria-label={searchPlaceholder}
        />
      </div>

      {/* Résumé des résultats */}
      <div style={{ fontSize: 13, color: S.textMuted, marginBottom: 8 }}>
        {filteredData.length} résultat(s)
      </div>

      {/* Tableau */}
      <div style={{ overflowX: "auto", maxWidth: "100%", borderRadius: 8, border: `1px solid ${rowBorder}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: headerBg, borderBottom: `2px solid ${headerBorder}` }}>
              {columns.map((col) => {
                const isSortable = col.sortable !== false && col.accessor;
                const isActive = sortKey === col.accessor;
                return (
                  <th
                    key={col.accessor || col.header}
                    onClick={() => isSortable && handleSort(col.accessor)}
                    style={{
                      padding: "10px 12px",
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
                {columns.map((col) => (
                  <td
                    key={col.accessor || col.header}
                    style={{ padding: "10px 12px", color: cellText }}
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
        <nav aria-label="Pagination du tableau" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 }}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Page précédente"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: paginationBg,
              border: `1px solid ${paginationBorder}`,
              borderRadius: 8,
              padding: "6px 12px",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              color: currentPage === 1 ? "#94a3b8" : dark ? "#f1f5f9" : "#1e293b",
              opacity: currentPage === 1 ? 0.5 : 1,
            }}
          >
            <ChevronLeft size={16} /> Précédent
          </button>
          <span style={{ fontSize: 13, color: S.textMuted }} aria-live="polite">
            Page {currentPage} sur {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="Page suivante"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: paginationBg,
              border: `1px solid ${paginationBorder}`,
              borderRadius: 8,
              padding: "6px 12px",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              color: currentPage === totalPages ? "#94a3b8" : dark ? "#f1f5f9" : "#1e293b",
              opacity: currentPage === totalPages ? 0.5 : 1,
            }}
          >
            Suivant <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </div>
  );
}