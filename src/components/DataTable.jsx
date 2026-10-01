// src/components/DataTable.jsx
import { useState, useMemo, useEffect, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { IconButton } from "@/components/ui";
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Search, ChevronLeft, ChevronRight,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// SearchBar — avec inputMode search mobile
// ════════════════════════════════════════════════════════════════════
function SearchBar({ value, onChange, placeholder }) {
  const t = useTokens();
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: isMobile ? "10px 12px" : "8px 12px",
        borderRadius: t.radius.sm,
        border: `1px solid ${t.border.default}`,
        background: t.surface.default,
        marginBottom: 12,
        // ✨ Min height mobile
        minHeight: isMobile ? 44 : undefined,
        boxSizing: "border-box",
      }}
    >
      <Search size={18} color={t.text.muted} aria-hidden="true" />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-label={placeholder}
        // ✨ Clavier mobile avec loupe
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          color: t.text.primary,
          // ✨ 16px évite le zoom iOS
          fontSize: isMobile ? 16 : 14,
          fontFamily: t.font.family,
          WebkitAppearance: "none",
          minWidth: 0,
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Cellule d'en-tête — composant isolé (feedback tap + a11y)
// ════════════════════════════════════════════════════════════════════
function TableHeaderCell({
  col,
  isSortable,
  isActive,
  sortDir,
  onSort,
  headerPadding,
  t,
  isMobile,
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <th
      onClick={() => isSortable && onSort(col.accessor)}
      tabIndex={isSortable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isSortable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSort(col.accessor);
        }
      }}
      onTouchStart={() => isSortable && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      aria-sort={
        isActive
          ? sortDir === "asc"
            ? "ascending"
            : "descending"
          : isSortable
          ? "none"
          : undefined
      }
      aria-label={isSortable ? `Trier par ${col.header}` : undefined}
      style={{
        padding: headerPadding,
        textAlign: col.align || "left",
        fontWeight: 600,
        color: t.text.secondary,
        cursor: isSortable ? "pointer" : "default",
        userSelect: "none",
        whiteSpace: "nowrap",
        outline: "none",
        // ✨ Min height mobile
        minHeight: isMobile ? 44 : undefined,
        // ✨ Feedback tap
        background: pressed ? t.surface.hover : "transparent",
        transition: "background 0.12s ease",
        // ✨ Neutralise flash + délai
        WebkitTapHighlightColor: "transparent",
        touchAction: isSortable ? "manipulation" : undefined,
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
        {isSortable &&
          (isActive ? (
            sortDir === "asc" ? (
              <ChevronUp size={14} aria-hidden="true" />
            ) : (
              <ChevronDown size={14} aria-hidden="true" />
            )
          ) : (
            <ChevronsUpDown
              size={14}
              style={{ opacity: 0.4 }}
              aria-hidden="true"
            />
          ))}
      </div>
    </th>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
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
  const t = useTokens();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // ✨ Détection scroll horizontal (indicateur visuel)
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollContainer, setScrollContainer] = useState(null);

  // ✨ Ref callback pour détecter les changements de largeur
  const handleScrollRef = useCallback((node) => {
    setScrollContainer(node);
  }, []);

  useEffect(() => {
    if (!scrollContainer) return;

    const check = () => {
      const canScroll =
        scrollContainer.scrollWidth > scrollContainer.clientWidth + 2;
      const isAtEnd =
        scrollContainer.scrollLeft + scrollContainer.clientWidth >=
        scrollContainer.scrollWidth - 4;
      setCanScrollRight(canScroll && !isAtEnd);
    };

    check();
    scrollContainer.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);

    // Observer les changements de taille de contenu
    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(check)
      : null;
    if (ro) ro.observe(scrollContainer);

    return () => {
      scrollContainer.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      ro?.disconnect();
    };
  }, [scrollContainer, data, columns]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, sortKey, sortDir]);

  // ────────────────────────────────────────────────────────────
  // Colonnes visibles
  // ────────────────────────────────────────────────────────────
  const visibleColumns = useMemo(() => {
    if (!isMobile) return columns;
    return columns.filter((col) => !col.hideOnMobile);
  }, [columns, isMobile]);

  // ────────────────────────────────────────────────────────────
  // Filtrage
  // ────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────
  // Tri
  // ────────────────────────────────────────────────────────────
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDir === "asc" ? valA - valB : valB - valA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDir === "asc" ? -1 : 1;
      if (strA > strB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDir]);

  // ────────────────────────────────────────────────────────────
  // Pagination
  // ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safePage, pageSize]);

  // ────────────────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────────────────
  const handleSort = useCallback(
    (accessor) => {
      if (!accessor) return;
      if (sortKey === accessor) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(accessor);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const goToPage = useCallback(
    (page) => {
      const p = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(p);
    },
    [totalPages]
  );

  // ────────────────────────────────────────────────────────────
  // Styles
  // ────────────────────────────────────────────────────────────
  const cellPadding = isMobile ? "10px 10px" : "12px 14px";
  const headerPadding = isMobile ? "10px 10px" : "12px 14px";
  const fontSize = isMobile ? 13 : 14;

  // ────────────────────────────────────────────────────────────
  // LOADING
  // ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={40} />
        ))}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // EMPTY
  // ────────────────────────────────────────────────────────────
  if (!loading && filteredData.length === 0) {
    return (
      <>
        {searchable && (
          <SearchBar
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
          />
        )}
        <EmptyState title={emptyTitle} message={emptyMessage} />
      </>
    );
  }

  // ────────────────────────────────────────────────────────────
  // RENDU PRINCIPAL
  // ────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Barre de recherche */}
      {searchable && (
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
        />
      )}

      {/* Résumé */}
      <div
        aria-live="polite"
        style={{
          fontSize: isMobile ? 12 : 13,
          color: t.text.muted,
          marginBottom: 8,
        }}
      >
        {filteredData.length} résultat{filteredData.length > 1 ? "s" : ""}
        {totalPages > 1 ? ` · page ${safePage}/${totalPages}` : ""}
      </div>

      {/* ✨ Wrapper relatif pour indicateur de scroll */}
      <div style={{ position: "relative" }}>
        {/* Tableau scrollable */}
        <div
          ref={handleScrollRef}
          style={{
            overflowX: "auto",
            maxWidth: "100%",
            borderRadius: t.radius.sm,
            border: `1px solid ${t.border.default}`,
            WebkitOverflowScrolling: "touch",
            // ✨ Empêche pull-to-refresh parent
            overscrollBehaviorX: "contain",
            // ✨ Masque scrollbar visuelle (desktop garde)
            scrollbarWidth: isMobile ? "none" : "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize,
              fontFamily: t.font.family,
            }}
          >
            <thead>
              <tr
                style={{
                  background: t.surface.hover,
                  borderBottom: `2px solid ${t.border.default}`,
                }}
              >
                {visibleColumns.map((col) => {
                  const isSortable = col.sortable !== false && col.accessor;
                  const isActive = sortKey === col.accessor;
                  return (
                    <TableHeaderCell
                      key={col.accessor || col.header}
                      col={col}
                      isSortable={isSortable}
                      isActive={isActive}
                      sortDir={sortDir}
                      onSort={handleSort}
                      headerPadding={headerPadding}
                      t={t}
                      isMobile={isMobile}
                    />
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => (
                <tr
                  key={row[rowKey] || row._id || idx}
                  style={{
                    borderBottom: `1px solid ${t.border.subtle}`,
                    // ✨ Lignes alternées uniquement sur desktop
                    background: isMobile
                      ? t.surface.default
                      : idx % 2 === 0
                      ? t.surface.default
                      : t.surface.hover,
                  }}
                >
                  {visibleColumns.map((col) => (
                    <td
                      key={col.accessor || col.header}
                      style={{
                        padding: cellPadding,
                        color: t.text.primary,
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

        {/* ✨ Fade gradient → indique scroll horizontal possible */}
        {isMobile && canScrollRight && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 32,
              background: `linear-gradient(to right, transparent, ${t.surface.default} 90%)`,
              pointerEvents: "none",
              borderTopRightRadius: t.radius.sm,
              borderBottomRightRadius: t.radius.sm,
            }}
          />
        )}
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
          <div style={{ fontSize: isMobile ? 12 : 13, color: t.text.muted }}>
            Page {safePage} sur {totalPages}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <IconButton
              icon={<ChevronLeft size={16} />}
              label="Page précédente"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 1}
              variant="outline"
              size={isMobile ? "lg" : "md"}
            />
            <IconButton
              icon={<ChevronRight size={16} />}
              label="Page suivante"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages}
              variant="outline"
              size={isMobile ? "lg" : "md"}
            />
          </div>
        </div>
      )}
    </div>
  );
}