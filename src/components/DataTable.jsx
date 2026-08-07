import { useState, useMemo } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { ChevronUp, ChevronDown, Search } from "lucide-react";
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
  const rowEven = dark ? "#1e293b" : "#fff";
  const rowOdd = dark ? "#0f172a" : "#f9fafb";
  const rowBorder = dark ? "#334155" : "#e2e8f0";
  const cellText = dark ? "#f1f5f9" : "#334155";
  const iconColor = dark ? "#94a3b8" : "#94a3b8";

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
        const val = col.accessor ? row[col.accessor] : "";
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
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredData, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc")); // correction : toggle correct
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

      {/* Tableau */}
      <div style={{ overflowX: "auto", maxWidth: "100%" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: headerBg, borderBottom: `2px solid ${headerBorder}` }}>
              {columns.map((col) => {
                const isSortable = col.sortable !== false;
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
            style={{ ...S.btnSm(S.textMuted), width: "auto" }}
          >
            ← Précédent
          </button>
          <span style={{ fontSize: 13, color: S.textMuted }} aria-live="polite">
            Page {currentPage} sur {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="Page suivante"
            style={{ ...S.btnSm(S.textMuted), width: "auto" }}
          >
            Suivant →
          </button>
        </nav>
      )}
    </div>
  );
}