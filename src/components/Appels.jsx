// src/components/Appels.jsx
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Phone, PhoneOutgoing, MessageCircle, Clock, Video, Users,
  Search, X, Check, UserPlus, Loader,
} from "lucide-react";
import toast from "react-hot-toast";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { HistoriqueAppels } from "./HistoriqueAppels";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════
const GROUP_CALL_ALLOWED_ROLES = [
  "admin",
  "directeur",
  "disciplinaire",
  "enseignant",
];

const CONTACT_WHITELIST_FOR_STUDENTS = [
  "admin",
  "directeur",
  "disciplinaire",
  "enseignant",
  "comptable",
];

// Couleurs sémantiques par rôle
const ROLE_COLORS = {
  admin: { bg: "#EEF2FF", fg: "#4338CA", darkBg: "#312E81", darkFg: "#A5B4FC" },
  directeur: { bg: "#F3E8FF", fg: "#7E22CE", darkBg: "#581C87", darkFg: "#D8B4FE" },
  enseignant: { bg: "#DCFCE7", fg: "#15803D", darkBg: "#14532D", darkFg: "#86EFAC" },
  parent: { bg: "#FFEDD5", fg: "#C2410C", darkBg: "#7C2D12", darkFg: "#FDBA74" },
  eleve: { bg: "#CFFAFE", fg: "#0E7490", darkBg: "#164E63", darkFg: "#67E8F9" },
  disciplinaire: { bg: "#FEE2E2", fg: "#B91C1C", darkBg: "#7F1D1D", darkFg: "#FCA5A5" },
  comptable: { bg: "#CCFBF1", fg: "#0F766E", darkBg: "#134E4A", darkFg: "#5EEAD4" },
};

// Palette pour avatars (déterministe par nom)
const AVATAR_PALETTE = [
  "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E",
  "#F59E0B", "#10B981", "#14B8A6", "#3B82F6",
];

