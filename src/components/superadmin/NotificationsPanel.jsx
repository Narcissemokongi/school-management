// src/components/SuperAdmin/NotificationsPanel.jsx
import { Bell, Inbox } from "lucide-react";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";

/**
 * Panneau de notifications (apparaît sous la cloche).
 *
 * Props :
 * @param {Array} pendingUsers - Liste des utilisateurs en attente
 */
export function NotificationsPanel({ pendingUsers = [] }) {
  const t = useTokens();
  const isMobile = useIsMobile();

  const hasItems = pendingUsers.length > 0;

  return (
    <div
      role="menu"
      style={{
        position: "absolute",
        top: 48,
        right: 0,
        width: isMobile ? 260 : 320,
        maxWidth: "calc(100vw - 32px)",
        background: t.surface.default,
        borderRadius: t.radius.md,
        boxShadow: t.shadow.md,
        border: `1px solid ${t.border.default}`,
        zIndex: 100,
        overflow: "hidden",
        animation: "sa-fade 0.15s ease-out",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${t.border.default}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Bell size={16} color={t.text.muted} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: t.text.muted,
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          Notifications
        </span>
      </div>

      {/* Contenu */}
      {!hasItems ? (
        <div
          style={{
            padding: "28px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: t.surface.hover,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: t.text.muted,
            }}
          >
            <Inbox size={20} />
          </div>
          <span style={{ fontSize: 13, color: t.text.muted }}>
            Aucune notification
          </span>
        </div>
      ) : (
        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {pendingUsers.slice(0, 10).map((u) => (
            <NotificationItem key={u._id} user={u} />
          ))}
          {pendingUsers.length > 10 && (
            <div
              style={{
                padding: "10px 16px",
                textAlign: "center",
                fontSize: 12,
                color: t.text.muted,
                borderTop: `1px solid ${t.border.default}`,
              }}
            >
              +{pendingUsers.length - 10} autre(s)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationItem({ user }) {
  const t = useTokens();
  const [hovered, setHovered] = useState(false);

  // ✅ Fix : besoin d'importer useState
  // (ce composant est interne, l'import est fait plus bas)

  const initial = user.nom?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 16px",
        background: hovered ? t.surface.hover : "transparent",
        borderBottom: `1px solid ${t.border.subtle}`,
        transition: `background ${t.transition.fast}`,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: t.accent.primarySoft,
          color: t.accent.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {initial}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: t.text.primary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user.nom}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: t.text.muted,
            marginTop: 2,
            textTransform: "capitalize",
          }}
        >
          Demande · {user.role}
        </div>
      </div>
    </div>
  );
}

// Import en fin de fichier pour éviter les erreurs
import { useState } from "react";