// src/components/SuperAdmin/GestionSuperAdmins/SessionsPanel.jsx
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui";
import toast from "react-hot-toast";
import {
  Users, Loader, LogOut, Monitor, Clock, User as UserIcon, Ban,
} from "lucide-react";

function formatLastActivity(ts) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  return `il y a ${h} h`;
}

function parseUserAgent(ua) {
  if (!ua) return "Appareil inconnu";
  if (ua.includes("iPhone")) return "iPhone";
  if (ua.includes("iPad")) return "iPad";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "Mac";
  if (ua.includes("Linux")) return "Linux";
  return "Appareil";
}

export function SessionsPanel({ userId }) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const sessions = useQuery(api.users.listActiveSessions, { userId });
  const forceLogoutM = useMutation(api.users.forceLogoutUser);
  const forceLogoutAllM = useMutation(api.users.forceLogoutAll);

  const handleForceLogout = async (session) => {
    const ok = await confirm({
      title: "Déconnecter cet utilisateur ?",
      message: `${session.nom} (${session.login}) sera immédiatement déconnecté.`,
      confirmLabel: "Déconnecter",
      danger: true,
    });
    if (!ok) return;
    try {
      await forceLogoutM({ userId, targetId: session._id });
      toast.success(`${session.nom} déconnecté`);
    } catch (err) {
      toast.error("Erreur : " + (err?.message ?? "inconnue"));
    }
  };

  const handleForceLogoutAll = async () => {
    const ok = await confirm({
      title: "Déconnecter tous les autres ?",
      message:
        "Tous les super admins (sauf vous) seront déconnectés immédiatement.",
      confirmLabel: "Tout déconnecter",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await forceLogoutAllM({
        userId,
        excludeCurrent: true,
      });
      toast.success(`${res.count} super admin(s) déconnecté(s)`);
    } catch (err) {
      toast.error("Erreur : " + (err?.message ?? "inconnue"));
    }
  };

  if (sessions === undefined) {
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

  const others = sessions.filter((s) => !s.isCurrentSession);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space.md }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: t.space.sm,
        }}
      >
        <div>
          <div
            style={{
              fontSize: t.font.size.md,
              fontWeight: 700,
              color: t.text.primary,
            }}
          >
            {sessions.length} session{sessions.length > 1 ? "s" : ""} active
            {sessions.length > 1 ? "s" : ""}
          </div>
          <div style={{ fontSize: t.font.size.xs, color: t.text.secondary }}>
            Activité dans les 15 dernières minutes
          </div>
        </div>

        {others.length > 0 && (
          <Button
            icon={<Ban size={14} />}
            onClick={handleForceLogoutAll}
            variant="ghost"
          >
            Tout déconnecter
          </Button>
        )}
      </div>

      {/* Liste */}
      {sessions.length === 0 ? (
        <div
          style={{
            padding: t.space.xl,
            textAlign: "center",
            background: t.surface.elevated,
            border: `1px solid ${t.border.subtle}`,
            borderRadius: t.radius.lg,
          }}
        >
          <Clock size={40} color={t.text.muted} style={{ marginBottom: 12 }} />
          <p
            style={{
              fontSize: t.font.size.sm,
              color: t.text.secondary,
              margin: 0,
            }}
          >
            Aucune session active.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: t.surface.elevated,
            border: `1px solid ${t.border.subtle}`,
            borderRadius: t.radius.lg,
            overflow: "hidden",
          }}
        >
          {sessions.map((s, i) => (
            <div
              key={s._id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: t.space.sm,
                padding: t.space.md,
                borderTop: i > 0 ? `1px solid ${t.border.subtle}` : "none",
                flexWrap: isMobile ? "wrap" : "nowrap",
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: s.isCurrentSession
                    ? `${t.accent.primary}20`
                    : `${t.text.muted}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                <UserIcon
                  size={18}
                  color={s.isCurrentSession ? t.accent.primary : t.text.muted}
                />
                {/* Point vert */}
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#10B981",
                    border: `2px solid ${t.surface.elevated}`,
                  }}
                />
              </div>

              {/* Infos */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: t.font.size.sm,
                      fontWeight: 700,
                      color: t.text.primary,
                    }}
                  >
                    {s.nom}
                  </span>
                  {s.isOwner && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#F59E0B",
                        background: "#F59E0B15",
                        padding: "2px 6px",
                        borderRadius: t.radius.full,
                        textTransform: "uppercase",
                      }}
                    >
                      Owner
                    </span>
                  )}
                  {s.isCurrentSession && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#10B981",
                        background: "#10B98115",
                        padding: "2px 6px",
                        borderRadius: t.radius.full,
                        textTransform: "uppercase",
                      }}
                    >
                      Vous
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: t.space.md,
                    fontSize: t.font.size.xs,
                    color: t.text.muted,
                    marginTop: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <span>@{s.login}</span>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 3 }}
                  >
                    <Monitor size={10} />
                    {parseUserAgent(s.lastActivityUserAgent)}
                  </span>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 3 }}
                  >
                    <Clock size={10} />
                    {formatLastActivity(s.lastActivityAt)}
                  </span>
                </div>
              </div>

              {/* Action */}
              {!s.isCurrentSession && !s.isOwner && (
                <button
                  type="button"
                  onClick={() => handleForceLogout(s)}
                  title="Forcer la déconnexion"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 10px",
                    background: "transparent",
                    border: `1px solid ${t.border.default}`,
                    color: "#EF4444",
                    borderRadius: t.radius.sm,
                    cursor: "pointer",
                    fontSize: t.font.size.xs,
                    fontWeight: 600,
                    fontFamily: t.font.family,
                    flexShrink: 0,
                  }}
                >
                  <LogOut size={12} />
                  {!isMobile && "Déconnecter"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

export default SessionsPanel;