// src/components/AuthenticatedApp.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@convex/_generated/api";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { useStyles } from "@/styles/theme";
import { NotifBanner } from "./NotifBanner";
import { SuperAdminDashboardV2 as SuperAdminDashboard } from "../components/SuperAdmin/SuperAdminDashboardV2";
import { DisciplinaireApp } from "./DisciplinaireApp";
import { DirecteurApp } from "./DirecteurApp";
import { AdminApp } from "./AdminApp";
import { ParentApp } from "./ParentApp";
import { EnseignantApp } from "./EnseignantApp";
import { ComptableApp } from "./ComptableApp";
import { EleveApp } from "./EleveApp";
import AppelVideo from "./AppelVideo";
import { IncomingCallModal } from "./IncomingCallModal";
import { OutgoingCallModal } from "./OutgoingCallModal";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationsManager } from "./NotificationsManager";
import toast from "react-hot-toast";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ArrowLeft, School as SchoolIcon } from "lucide-react";
// ✨ NOUVEAU — Impersonation
import { useImpersonationStore } from "@/store/impersonationStore";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { useActivityPing } from "@/hooks/useActivityPing";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const AuthenticatedAppKeyframes = (
  <style>{`
    @keyframes aa-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .aa-spin { animation: aa-spin 0.8s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .aa-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// CHEMINS PAR DÉFAUT PAR RÔLE
// ════════════════════════════════════════════════════════════════════
const ROLE_DEFAULT_PATHS = {
  superAdmin: "/super-admin/overview",
  admin: "/admin/accueil",
  directeur: "/directeur/accueil",
  comptable: "/comptable/dashboard",
  enseignant: "/enseignant/accueil",
  parent: "/parent/enfants",
  eleve: "/eleve/accueil",
  disciplinaire: "/disciplinaire/accueil",
};

export function AuthenticatedApp({ user, handleLogout }) {
  const { S, dark, toggle } = useStyles();
  const isMobile = useIsMobile();
  const { notify } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  // ════════════════════════════════════════════════════════════════════
  // ✨ IMPERSONATION — Restauration + user effectif
  // ════════════════════════════════════════════════════════════════════
  const impersonationSession = useImpersonationStore((s) => s.session);
  const restoreImpersonation = useImpersonationStore((s) => s.restore);

  useEffect(() => {
    restoreImpersonation();
  }, [restoreImpersonation]);

  const isImpersonating = !!impersonationSession;
  // effectiveUser : target pendant impersonation, sinon user réel
  const effectiveUser = impersonationSession?.targetUser ?? user;

  // ════════════════════════════════════════════════════════════════════
  // userId = acting user (target si impersonation, sinon owner)
  // ════════════════════════════════════════════════════════════════════
  const userId = effectiveUser?._id;

  // ✨ Ping de présence pour les sessions actives
  useActivityPing(userId);

  // ✅ SuperAdmin : rôle + admin sans école (SUR effectiveUser)
  const isSuperAdmin = useMemo(
    () =>
      effectiveUser?.role === "superAdmin" ||
      (effectiveUser?.role === "admin" && !effectiveUser?.ecoleId),
    [effectiveUser?.role, effectiveUser?.ecoleId]
  );

  // ════════════════════════════════════════════════════════════════════
  // ✅ École ouverte par le super admin
  // ════════════════════════════════════════════════════════════════════
  const [openedEcoleId, setOpenedEcoleId] = useState(null);

  // Reset quand l'utilisateur effectif change (logout/login/impersonation)
  useEffect(() => {
    setOpenedEcoleId(null);
  }, [userId]);

  // Charger les infos de l'école ouverte
  const openedEcoleArgs = useMemo(
    () =>
      isSuperAdmin && openedEcoleId && userId
        ? { ecoleId: openedEcoleId, userId }
        : "skip",
    [isSuperAdmin, openedEcoleId, userId]
  );

  const openedEcoleRaw = useQuery(api.ecoles.get, openedEcoleArgs);
  const openedEcole = openedEcoleRaw ?? null;

  // ════════════════════════════════════════════════════════════════════
  // Navigation 100% URL
  // ════════════════════════════════════════════════════════════════════
  const screenConfig = useMemo(() => {
    if (isSuperAdmin) {
      return { screen: "superadmin", ecoleId: null };
    }
    return { screen: "ecole", ecoleId: effectiveUser?.ecoleId || null };
  }, [isSuperAdmin, effectiveUser?.ecoleId]);

  const currentScreen = screenConfig.screen;
  const screenEcoleId = screenConfig.ecoleId;

  // ════════════════════════════════════════════════════════════════════
  // Redirection initiale selon rôle
  // ════════════════════════════════════════════════════════════════════
  const hasInitialRedirectRef = useRef(false);
  useEffect(() => {
    if (hasInitialRedirectRef.current) return;
    if (!userId) return;

    const path = location.pathname;
    if (path && path !== "/" && path !== "") return;

    hasInitialRedirectRef.current = true;

    const defaultPath = isSuperAdmin
      ? "/super-admin/overview"
      : ROLE_DEFAULT_PATHS[effectiveUser?.role];

    if (defaultPath) {
      navigate(defaultPath, { replace: true });
    }
  }, [userId, location.pathname, isSuperAdmin, effectiveUser?.role, navigate]);

  // ✅ Support Android back button (Capacitor)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = App.addListener("backButton", () => {
      if (isSuperAdmin && openedEcoleId) {
        setOpenedEcoleId(null);
        return;
      }
      if (currentScreen === "superadmin" && isSuperAdmin) {
        if (window.confirm("Voulez-vous quitter l'application ?")) {
          App.exitApp();
        }
      } else {
        navigate(-1);
      }
    });
    return () => listener.remove();
  }, [currentScreen, isSuperAdmin, openedEcoleId, navigate]);

  // ════════════════════════════════════════════════════════════════════
  // École effective
  // ════════════════════════════════════════════════════════════════════
  const ecoleId = isSuperAdmin
    ? openedEcoleId || null
    : screenEcoleId || effectiveUser?.ecoleId || null;

  // ════════════════════════════════════════════════════════════════════
  // ANNÉE ACTIVE
  // ════════════════════════════════════════════════════════════════════
  const anneeActiveArgs = useMemo(
    () => (ecoleId && userId ? { ecoleId, userId } : "skip"),
    [ecoleId, userId]
  );

  const anneeActiveQuery = useQuery(
    api.anneesScolaires.getActive,
    anneeActiveArgs
  );

  const anneeActive = anneeActiveQuery ?? null;
  const anneeId = anneeActive?._id || undefined;

  const [selectedAnneeId, setSelectedAnneeId] = useState(anneeId);
  useEffect(() => {
    if (!selectedAnneeId && anneeId) {
      setSelectedAnneeId(anneeId);
    }
  }, [selectedAnneeId, anneeId]);

  const dataAnneeId =
    isSuperAdmin || effectiveUser?.role === "admin"
      ? selectedAnneeId
      : anneeId;

  // ════════════════════════════════════════════════════════════════════
  // APPELS
  // ════════════════════════════════════════════════════════════════════
  const callArgs = useMemo(
    () => (userId ? { userId } : "skip"),
    [userId]
  );

  const pendingCall = useQuery(api.appels.getPendingCall, callArgs);
  const activeCallFromConvex = useQuery(api.appels.getActiveCall, callArgs);
  const outgoingCall = useQuery(api.appels.getOutgoingCall, callArgs);

  const acceptCall = useMutation(api.appels.acceptCall);
  const rejectCall = useMutation(api.appels.rejectCall);
  const endCall = useMutation(api.appels.endCall);

  const [localActiveCall, setLocalActiveCall] = useState(null);

  useEffect(() => {
    if (activeCallFromConvex) {
      setLocalActiveCall({
        _id: activeCallFromConvex._id,
        channelName: activeCallFromConvex.channelName,
        type: activeCallFromConvex.type || "video",
      });
    } else {
      setLocalActiveCall(null);
    }
  }, [
    activeCallFromConvex?._id,
    activeCallFromConvex?.channelName,
    activeCallFromConvex?.type,
  ]);

  const handleCallEnd = useCallback(() => setLocalActiveCall(null), []);

  const handleCancelCall = useCallback(async () => {
    if (outgoingCall && userId) {
      await endCall({ callId: outgoingCall._id, userId });
      toast("Appel annulé");
    }
  }, [outgoingCall, userId, endCall]);

  // ════════════════════════════════════════════════════════════════════
  // QUERIES PRINCIPALES
  // ════════════════════════════════════════════════════════════════════
  const ecoleAnneeArgs = useMemo(
    () =>
      ecoleId && dataAnneeId && userId
        ? { ecoleId, anneeId: dataAnneeId, userId }
        : "skip",
    [ecoleId, dataAnneeId, userId]
  );

  const ecoleSimpleArgs = useMemo(
    () => (ecoleId && userId ? { ecoleId, userId } : "skip"),
    [ecoleId, userId]
  );

  const elevesRaw = useQuery(api.eleves.list, ecoleAnneeArgs);
  const classesRaw = useQuery(api.classes.list, ecoleAnneeArgs);
  const fautesRaw = useQuery(api.fautes.list, ecoleSimpleArgs);
  const punitionsRaw = useQuery(api.punitions.list, ecoleAnneeArgs);
  const sanctionsRaw = useQuery(api.sanctions.list, ecoleSimpleArgs);
  const usersRaw = useQuery(api.users.listByEcole, ecoleSimpleArgs);
  const fraisRaw = useQuery(api.frais.listByEcole, ecoleAnneeArgs);

  const eleves = useMemo(() => elevesRaw ?? [], [elevesRaw]);
  const classes = useMemo(() => classesRaw ?? [], [classesRaw]);
  const fautes = useMemo(() => fautesRaw ?? [], [fautesRaw]);
  const punitions = useMemo(() => punitionsRaw ?? [], [punitionsRaw]);
  const sanctions = useMemo(() => sanctionsRaw ?? [], [sanctionsRaw]);
  const users = useMemo(() => usersRaw ?? [], [usersRaw]);
  const frais = useMemo(() => fraisRaw ?? [], [fraisRaw]);

  // ════════════════════════════════════════════════════════════════════
  // ENFANTS (parent uniquement)
  // ════════════════════════════════════════════════════════════════════
  const enfantsArgs = useMemo(
    () =>
      effectiveUser?.role === "parent" && userId && anneeId
        ? { parentId: userId, anneeId, userId }
        : "skip",
    [effectiveUser?.role, userId, anneeId]
  );

  const enfantsRaw = useQuery(api.eleves.listByParent, enfantsArgs);
  const enfants = useMemo(() => enfantsRaw ?? [], [enfantsRaw]);

  const eleveIds = useMemo(() => enfants.map((e) => e._id), [enfants]);

  const punitionsEnfantsArgs = useMemo(
    () =>
      effectiveUser?.role === "parent" &&
      userId &&
      anneeId &&
      eleveIds.length > 0
        ? { eleveIds, anneeId, userId }
        : "skip",
    [effectiveUser?.role, userId, anneeId, eleveIds]
  );

  const punitionsEnfantsRaw = useQuery(
    api.punitions.listByEleves,
    punitionsEnfantsArgs
  );
  const punitionsEnfants = useMemo(
    () => punitionsEnfantsRaw ?? [],
    [punitionsEnfantsRaw]
  );

  // ════════════════════════════════════════════════════════════════════
  // MUTATIONS (admin)
  // ════════════════════════════════════════════════════════════════════
  const addEleve = useMutation(api.eleves.add);
  const removeEleve = useMutation(api.eleves.remove);
  const importEleves = useMutation(api.eleves.importEleves);
  const addClasse = useMutation(api.classes.add);
  const removeClasse = useMutation(api.classes.remove);
  const addFaute = useMutation(api.fautes.add);
  const updateFaute = useMutation(api.fautes.update);
  const removeFaute = useMutation(api.fautes.remove);
  const addPunition = useMutation(api.punitions.add);

  // ════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ════════════════════════════════════════════════════════════════════
  const [notifs, setNotifs] = useState([]);
  const handleNotif = useCallback(
    (msg) => setNotifs((prev) => [...prev, msg]),
    []
  );

  useEffect(() => {
    if (!notifs.length) return;
    const t = setTimeout(() => setNotifs([]), 4000);
    return () => clearTimeout(t);
  }, [notifs]);

  // Notifications punitions graves (parent)
  const prevPunitionsEnfantsRef = useRef([]);
  useEffect(() => {
    if (effectiveUser?.role !== "parent" || punitionsEnfants.length === 0)
      return;
    const prev = prevPunitionsEnfantsRef.current;
    const prevIds = new Set(prev.map((p) => p._id));

    const enfantsById = new Map(enfants.map((e) => [e._id, e]));
    const fautesById = new Map(fautes.map((f) => [f._id, f]));

    for (const p of punitionsEnfants) {
      if (prevIds.has(p._id)) continue;
      const eleve = enfantsById.get(p.idEleve);
      const faute = fautesById.get(p.fauteId ?? p.idFaute);
      if (faute?.gravite === "Grave") {
        notify(
          `Nouvelle punition grave pour ${eleve?.nom} ${eleve?.postnom} : ${faute.libelle}`
        );
      }
    }
    prevPunitionsEnfantsRef.current = punitionsEnfants;
  }, [punitionsEnfants, effectiveUser?.role, enfants, fautes, notify]);

  // ════════════════════════════════════════════════════════════════════
  // APPEL ACTIF
  // ════════════════════════════════════════════════════════════════════
  if (localActiveCall) {
    return (
      <AppelVideo
        channelName={localActiveCall.channelName}
        userId={userId}
        callId={localActiveCall._id}
        onCallEnd={handleCallEnd}
        callType={localActiveCall.type || "video"}
      />
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // ✅ SUPER ADMIN — DANS UNE ÉCOLE (vue AdminApp)
  // ════════════════════════════════════════════════════════════════════
  if (isSuperAdmin && openedEcoleId) {
    const ecoleUser = {
      ...effectiveUser,
      role: "admin",
      ecoleId: openedEcoleId,
      _superAdminView: true,
    };

    return (
      <>
        {AuthenticatedAppKeyframes}
        <NotifBanner notifs={notifs} />

        {/* ═══════════ Barre retour au Super Admin ═══════════ */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 200,
            background: dark ? "#0F172A" : "#FFFFFF",
            borderBottom: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            padding: isMobile ? "10px 12px" : "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            boxShadow: dark
              ? "0 1px 3px rgba(0,0,0,0.3)"
              : "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              minWidth: 0,
              flex: 1,
            }}
          >
            <button
              type="button"
              onClick={() => setOpenedEcoleId(null)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: isMobile ? "8px 12px" : "6px 14px",
                borderRadius: 8,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                background: "transparent",
                color: dark ? "#F1F5F9" : "#1E293B",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
                fontFamily: "inherit",
                flexShrink: 0,
              }}
              aria-label="Retour au dashboard Super Admin"
            >
              <ArrowLeft size={16} />
              {!isMobile && "Retour"}
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: dark ? "#312E81" : "#EEF2FF",
                  color: dark ? "#A5B4FC" : "#4F46E5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <SchoolIcon size={16} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: isMobile ? 13 : 14,
                    fontWeight: 700,
                    color: dark ? "#F1F5F9" : "#1E293B",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {openedEcole?.nom ?? "École"}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: dark ? "#94A3B8" : "#64748B",
                  }}
                >
                  Code : {openedEcole?.code ?? "—"}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 20,
              background: dark ? "#78350F" : "#FEF3C7",
              color: dark ? "#FBBF24" : "#92400E",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.3,
              flexShrink: 0,
            }}
          >
            Mode Super Admin
          </div>
        </div>

        {/* ═══════════ Rendu AdminApp ═══════════ */}
        <AdminApp
          user={ecoleUser}
          ecoleId={openedEcoleId}
          eleves={eleves}
          addEleve={addEleve}
          removeEleve={removeEleve}
          importEleves={importEleves}
          classes={classes}
          addClasse={addClasse}
          removeClasse={removeClasse}
          fautes={fautes}
          addFaute={addFaute}
          updateFaute={updateFaute}
          removeFaute={removeFaute}
          sanctions={sanctions}
          users={users}
          frais={frais}
          anneeActive={anneeActive}
          anneeId={dataAnneeId}
          onAnneeChange={setSelectedAnneeId}
          dark={dark}
          toggle={toggle}
          handleLogout={handleLogout}
        />

        {openedEcoleId && (
          <NotificationsManager
            user={ecoleUser}
            ecoleId={openedEcoleId}
            enfants={enfants}
            punitionsEnfants={punitionsEnfants}
            fautes={fautes}
          />
        )}
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // SUPER ADMIN — DASHBOARD V2
  // ════════════════════════════════════════════════════════════════════
  if (isSuperAdmin) {
    return (
      <>
        {AuthenticatedAppKeyframes}
        <NotifBanner notifs={notifs} />
        <SuperAdminDashboard
          user={effectiveUser}
          onLogout={handleLogout}
          onSelectEcole={setOpenedEcoleId}
        />
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // ÉCRAN ÉCOLE (rôles non-super-admin)
  // ════════════════════════════════════════════════════════════════════
  return (
    <>
      {AuthenticatedAppKeyframes}

      {/* ✨ Bandeau impersonation — sticky top */}
      {isImpersonating && <ImpersonationBanner />}

      <NotifBanner notifs={notifs} />

      {ecoleId && (
        <NotificationsManager
          user={effectiveUser}
          ecoleId={ecoleId}
          enfants={enfants}
          punitionsEnfants={punitionsEnfants}
          fautes={fautes}
        />
      )}

      {outgoingCall && !localActiveCall && (
        <OutgoingCallModal
          callId={outgoingCall._id}
          calleeId={outgoingCall.calleeId}
          onCancel={handleCancelCall}
        />
      )}

      {effectiveUser?.role === "disciplinaire" && (
        <DisciplinaireApp
          user={effectiveUser}
          ecoleId={ecoleId}
          punitions={punitions}
          eleves={eleves}
          fautes={fautes}
          sanctions={sanctions}
          onNotif={handleNotif}
          anneeActive={anneeActive}
          anneeId={dataAnneeId}
          dark={dark}
          toggle={toggle}
          handleLogout={handleLogout}
        />
      )}

      {effectiveUser?.role === "directeur" && (
        <DirecteurApp
          user={effectiveUser}
          punitions={punitions}
          eleves={eleves}
          classes={classes}
          fautes={fautes}
          notifs={notifs}
          anneeActive={anneeActive}
          anneeId={dataAnneeId}
          dark={dark}
          toggle={toggle}
          handleLogout={handleLogout}
        />
      )}

      {effectiveUser?.role === "admin" && (
        <AdminApp
          user={effectiveUser}
          ecoleId={ecoleId}
          eleves={eleves}
          addEleve={addEleve}
          removeEleve={removeEleve}
          importEleves={importEleves}
          classes={classes}
          addClasse={addClasse}
          removeClasse={removeClasse}
          fautes={fautes}
          addFaute={addFaute}
          updateFaute={updateFaute}
          removeFaute={removeFaute}
          sanctions={sanctions}
          users={users}
          frais={frais}
          anneeActive={anneeActive}
          anneeId={dataAnneeId}
          onAnneeChange={setSelectedAnneeId}
          dark={dark}
          toggle={toggle}
          handleLogout={handleLogout}
        />
      )}

      {effectiveUser?.role === "parent" && (
        <ParentApp
          user={effectiveUser}
          ecoleId={ecoleId}
          eleves={enfants}
          punitions={punitionsEnfants}
          fautes={fautes}
          anneeActive={anneeActive}
          anneeId={anneeId}
          dark={dark}
          toggle={toggle}
          handleLogout={handleLogout}
        />
      )}

      {effectiveUser?.role === "enseignant" && (
        <EnseignantApp
          user={effectiveUser}
          ecoleId={ecoleId}
          eleves={eleves}
          classes={classes}
          anneeActive={anneeActive}
          anneeId={dataAnneeId}
          dark={dark}
          toggle={toggle}
          handleLogout={handleLogout}
        />
      )}

      {effectiveUser?.role === "comptable" && (
        <ComptableApp
          user={effectiveUser}
          ecoleId={ecoleId}
          eleves={eleves}
          anneeActive={anneeActive}
          anneeId={dataAnneeId}
          dark={dark}
          toggle={toggle}
          handleLogout={handleLogout}
        />
      )}

      {effectiveUser?.role === "eleve" && (
        <EleveApp
          user={effectiveUser}
          ecoleId={ecoleId}
          anneeActive={anneeActive}
          anneeId={anneeId}
          dark={dark}
          toggle={toggle}
          handleLogout={handleLogout}
        />
      )}

      {pendingCall && ecoleId && userId && (
        <IncomingCallModal
          callerId={pendingCall.callerId}
          onAccept={() => acceptCall({ callId: pendingCall._id, userId })}
          onReject={() => rejectCall({ callId: pendingCall._id, userId })}
        />
      )}
    </>
  );
}