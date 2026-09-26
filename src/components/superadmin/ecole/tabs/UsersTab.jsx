// src/components/SuperAdmin/ecole/tabs/UsersTab.jsx
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Loader } from "lucide-react";

const ROLES = [
  "admin",
  "directeur",
  "enseignant",
  "disciplinaire",
  "comptable",
  "parent",
  "eleve",
];

function FilterBtn({ active, onClick, children }) {
  const t = useTokens();
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 10px",
        borderRadius: t.radius.sm,
        border: `1px solid ${active ? t.accent.primary : t.border.default}`,
        background: active ? `${t.accent.primary}15` : "transparent",
        color: active ? t.accent.primary : t.text.secondary,
        cursor: "pointer",
        fontSize: t.font.size.xs,
        fontWeight: 600,
        fontFamily: t.font.family,
        textTransform: "capitalize",
      }}
    >
      {children}
    </button>
  );
}

export function UsersTab({ userId, ecoleId }) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const [filtreRole, setFiltreRole] = useState(null);

  const args = useMemo(
    () => ({ userId, ecoleId, filtreRole: filtreRole ?? undefined }),
    [userId, ecoleId, filtreRole]
  );

  const users = useQuery(api.ecoles.listUsersEcole, args);

  if (users === undefined) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Loader
          size={32}
          style={{ animation: "spin 1s linear infinite" }}
          color={t.accent.primary}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space.md }}>
      {/* Filtres rôle */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <FilterBtn
          active={filtreRole === null}
          onClick={() => setFiltreRole(null)}
        >
          Tous
        </FilterBtn>
        {ROLES.map((r) => (
          <FilterBtn
            key={r}
            active={filtreRole === r}
            onClick={() => setFiltreRole(r)}
          >
            {r}
          </FilterBtn>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          background: t.surface.elevated,
          border: `1px solid ${t.border.subtle}`,
          borderRadius: t.radius.lg,
          overflow: "hidden",
        }}
      >
        {!isMobile && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 2fr 1fr 1fr",
              gap: t.space.md,
              padding: `${t.space.sm} ${t.space.md}`,
              background: t.surface.hover,
              fontSize: t.font.size.xs,
              fontWeight: 700,
              color: t.text.secondary,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            <div>Nom</div>
            <div>Login</div>
            <div>Rôle</div>
            <div>Statut</div>
          </div>
        )}

        {users.length === 0 ? (
          <div
            style={{
              padding: t.space.xl,
              textAlign: "center",
              color: t.text.secondary,
              fontSize: t.font.size.sm,
            }}
          >
            Aucun utilisateur pour ce filtre.
          </div>
        ) : (
          users.map((u, i) => (
            <div
              key={u._id}
              style={{
                display: isMobile ? "flex" : "grid",
                flexDirection: isMobile ? "column" : undefined,
                gridTemplateColumns: isMobile ? undefined : "2fr 2fr 1fr 1fr",
                gap: isMobile ? 6 : t.space.md,
                padding: `${t.space.sm} ${t.space.md}`,
                borderTop: i > 0 ? `1px solid ${t.border.subtle}` : "none",
                fontSize: t.font.size.sm,
              }}
            >
              <div style={{ color: t.text.primary, fontWeight: 600 }}>
                {u.nom} {u.prenom} {u.postnom}
              </div>
              <div
                style={{
                  color: t.text.secondary,
                  fontFamily: "monospace",
                }}
              >
                {u.login}
              </div>
              <div
                style={{
                  color: t.text.secondary,
                  textTransform: "capitalize",
                }}
              >
                {u.role}
              </div>
              <div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: u.isActive ? "#10B981" : "#EF4444",
                    background: u.isActive ? "#10B98115" : "#EF444415",
                    padding: "2px 8px",
                    borderRadius: t.radius.full,
                    textTransform: "uppercase",
                  }}
                >
                  {u.isActive ? "Actif" : "Inactif"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}