const ROLE_LABELS = {
  admin: "Admin",
  directeur: "Directeur",
  enseignant: "Enseignant",
  parent: "Parent",
  eleve: "Élève",
  disciplinaire: "Disciplinaire",
  comptable: "Comptable",
  superAdmin: "Super Admin",
};

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
function getInitials(nom) {
  if (!nom) return "?";
  const parts = nom.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarColor(nom) {
  if (!nom) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < nom.length; i++) {
    hash = nom.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const AppelsKeyframes = (
  <style>{`
    @keyframes app-pulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.4; }
    }
    @keyframes app-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes app-slide-down {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes app-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .app-skeleton {
      background: currentColor;
      border-radius: 6px;
      animation: app-pulse 1.4s ease-in-out infinite;
    }
    .app-spin { animation: app-spin 0.8s linear infinite; }
    .app-slide-down { animation: app-slide-down 0.2s ease-out; }
    .app-fade-in { animation: app-fade-in 0.25s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .app-skeleton, .app-spin, .app-slide-down, .app-fade-in {
        animation: none !important;
      }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ════════════════════════════════════════════════════════════════════

/** Badge coloré selon le rôle */
function RoleBadge({ role, dark }) {
  const config = ROLE_COLORS[role] || {
    bg: "#F1F5F9",
    fg: "#475569",
    darkBg: "#334155",
    darkFg: "#CBD5E1",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: dark ? config.darkBg : config.bg,
        color: dark ? config.darkFg : config.fg,
        whiteSpace: "nowrap",
      }}
    >
      {ROLE_LABELS[role] || role}
    </span>
  );
}

/** Avatar initiale coloré */
function Avatar({ nom, size = 44 }) {
  const initial = getInitials(nom);
  const bg = getAvatarColor(nom);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.4,
        flexShrink: 0,
        letterSpacing: "-0.02em",
      }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

/** Un contact dans la liste */
function ContactRow({
  contact,
  dark,
  isMobile,
  tokens,
  onMessage,
  onCall,
  calling,
}) {
  const [hovered, setHovered] = useState(false);
  const isBusy = calling === contact._id;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: isMobile ? "12px 14px" : "14px 16px",
        background: hovered && !isMobile ? tokens.surfaceHover : tokens.surface,
        borderRadius: 12,
        border: `1px solid ${tokens.border}`,
        transition: "background 0.15s ease, border-color 0.15s ease",
        opacity: isBusy ? 0.6 : 1,
      }}
    >
      <Avatar nom={contact.nom} size={isMobile ? 40 : 44} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: isMobile ? 14 : 15,
              color: tokens.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {contact.nom}
          </span>
          <RoleBadge role={contact.role} dark={dark} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: isMobile ? 4 : 6,
          flexShrink: 0,
        }}
      >
        <IconButton
          icon={<MessageCircle size={18} />}
          label={`Envoyer un message à ${contact.nom}`}
          onClick={() => onMessage(contact._id)}
          tokens={tokens}
          disabled={isBusy}
        />
        <IconButton
          icon={
            isBusy ? (
              <Loader size={18} className="app-spin" />
            ) : (
              <PhoneOutgoing size={18} />
            )
          }
          label={`Appel audio avec ${contact.nom}`}
          onClick={() => onCall(contact, "audio")}
          tokens={tokens}
          variant="primary"
          disabled={isBusy}
        />
        <IconButton
          icon={<Video size={18} />}
          label={`Appel vidéo avec ${contact.nom}`}
          onClick={() => onCall(contact, "video")}
          tokens={tokens}
          variant="primary"
          disabled={isBusy}
        />
      </div>
    </div>
  );
}

/** Bouton icône carré arrondi */
function IconButton({ icon, label, onClick, tokens, variant = "ghost", disabled = false }) {
  const [hovered, setHovered] = useState(false);

  const baseStyle = {
    width: 38,
    height: 38,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background 0.15s ease, transform 0.1s ease",
    padding: 0,
    outline: "none",
  };

  const variants = {
    ghost: {
      background: hovered && !disabled ? tokens.ghostHover : "transparent",
      color: tokens.textMuted,
    },
    primary: {
      background: disabled
        ? tokens.primaryDisabled
        : hovered
        ? tokens.primaryHover
        : tokens.primary,
      color: "#FFFFFF",
      boxShadow: hovered && !disabled ? "0 2px 8px rgba(79,70,229,0.25)" : "none",
    },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={(e) => {
        e.currentTarget.style.outline = `2px solid ${tokens.primary}`;
        e.currentTarget.style.outlineOffset = "2px";
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = "none";
      }}
      style={{ ...baseStyle, ...variants[variant] }}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

/** Skeleton pour un contact en chargement */
function ContactSkeleton({ tokens, isMobile }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: isMobile ? "12px 14px" : "14px 16px",
        background: tokens.surface,
        borderRadius: 12,
        border: `1px solid ${tokens.border}`,
      }}
    >
      <div
        className="app-skeleton"
        style={{
          width: isMobile ? 40 : 44,
          height: isMobile ? 40 : 44,
          borderRadius: "50%",
          color: tokens.skeleton,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          className="app-skeleton"
          style={{ width: "60%", height: 14, color: tokens.skeleton, marginBottom: 6 }}
        />
        <div
          className="app-skeleton"
          style={{ width: "35%", height: 10, color: tokens.skeleton }}
        />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="app-skeleton"
            style={{ width: 38, height: 38, borderRadius: 10, color: tokens.skeleton }}
          />
        ))}
      </div>
    </div>
  );
}

/** Empty state propre */
function EmptyState({ icon, title, description, tokens, isMobile }) {
  return (
    <div
      style={{
        background: tokens.surface,
        borderRadius: 16,
        padding: isMobile ? "40px 20px" : "56px 24px",
        textAlign: "center",
        border: `1px solid ${tokens.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: tokens.ghostHover,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: tokens.textMuted,
          marginBottom: 4,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: isMobile ? 15 : 16,
          fontWeight: 600,
          color: tokens.text,
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: isMobile ? 13 : 14,
            color: tokens.textMuted,
            maxWidth: 320,
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}

/** Ligne de participant pour l'appel de groupe */
function ParticipantRow({ contact, dark, selected, onToggle, tokens, isMobile }) {
  const [hovered, setHovered] = useState(false);

  return (
    <label
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: isMobile ? "10px 12px" : "8px 12px",
        borderRadius: 10,
        background: selected
          ? tokens.primarySoft
          : hovered
          ? tokens.surfaceHover
          : "transparent",
        cursor: "pointer",
        transition: "background 0.15s ease",
        border: selected
          ? `1px solid ${tokens.primary}`
          : `1px solid transparent`,
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          border: selected
            ? `2px solid ${tokens.primary}`
            : `2px solid ${tokens.border}`,
          background: selected ? tokens.primary : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.15s ease",
        }}
      >
        {selected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
      </div>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        style={{ display: "none" }}
        aria-label={`Sélectionner ${contact.nom}`}
      />
      <Avatar nom={contact.nom} size={32} />
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
              fontSize: isMobile ? 13 : 14,
              fontWeight: 500,
              color: tokens.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {contact.nom}
          </span>
          <RoleBadge role={contact.role} dark={dark} />
        </div>
      </div>
    </label>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function Appels({ user, ecoleId, anneeId, onNavigateToMessaging }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const cleanupCalls = useMutation(api.appels.cleanupExpiredCalls);

  const userId = user?._id;

  // ════════════════════════════════════════════════════════════════════
  // TOKENS (design system local)
  // ════════════════════════════════════════════════════════════════════
  const tokens = useMemo(
    () => ({
      bg: dark ? "#0F172A" : "#F8FAFC",
      surface: dark ? "#1E293B" : "#FFFFFF",
      surfaceHover: dark ? "#26334D" : "#F8FAFC",
      border: dark ? "#334155" : "#E2E8F0",
      text: dark ? "#F1F5F9" : "#1E293B",
      textMuted: dark ? "#94A3B8" : "#64748B",
      primary: dark ? "#818CF8" : "#4F46E5",
      primaryHover: dark ? "#6366F1" : "#4338CA",
      primaryDisabled: dark ? "#4B5563" : "#A5B4FC",
      primarySoft: dark ? "#312E81" : "#EEF2FF",
      ghostHover: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      skeleton: dark ? "#334155" : "#E2E8F0",
      danger: "#EF4444",
    }),
    [dark]
  );

  // ════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        await cleanupCalls({ userId });
      } catch (err) {
        if (!cancelled) console.debug("[Appels] cleanup:", err?.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cleanupCalls, userId]);

  // ════════════════════════════════════════════════════════════════════
  // ÉTATS
  // ════════════════════════════════════════════════════════════════════
  const [tab, setTab] = useState("contacts");
  const [searchTerm, setSearchTerm] = useState("");
  const [groupCallMode, setGroupCallMode] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [callingId, setCallingId] = useState(null);
  const [launchingGroup, setLaunchingGroup] = useState(false);

  // ════════════════════════════════════════════════════════════════════
  // QUERIES
  // ════════════════════════════════════════════════════════════════════
  const contactsArgs = useMemo(
    () => (ecoleId && userId ? { ecoleId, userId } : "skip"),
    [ecoleId, userId]
  );
  const contactsRaw = useQuery(api.appels.listContacts, contactsArgs);
  const isLoadingContacts = contactsRaw === undefined;
  const contacts = useMemo(() => contactsRaw ?? [], [contactsRaw]);

  const canCreateGroupCall = useMemo(
    () => GROUP_CALL_ALLOWED_ROLES.includes(user?.role),
    [user?.role]
  );

  const classesArgs = useMemo(
    () =>
      ecoleId && userId && canCreateGroupCall
        ? { ecoleId, userId }
        : "skip",
    [ecoleId, userId, canCreateGroupCall]
  );
  const classesRaw = useQuery(api.classes.list, classesArgs);
  const classes = useMemo(() => classesRaw ?? [], [classesRaw]);

  // ════════════════════════════════════════════════════════════════════
  // MUTATIONS
  // ════════════════════════════════════════════════════════════════════
  const createCall = useMutation(api.appels.createCall);
  const createGroupCall = useMutation(api.appels.createGroupCall);

  // ════════════════════════════════════════════════════════════════════
  // FILTRES
  // ════════════════════════════════════════════════════════════════════
  const visibleContacts = useMemo(() => {
    let filtered =
      user?.role === "parent" || user?.role === "eleve"
        ? contacts.filter((c) =>
            CONTACT_WHITELIST_FOR_STUDENTS.includes(c?.role)
          )
        : contacts;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((c) =>
        (c?.nom ?? "").toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [contacts, user?.role, searchTerm]);

  // Participants visibles dans le formulaire groupe
  const visibleParticipants = useMemo(() => {
    if (!participantSearch.trim()) return visibleContacts;
    const q = participantSearch.toLowerCase();
    return visibleContacts.filter((c) =>
      (c?.nom ?? "").toLowerCase().includes(q)
    );
  }, [visibleContacts, participantSearch]);

  const groups = useMemo(() => {
    if (!canCreateGroupCall) return [];
    return classes.map((c) => ({
      id: `classe_${c.nom}`,
      label: `Classe ${c.nom}`,
    }));
  }, [classes, canCreateGroupCall]);

  const allParticipantsSelected = useMemo(
    () =>
      visibleContacts.length > 0 &&
      visibleContacts.every((c) => selectedParticipants.includes(c._id)),
    [visibleContacts, selectedParticipants]
  );

  // ════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════
  const handleTabChange = useCallback((newTab) => {
    setTab(newTab);
    if (newTab !== "contacts") setGroupCallMode(false);
  }, []);

  const handleCall = useCallback(
    async (contact, type = "audio") => {
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      setCallingId(contact._id);
      try {
        await createCall({
          calleeId: contact._id,
          ecoleId,
          anneeId,
          userId,
          type,
        });
        toast.success(
          `Appel ${type === "video" ? "vidéo" : "audio"} lancé...`
        );
      } catch (err) {
        console.error("[Appels] createCall failed:", err);
        if (err?.message?.includes("déjà en cours")) {
          toast.error("Un appel est déjà en cours avec ce contact.");
        } else {
          toast.error(err?.message ?? "Impossible de lancer l'appel");
        }
      } finally {
        setCallingId(null);
      }
    },
    [userId, ecoleId, anneeId, createCall]
  );

  const handleGroupCall = useCallback(async () => {
    if (!userId) {
      toast.error("Session invalide.");
      return;
    }
    if (!selectedGroupId || selectedParticipants.length === 0) {
      toast.error("Veuillez choisir un groupe et des participants.");
      return;
    }
    setLaunchingGroup(true);
    try {
      await createGroupCall({
        ecoleId,
        anneeId,
        userId,
        groupId: selectedGroupId,
        participantIds: selectedParticipants,
        type: "video",
      });
      toast.success("Appel de groupe lancé...");
      setGroupCallMode(false);
      setSelectedParticipants([]);
      setSelectedGroupId("");
      setParticipantSearch("");
    } catch (err) {
      console.error("[Appels] createGroupCall failed:", err);
      toast.error(err?.message ?? "Impossible de lancer l'appel de groupe");
    } finally {
      setLaunchingGroup(false);
    }
  }, [
    userId,
    selectedGroupId,
    selectedParticipants,
    ecoleId,
    anneeId,
    createGroupCall,
  ]);

  const handleMessage = useCallback(
    (contactId) => {
      if (onNavigateToMessaging) onNavigateToMessaging(contactId);
    },
    [onNavigateToMessaging]
  );

  const toggleParticipant = useCallback((id) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const selectAllParticipants = useCallback(() => {
    setSelectedParticipants((prev) => {
      const next = new Set(prev);
      visibleContacts.forEach((c) => next.add(c._id));
      return Array.from(next);
    });
  }, [visibleContacts]);

  const clearAllParticipants = useCallback(() => {
    setSelectedParticipants([]);
  }, []);

  // ════════════════════════════════════════════════════════════════════
  // LAYOUT TOKENS
  // ════════════════════════════════════════════════════════════════════
  const containerPadding = isMobile ? "16px 12px" : "24px";
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 13 : 15;

  // ════════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════════
  return (
    <div style={{ background: tokens.bg, minHeight: "100%" }}>
      {AppelsKeyframes}

      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: containerPadding,
        }}
      >
        {/* ═══════════ HEADER ═══════════ */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: isMobile ? 20 : 28,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: isMobile ? 36 : 40,
                  height: isMobile ? 36 : 40,
                  borderRadius: 10,
                  background: tokens.primarySoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: tokens.primary,
                  flexShrink: 0,
                }}
              >
                <Phone size={isMobile ? 18 : 20} />
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: titleSize,
                  fontWeight: 700,
                  color: tokens.text,
                  letterSpacing: "-0.02em",
                }}
              >
                Appels
              </h1>
            </div>
            <p
              style={{
                margin: 0,
                color: tokens.textMuted,
                fontSize: subtitleSize,
                paddingLeft: isMobile ? 46 : 50,
              }}
            >
              Appels audio, vidéo et de groupe
            </p>
          </div>

          {canCreateGroupCall && tab === "contacts" && (
            <button
              type="button"
              onClick={() => setGroupCallMode((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: isMobile ? "10px 14px" : "10px 18px",
                background: groupCallMode ? tokens.primary : tokens.surface,
                color: groupCallMode ? "#FFFFFF" : tokens.text,
                border: `1px solid ${
                  groupCallMode ? tokens.primary : tokens.border
                }`,
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
                width: isMobile ? "100%" : "auto",
              }}
              aria-expanded={groupCallMode}
            >
              <Users size={16} />
              {groupCallMode ? "Fermer" : "Appel de groupe"}
            </button>
          )}
        </div>

        {/* ═══════════ ONGLETS (pill style) ═══════════ */}
        <div
          style={{
            display: "inline-flex",
            padding: 4,
            background: tokens.surface,
            borderRadius: 12,
            border: `1px solid ${tokens.border}`,
            marginBottom: isMobile ? 16 : 20,
            gap: 2,
          }}
          role="tablist"
        >
          {[
            { id: "contacts", label: "Contacts", icon: <Phone size={15} /> },
            { id: "historique", label: "Historique", icon: <Clock size={15} /> },
          ].map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: isMobile ? "8px 14px" : "8px 18px",
                  border: "none",
                  borderRadius: 8,
                  background: isActive ? tokens.primary : "transparent",
                  color: isActive ? "#FFFFFF" : tokens.textMuted,
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  fontSize: isMobile ? 13 : 14,
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ═══════════ FORM GROUPE (collapsible) ═══════════ */}
        {groupCallMode && canCreateGroupCall && (
          <div
            className="app-slide-down"
            style={{
              background: tokens.surface,
              borderRadius: 16,
              padding: isMobile ? 16 : 20,
              marginBottom: isMobile ? 16 : 24,
              border: `1px solid ${tokens.border}`,
              boxShadow: dark
                ? "0 4px 12px rgba(0,0,0,0.3)"
                : "0 4px 12px rgba(0,0,0,0.04)",
            }}
          >
            {/* Header du form */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: isMobile ? 16 : 17,
                  fontWeight: 600,
                  color: tokens.text,
                }}
              >
                Nouvel appel de groupe
              </h3>
              <button
                type="button"
                onClick={() => {
                  setGroupCallMode(false);
                  setSelectedParticipants([]);
                  setSelectedGroupId("");
                  setParticipantSearch("");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: tokens.textMuted,
                  padding: 6,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                }}
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Select groupe */}
            <label
              htmlFor="group-call-select"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 500,
                color: tokens.textMuted,
              }}
            >
              Groupe
            </label>
            <select
              id="group-call-select"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              style={{
                width: "100%",
                padding: isMobile ? "12px 14px" : "10px 14px",
                borderRadius: 10,
                border: `1px solid ${tokens.border}`,
                background: tokens.bg,
                color: tokens.text,
                fontSize: isMobile ? 15 : 14,
                outline: "none",
                marginBottom: 16,
                cursor: "pointer",
              }}
            >
              <option value="">— Choisir un groupe —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>

            {/* Header participants + compteur + actions */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: tokens.textMuted,
                  }}
                >
                  Participants
                </span>
                {selectedParticipants.length > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: tokens.primarySoft,
                      color: tokens.primary,
                    }}
                  >
                    {selectedParticipants.length}
                  </span>
                )}
              </div>
              {visibleContacts.length > 0 && (
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    onClick={selectAllParticipants}
                    disabled={allParticipantsSelected}
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: `1px solid ${tokens.border}`,
                      background: "transparent",
                      color: tokens.textMuted,
                      cursor: allParticipantsSelected ? "not-allowed" : "pointer",
                      opacity: allParticipantsSelected ? 0.5 : 1,
                      fontWeight: 500,
                    }}
                  >
                    Tout
                  </button>
                  <button
                    type="button"
                    onClick={clearAllParticipants}
                    disabled={selectedParticipants.length === 0}
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: `1px solid ${tokens.border}`,
                      background: "transparent",
                      color: tokens.textMuted,
                      cursor:
                        selectedParticipants.length === 0
                          ? "not-allowed"
                          : "pointer",
                      opacity: selectedParticipants.length === 0 ? 0.5 : 1,
                      fontWeight: 500,
                    }}
                  >
                    Aucun
                  </button>
                </div>
              )}
            </div>

            {/* Recherche participants (si > 6) */}
            {visibleContacts.length > 6 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: `1px solid ${tokens.border}`,
                  background: tokens.bg,
                  marginBottom: 8,
                }}
              >
                <Search size={14} color={tokens.textMuted} />
                <input
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  placeholder="Filtrer les participants..."
                  aria-label="Filtrer les participants"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: tokens.text,
                    fontSize: 13,
                  }}
                />
              </div>
            )}

            {/* Liste participants */}
            <div
              style={{
                maxHeight: 280,
                overflowY: "auto",
                marginBottom: 16,
                paddingRight: 4,
              }}
            >
              {visibleParticipants.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    fontSize: 13,
                    color: tokens.textMuted,
                  }}
                >
                  Aucun participant trouvé
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {visibleParticipants.map((c) => (
                    <ParticipantRow
                      key={c._id}
                      contact={c}
                      dark={dark}
                      selected={selectedParticipants.includes(c._id)}
                      onToggle={() => toggleParticipant(c._id)}
                      tokens={tokens}
                      isMobile={isMobile}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setGroupCallMode(false);
                  setSelectedParticipants([]);
                  setSelectedGroupId("");
                  setParticipantSearch("");
                }}
                style={{
                  padding: "10px 18px",
                  background: "transparent",
                  border: `1px solid ${tokens.border}`,
                  borderRadius: 10,
                  color: tokens.textMuted,
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: 14,
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleGroupCall}
                disabled={
                  launchingGroup ||
                  !selectedGroupId ||
                  selectedParticipants.length === 0
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 20px",
                  background:
                    launchingGroup ||
                    !selectedGroupId ||
                    selectedParticipants.length === 0
                      ? tokens.primaryDisabled
                      : tokens.primary,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor:
                    launchingGroup ||
                    !selectedGroupId ||
                    selectedParticipants.length === 0
                      ? "not-allowed"
                      : "pointer",
                  minWidth: 180,
                }}
              >
                {launchingGroup ? (
                  <Loader size={16} className="app-spin" />
                ) : (
                  <Video size={16} />
                )}
                {launchingGroup
                  ? "Lancement..."
                  : `Lancer (${selectedParticipants.length})`}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ CONTENU PRINCIPAL ═══════════ */}
        {tab === "contacts" ? (
          <div className="app-fade-in">
            {/* Barre de recherche */}
            {!isLoadingContacts && visibleContacts.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: isMobile ? "10px 14px" : "10px 14px",
                  borderRadius: 12,
                  border: `1px solid ${tokens.border}`,
                  background: tokens.surface,
                  marginBottom: isMobile ? 12 : 16,
                }}
              >
                <Search size={16} color={tokens.textMuted} />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un contact..."
                  aria-label="Rechercher un contact"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: tokens.text,
                    fontSize: isMobile ? 15 : 14,
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                      color: tokens.textMuted,
                    }}
                    aria-label="Effacer la recherche"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Liste */}
            {isLoadingContacts ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: isMobile ? 8 : 8,
                }}
              >
                {[1, 2, 3, 4].map((i) => (
                  <ContactSkeleton key={i} tokens={tokens} isMobile={isMobile} />
                ))}
              </div>
            ) : visibleContacts.length === 0 ? (
              <EmptyState
                icon={<Phone size={isMobile ? 26 : 28} />}
                title={
                  searchTerm
                    ? "Aucun résultat"
                    : "Aucun contact disponible"
                }
                description={
                  searchTerm
                    ? `Aucun contact ne correspond à "${searchTerm}".`
                    : "Les utilisateurs de votre école apparaîtront ici."
                }
                tokens={tokens}
                isMobile={isMobile}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {visibleContacts.map((contact) => (
                  <ContactRow
                    key={contact._id}
                    contact={contact}
                    dark={dark}
                    isMobile={isMobile}
                    tokens={tokens}
                    onMessage={handleMessage}
                    onCall={handleCall}
                    calling={callingId}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="app-fade-in">
            <HistoriqueAppels
              user={user}
              ecoleId={ecoleId}
              anneeId={anneeId}
              onNavigateToMessaging={onNavigateToMessaging}
            />
          </div>
        )}
      </div>
    </div>
  );
}