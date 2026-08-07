import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { useStyles } from "../styles/theme";
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
import { getFaute } from "../utils";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationsManager } from "./NotificationsManager";
import toast from "react-hot-toast";
import { useIsMobile } from "../hooks/useIsMobile";

// Petit hook pour la navigation historique (utilisé en interne)
function useHistoryNavigation(onBack) {
  useEffect(() => {
    const handlePopState = () => {
      onBack();
    };
    window.addEventListener("popstate", handlePopState);
    // Pousser un état initial pour éviter de quitter l'appli au premier back
    if (window.history.state === null) {
      window.history.pushState(null, "", window.location.href);
    }
    return () => window.removeEventListener("popstate", handlePopState);
  }, [onBack]);
}

export function AuthenticatedApp({ user, handleLogout }) {
  const { S, dark, toggle } = useStyles();
  const isMobile = useIsMobile();
  const { notify } = useNotifications();

  const isSuperAdmin = user.role === "admin" && !user.ecoleId;

  // Pile de navigation pour les écrans principaux (superadmin / école)
  const [screenStack, setScreenStack] = useState([
    isSuperAdmin ? "superadmin" : "ecole",
  ]);
  const currentScreen = screenStack[screenStack.length - 1];

  // État pour l'école sélectionnée (quand on est dans l'écran "ecole")
  const [selectedEcoleId, setSelectedEcoleId] = useState(
    isSuperAdmin ? null : user.ecoleId
  );

  // Fonctions de navigation
  const pushScreen = useCallback((newScreen) => {
    setScreenStack((prev) => [...prev, newScreen]);
    window.history.pushState(null, "", window.location.href);
  }, []);

  const popScreen = useCallback(() => {
    setScreenStack((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  // Gestion du bouton retour navigateur
  useHistoryNavigation(popScreen);

  // Gestion du bouton retour mobile (APK)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = App.addListener("backButton", () => {
      if (screenStack.length > 1) {
        popScreen();
      } else {
        // On est à la racine : proposer de quitter
        if (window.confirm("Voulez-vous quitter l'application ?")) {
          App.exitApp();
        }
      }
    });
    return () => listener.remove();
  }, [screenStack, popScreen]);

  // ----- Données globales (appels, année, etc.) -----
  const pendingCall = useQuery(api.appels.getPendingCall, { userId: user._id });
  const activeCallFromConvex = useQuery(api.appels.getActiveCall, { userId: user._id });
  const outgoingCall = useQuery(api.appels.getOutgoingCall, { userId: user._id });
  const acceptCall = useMutation(api.appels.acceptCall);
  const rejectCall = useMutation(api.appels.rejectCall);
  const endCall = useMutation(api.appels.endCall);

  const [localActiveCall, setLocalActiveCall] = useState(null);
  useEffect(() => {
    if (activeCallFromConvex) {
      setLocalActiveCall(activeCallFromConvex);
    } else {
      setLocalActiveCall(null);
    }
  }, [activeCallFromConvex]);

  const handleCallEnd = () => setLocalActiveCall(null);

  const handleCancelCall = async () => {
    if (outgoingCall) {
      await endCall({ callId: outgoingCall._id, userId: user._id });
      toast("Appel annulé");
    }
  };

  const anneeActiveQuery = useQuery(
    api.anneesScolaires.getActive,
    selectedEcoleId ? { ecoleId: selectedEcoleId } : "skip"
  );
  const [anneeActive, setAnneeActive] = useState(null);
  useEffect(() => {
    if (anneeActiveQuery) setAnneeActive(anneeActiveQuery);
  }, [anneeActiveQuery]);
  const anneeId = anneeActive?._id || undefined;

  const [notifs, setNotifs] = useState([]);
  const handleNotif = (msg) => setNotifs((prev) => [...prev, msg]);

  // Données liées à l'école
  const ecoleId = selectedEcoleId || user.ecoleId;

  const ecoles = isSuperAdmin ? useQuery(api.ecoles.list) ?? [] : [];
  const eleves = useQuery(
    api.eleves.list,
    ecoleId && anneeId ? { ecoleId, anneeId } : "skip"
  ) ?? [];
  const classes = useQuery(
    api.classes.list,
    ecoleId && anneeId ? { ecoleId, anneeId } : "skip"
  ) ?? [];
  const fautes = useQuery(api.fautes.list, ecoleId ? { ecoleId } : "skip") ?? [];
  const punitions = useQuery(
    api.punitions.list,
    ecoleId && anneeId ? { ecoleId, anneeId } : "skip"
  ) ?? [];
  const sanctions = useQuery(api.sanctions.list, ecoleId ? { ecoleId } : "skip") ?? [];
  const users = useQuery(api.users.listByEcole, ecoleId ? { ecoleId } : "skip") ?? [];
  const frais = useQuery(
    api.frais.listByEcole,
    ecoleId && anneeId ? { ecoleId, anneeId } : "skip"
  ) ?? [];

  const enfants = useQuery(
    api.eleves.listByParent,
    user.role === "parent" && anneeId
      ? { parentId: user._id, anneeId }
      : "skip"
  ) ?? [];
  const eleveIds = enfants.map((e) => e._id);
  const punitionsEnfants = useQuery(
    api.punitions.listByEleves,
    user.role === "parent" && anneeId ? { eleveIds, anneeId } : "skip"
  ) ?? [];

  // Mutations
  const addEleve = useMutation(api.eleves.add);
  const removeEleve = useMutation(api.eleves.remove);
  const importEleves = useMutation(api.eleves.importEleves);
  const addClasse = useMutation(api.classes.add);
  const removeClasse = useMutation(api.classes.remove);
  const addFaute = useMutation(api.fautes.add);
  const updateFaute = useMutation(api.fautes.update);
  const removeFaute = useMutation(api.fautes.remove);
  const addPunition = useMutation(api.punitions.add);

  // Notifications
  useEffect(() => {
    if (!notifs.length) return;
    const t = setTimeout(() => setNotifs([]), 4000);
    return () => clearTimeout(t);
  }, [notifs]);

  const prevPunitionsEnfantsRef = useRef([]);
  useEffect(() => {
    if (user.role !== "parent" || punitionsEnfants.length === 0) return;
    const prev = prevPunitionsEnfantsRef.current;
    const newPunitions = punitionsEnfants.filter(
      (p) => !prev.some((old) => old._id === p._id)
    );
    for (const p of newPunitions) {
      const eleve = enfants.find((e) => e._id === p.idEleve);
      const faute = getFaute(fautes, p.idFaute);
      if (faute?.gravite === "Grave")
        notify(
          `⚠️ Nouvelle punition grave pour ${eleve?.nom} ${eleve?.postnom} : ${faute.libelle}`
        );
    }
    prevPunitionsEnfantsRef.current = punitionsEnfants;
  }, [punitionsEnfants, user.role, enfants, fautes]);

  // Si un appel vidéo est actif, on l'affiche prioritairement
  if (localActiveCall) {
    return (
      <AppelVideo
        channelName={localActiveCall.channelName}
        userId={user._id}
        callId={localActiveCall._id}
        onCallEnd={handleCallEnd}
      />
    );
  }

  // Rendu selon l'écran courant
  if (currentScreen === "superadmin") {
    return (
      <>
        <NotifBanner notifs={notifs} />
        <div style={S.wrapper}>
          <div style={S.navbar}>
            <div style={S.navbarBrand}>School Management</div>
            <div style={{ fontWeight: 600, color: S.textMuted }}>Super Admin</div>
          </div>
          <div style={S.main}>
            <SuperAdminDashboard
              onSelectEcole={(id) => {
                setSelectedEcoleId(id);
                pushScreen("ecole");
              }}
              user={user}
            />
          </div>
        </div>
      </>
    );
  }

  // Écran école (interface en fonction du rôle)
  if (currentScreen === "ecole") {
    if (
      anneeId &&
      ecoleId &&
      (eleves === undefined ||
        classes === undefined ||
        fautes === undefined ||
        punitions === undefined ||
        sanctions === undefined ||
        users === undefined ||
        frais === undefined)
    ) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f5f7fb",
            fontFamily: "'Inter', sans-serif",
            color: S.textMuted,
          }}
        >
          Chargement...
        </div>
      );
    }

    return (
      <>
        <NotifBanner notifs={notifs} />

        {isSuperAdmin && (
          <div style={{ 
            maxWidth: 1280, 
            margin: "0 auto", 
            padding: "16px 24px 0",
            display: isMobile ? "none" : "block"   // caché sur mobile
          }}>
            <button
              onClick={() => {
                setSelectedEcoleId(null);
                popScreen(); // revenir à superadmin
              }}
              style={{
                background: "#FFF",
                border: "1px solid #E2E8F0",
                color: "#4F46E5",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ← Retour aux écoles
            </button>
          </div>
        )}

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

        {user.role === "disciplinaire" && (
          <DisciplinaireApp
            user={user}
            ecoleId={ecoleId}
            punitions={punitions}
            addPunition={addPunition}
            eleves={eleves}
            classes={classes}
            fautes={fautes}
            sanctions={sanctions}
            onNotif={handleNotif}
            anneeActive={anneeActive}
            anneeId={anneeId}
            dark={dark}
            toggle={toggle}
            handleLogout={handleLogout}
          />
        )}
        {user.role === "directeur" && (
          <DirecteurApp
            user={user}
            punitions={punitions}
            eleves={eleves}
            classes={classes}
            fautes={fautes}
            notifs={notifs}
            anneeActive={anneeActive}
            anneeId={anneeId}
            dark={dark}
            toggle={toggle}
            handleLogout={handleLogout}
          />
        )}
        {user.role === "admin" && (
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
            anneeId={anneeId}
            dark={dark}
            toggle={toggle}
            handleLogout={handleLogout}
          />
        )}
        {user.role === "parent" && (
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
        {user.role === "enseignant" && (
          <EnseignantApp
            user={user}
            ecoleId={ecoleId}
            eleves={eleves}
            classes={classes}
            anneeActive={anneeActive}
            anneeId={anneeId}
            dark={dark}
            toggle={toggle}
            handleLogout={handleLogout}
          />
        )}
        {user.role === "comptable" && (
          <ComptableApp
            user={user}
            ecoleId={ecoleId}
            eleves={eleves}
            anneeActive={anneeActive}
            anneeId={anneeId}
            dark={dark}
            toggle={toggle}
            handleLogout={handleLogout}
          />
        )}
        {user.role === "eleve" && (
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

        {pendingCall && ecoleId && (
          <IncomingCallModal
            callerId={pendingCall.callerId}
            onAccept={() =>
              acceptCall({ callId: pendingCall._id, userId: user._id })
            }
            onReject={() =>
              rejectCall({ callId: pendingCall._id, userId: user._id })
            }
          />
        )}
      </>
    );
  }

  return null;
}