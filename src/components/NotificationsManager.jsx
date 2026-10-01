// src/components/NotificationsManager.jsx
import { useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useNotifications } from "@/hooks/useNotifications";
import { getFaute } from "../utils";

// ════════════════════════════════════════════════════════════════════
// COMPOSANT — headless (retourne null, ne fait que déclencher des notifs)
// ════════════════════════════════════════════════════════════════════
export function NotificationsManager({
  user,
  ecoleId,
  enfants,
  punitionsEnfants,
  fautes,
}) {
  const { notify } = useNotifications(true);

  const userId = user?._id;
  const userRole = user?.role;

  // ✅ Callback stable pour notify (évite les re-runs d'effets si notify est instable)
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  // ════════════════════════════════════════════════════════════════════
  // 1. MESSAGES REÇUS
  // ════════════════════════════════════════════════════════════════════
  const messagesRaw = useQuery(
    api.messages.listRecus,
    userId ? { destinataireId: userId, userId } : "skip"
  );

  const messagesRecus = useMemo(() => messagesRaw ?? [], [messagesRaw]);

  // ✅ Set d'IDs vus (mémoire légère, lookup O(1))
  const seenMessageIdsRef = useRef(new Set());

  useEffect(() => {
    if (!userId) return;
    if (messagesRecus.length === 0) return;

    const seen = seenMessageIdsRef.current;
    const newMessages = [];

    for (const msg of messagesRecus) {
      if (seen.has(msg._id)) continue;
      seen.add(msg._id);
      if (msg.expediteurId === userId) continue;
      newMessages.push(msg);
    }

    // Marquer TOUS les IDs comme vus (même les siens), pour ne pas re-notifier
    if (newMessages.length === 0) return;

    for (const msg of newMessages) {
      const preview = (msg.contenu || "").toString().slice(0, 100);
      notifyRef.current("Nouveau message", {
        body: preview || "Vous avez reçu un message",
        tag: msg._id,
      });
    }
  }, [messagesRecus, userId]);

  // ════════════════════════════════════════════════════════════════════
  // 2. PUNITIONS ENFANTS (parents uniquement)
  // ════════════════════════════════════════════════════════════════════
  // ✅ Map mémoïsée pour lookup O(1) sans recréation à chaque effet
  const enfantsById = useMemo(
    () => new Map((enfants ?? []).map((e) => [e._id, e])),
    [enfants]
  );

  const seenPunitionIdsRef = useRef(new Set());

  useEffect(() => {
    if (!userId) return;
    if (userRole !== "parent") return;
    if (!punitionsEnfants || punitionsEnfants.length === 0) return;

    const seen = seenPunitionIdsRef.current;

    for (const p of punitionsEnfants) {
      if (seen.has(p._id)) continue;
      seen.add(p._id);

      const faute = getFaute(fautes, p.idFaute);
      if (faute?.gravite !== "Grave") continue;

      const eleve = enfantsById.get(p.idEleve);
      notifyRef.current("Punition grave", {
        body: `${eleve?.nom ?? "Un enfant"} : ${faute.libelle}`,
        tag: p._id,
      });
    }
  }, [punitionsEnfants, enfantsById, fautes, userRole, userId]);

  // ════════════════════════════════════════════════════════════════════
  // 3. APPEL ENTRANT
  // ════════════════════════════════════════════════════════════════════
  const pendingCall = useQuery(
    api.appels.getPendingCall,
    userId ? { userId } : "skip"
  );

  const prevCallIdRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    const currentId = pendingCall?._id ?? null;
    const isNewCall = currentId && currentId !== prevCallIdRef.current;

    if (isNewCall) {
      notifyRef.current("Appel entrant", {
        body: "Quelqu'un vous appelle",
        tag: currentId,
      });
    }

    prevCallIdRef.current = currentId;
  }, [pendingCall, userId]);

  return null;
}