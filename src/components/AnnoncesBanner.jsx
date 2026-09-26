// src/components/AnnoncesBanner.jsx
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import {
  X, Info, AlertTriangle, Wrench, CheckCircle2,
  Pin,           // Vague 1
  Paperclip,     // ✨ V2 — Pièces jointes
  FileText,      // ✨ V2
  Image as ImageIcon, // ✨ V2
} from "lucide-react";

const TYPE_CONFIG = {
  info: { color: "#3B82F6", Icon: Info },
  warning: { color: "#F59E0B", Icon: AlertTriangle },
  maintenance: { color: "#EF4444", Icon: Wrench },
  success: { color: "#10B981", Icon: CheckCircle2 },
};

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AnnoncesBanner({ userId }) {
  const t = useTokens();
  const [dismissed, setDismissed] = useState(new Set());

  const annonces =
    useQuery(
      api.annonces.listActivesForUser,
      userId ? { userId } : "skip"
    ) ?? [];

  const marquerLue = useMutation(api.annonces.marquerLue);

  const handleDismiss = async (id) => {
    setDismissed((prev) => new Set(prev).add(id));
    try {
      await marquerLue({ userId, annonceId: id });
    } catch (e) {
      console.error("Erreur marquerLue:", e);
    }
  };

  const visibles = annonces.filter((a) => !dismissed.has(a._id));

  if (visibles.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        marginBottom: 16,
      }}
    >
      {visibles.map((a) => {
        const conf = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.info;
        const { Icon } = conf;
        const isEpinglee = a.epinglee === true;
        const pjs = a.piecesJointes ?? [];

        return (
          <div
            key={a._id}
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "12px 16px",
              background: `${conf.color}10`,
              border: `1px solid ${
                isEpinglee ? t.accent.primary : `${conf.color}40`
              }`,
              borderLeft: isEpinglee
                ? `4px solid ${t.accent.primary}`
                : `4px solid ${conf.color}`,
              borderRadius: t.radius.md,
              animation: "ab-slide 0.3s ease-out",
              boxShadow: isEpinglee
                ? `0 2px 8px ${t.accent.primary}20`
                : "none",
            }}
          >
            <Icon
              size={20}
              color={conf.color}
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Titre + Badge épinglée */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: t.font.size.sm,
                  fontWeight: 700,
                  color: t.text.primary,
                  marginBottom: 2,
                  flexWrap: "wrap",
                }}
              >
                {isEpinglee && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 9,
                      fontWeight: 700,
                      color: t.accent.primary,
                      background: `${t.accent.primary}20`,
                      padding: "2px 6px",
                      borderRadius: t.radius.full,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    <Pin size={9} />
                    Épinglée
                  </span>
                )}
                <span>{a.titre}</span>
              </div>

              {/* Message */}
              <div
                style={{
                  fontSize: t.font.size.sm,
                  color: t.text.secondary,
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
              >
                {a.message}
              </div>

              {/* ✨ V2 — Pièces jointes */}
              {pjs.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {pjs.map((pj, i) => {
                    const isImage = pj.type.startsWith("image/");
                    const PJIcon = isImage ? ImageIcon : FileText;
                    return (
                      <a
                        key={i}
                        href={pj.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`${pj.nom}${
                          pj.taille ? ` (${formatBytes(pj.taille)})` : ""
                        }`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 10px",
                          background: t.surface.elevated,
                          border: `1px solid ${t.border.subtle}`,
                          borderRadius: t.radius.sm,
                          fontSize: t.font.size.xs,
                          fontWeight: 600,
                          color: conf.color,
                          textDecoration: "none",
                          maxWidth: 220,
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = t.surface.hover ?? "#F8FAFC";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = t.surface.elevated;
                        }}
                      >
                        <PJIcon size={13} style={{ flexShrink: 0 }} />
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pj.nom}
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bouton fermer */}
            <button
              type="button"
              onClick={() => handleDismiss(a._id)}
              aria-label="Fermer"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 4,
                borderRadius: t.radius.sm,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: t.text.secondary,
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes ab-slide {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default AnnoncesBanner;