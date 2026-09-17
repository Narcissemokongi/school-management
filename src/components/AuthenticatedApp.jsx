// src/components/AuthenticatedApp.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@convex/_generated/api";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { useStyles } from "@/styles/theme";
import { NotifBanner } from "./NotifBanner";
import { SuperAdminDashboard } from "./superadmin/SuperAdminDashboard";
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
// CHEMINS PAR DÉFAUT PAR RÔLE — Redirection initiale
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

  const userId = user?._id;

  // ✅ SuperAdmin : rôle + admin sans école
  const isSuperAdmin = useMemo(
    () =>
      user?.role === "superAdmin" ||
      (user?.role === "admin" && !user?.ecoleId),
    [user?.role, user?.ecoleId]
  );

  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX MAJEUR — Navigation 100% URL
  // ════════════════════════════════════════════════════════════════════
  const screenConfig = useMemo(() => {
    const path = location.pathname;

    if (isSuperAdmin) {
      // Super admin : toujours dans SuperAdminDashboard (URL /super-admin/*)
      // Le sous-écran est géré par SuperAdminDashboard elle-même.
      return { screen: "superadmin", ecoleId: null };
    }

    // Non-superadmin → toujours l'écran école de leur propre école
    return { screen: "ecole", ecoleId: user?.ecoleId || null };
  }, [location.pathname, user?.ecoleId, isSuperAdmin]);

  const currentScreen = screenConfig.screen;
  const selectedEcoleId = screenConfig.ecoleId;

  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX #3 — Redirection initiale selon rôle (une seule fois)
  // Évite le flash visuel au premier render + boucle perdue
  // ════════════════════════════════════════════════════════════════════
  const hasInitialRedirectRef = useRef(false);
  useEffect(() => {
    if (hasInitialRedirectRef.current) return;
    if (!userId) return;

    const path = location.pathname;

    // Si l'URL est déjà valide (pas racine), ne rien faire
    if (path && path !== "/" && path !== "") return;

    hasInitialRedirectRef.current = true;

    // Détermine le chemin par défaut
    const defaultPath = isSuperAdmin
      ? "/super-admin/overview"
      : ROLE_DEFAULT_PATHS[user?.role];

    if (defaultPath) {
      navigate(defaultPath, { replace: true });
    }
  }, [userId, location.pathname, isSuperAdmin, user?.role, navigate]);

  // ✅ Support Android back button (Capacitor)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = App.addListener("backButton", () => {
      if (currentScreen === "superadmin" && isSuperAdmin) {
        // Super admin sur le dashboard → quitter l'app
        if (window.confirm("Voulez-vous quitter l'application ?")) {
          App.exitApp();
        }
      } else {
        // Autres rôles → laisser React Router gérer
        navigate(-1);
      }
    });
    return () => listener.remove();
  }, [currentScreen, isSuperAdmin, navigate]);

  // ════════════════════════════════════════════════════════════════════
  // ANNÉE ACTIVE
  // ════════════════════════════════════════════════════════════════════
  const ecoleId = selectedEcoleId || user?.ecoleId;

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

  const dataAnneeId = user?.role === "admin" ? selectedAnneeId : anneeId;

  // ════════════════════════════════════════════════════════════════════
  // APPELS — args stables
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
  // QUERIES PRINCIPALES — args stables
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
      user?.role === "parent" && userId && anneeId
        ? { parentId: userId, anneeId, userId }
        : "skip",
    [user?.role, userId, anneeId]
  );

  const enfantsRaw = useQuery(api.eleves.listByParent, enfantsArgs);
  const enfants = useMemo(() => enfantsRaw ?? [], [enfantsRaw]);

  const eleveIds = useMemo(() => enfants.map((e) => e._id), [enfants]);

  const punitionsEnfantsArgs = useMemo(
    () =>
      user?.role === "parent" && userId && anneeId && eleveIds.length > 0
        ? { eleveIds, anneeId, userId }
        : "skip",
    [user?.role, userId, anneeId, eleveIds]
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
    if (user?.role !== "parent" || punitionsEnfants.length === 0) return;
    const prev = prevPunitionsEnfantsRef.current;
    const prevIds = new Set(prev.map((p) => p._id));

    const enfantsById = new Map(enfants.map((e) => [e._id, e]));
    const fautesById = new Map(fautes.map((f) => [f._id, f]));

    for (const p of punitionsEnfants) {
      if (prevIds.has(p._id)) continue;
      const eleve = enfantsById.get(p.idEleve);
      const faute = fautesById.get(p.idFaute);
      if (faute?.gravite === "Grave") {
        notify(
          `Nouvelle punition grave pour ${eleve?.nom} ${eleve?.postnom} : ${faute.libelle}`
        );
      }
    }
    prevPunitionsEnfantsRef.current = punitionsEnfants;
  }, [punitionsEnfants, user?.role, enfants, fautes, notify]);

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
  // ÉCRAN SUPERADMIN — toujours rendu pour un super admin
  // ════════════════════════════════════════════════════════════════════
  if (isSuperAdmin) {
    return (
      <>
        {AuthenticatedAppKeyframes}
        <NotifBanner notifs={notifs} />
        <div
          style={{
            width: "100%",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              width: "100%",
              padding: isMobile ? "12px 16px" : "12px 24px",
              background: dark ? "#0F172A" : "#FFFFFF",
              borderBottom: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxSizing: "border-box",
            }}
          >
            <div style={{ ...S.navbarBrand, fontSize: isMobile ? 16 : 18 }}>
              School Management
            </div>
            <div
              style={{
                fontWeight: 600,
                color: S.textMuted,
                fontSize: isMobile ? 13 : 14,
              }}
            >
              Super Admin
            </div>
          </div>

          <div style={{ flex: 1, width: "100%", overflow: "hidden" }}>
            <SuperAdminDashboard
              user={user}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // ÉCRAN ÉCOLE (rôles non-super-admin)
  // ════════════════════════════════════════════════════════════════════
  return (
    <>
      {AuthenticatedAppKeyframes}
      <NotifBanner notifs={notifs} />

      {ecoleId && (
        <NotificationsManager
          user={user}
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

      {user?.role === "disciplinaire" && (
        <DisciplinaireApp
          user={user}
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

      {user?.role === "directeur" && (
        <DirecteurApp
          user={user}
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

      {user?.role === "admin" && (
        <AdminApp
          user={user}
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

      {user?.role === "parent" && (
        <ParentApp
          user={user}
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

      {user?.role === "enseignant" && (
        <EnseignantApp
          user={user}
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

      {user?.role === "comptable" && (
        <ComptableApp
          user={user}
          ecoleId={ecoleId}
          eleves={eleves}
          anneeActive={anneeActive}
          anneeId={dataAnneeId}
          dark={dark}
          toggle={toggle}
          handleLogout={handleLogout}
        />
      )}

      {user?.role === "eleve" && (
        <EleveApp
          user={user}
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