import { useEffect, useRef, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useNotifications } from "@/hooks/useNotifications";
import { getFaute } from "../utils";

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

  // ============================================================
  // MESSAGES REÇUS
  // ============================================================
  const messagesRaw = useQuery(
    api.messages.listRecus,
    userId ? { destinataireId: userId, userId } : "skip"
  );

  // ✅ Mémoïsation pour éviter la re-création de ref à chaque render
  const messagesRecus = useMemo(() => messagesRaw ?? [], [messagesRaw]);
  const prevMessagesRef = useRef([]);

  useEffect(() => {
    if (messagesRecus.length === 0) return;
    if (!userId) return;

    const prev = prevMessagesRef.current;
    const prevIds = new Set(prev.map((m) => m._id));

    for (const msg of messagesRecus) {
      if (prevIds.has(msg._id)) continue;
      if (msg.expediteurId === userId) continue;

      const preview = (msg.contenu || "").toString().slice(0, 100);
      notify("Nouveau message", {
        body: preview || "Vous avez reçu un message",
        tag: msg._id,
      });
    }

    prevMessagesRef.current = messagesRecus;
  }, [messagesRecus, userId, notify]);

  // ============================================================
  // PUNITIONS ENFANTS (parents uniquement)
  // ============================================================
  const prevPunitionsEnfantsRef = useRef([]);

  useEffect(() => {
    if (userRole !== "parent") return;
    if (!userId) return;
    if (!punitionsEnfants || punitionsEnfants.length === 0) return;

    const prev = prevPunitionsEnfantsRef.current;
    const prevIds = new Set(prev.map((p) => p._id));

    const enfantsById = new Map((enfants ?? []).map((e) => [e._id, e]));

    for (const p of punitionsEnfants) {
      if (prevIds.has(p._id)) continue;

      const eleve = enfantsById.get(p.idEleve);
      const faute = getFaute(fautes, p.idFaute);

      if (faute?.gravite === "Grave") {
        notify("Punition grave", {
          body: `${eleve?.nom ?? "Un enfant"} : ${faute.libelle}`,
          tag: p._id,
        });
      }
    }

    prevPunitionsEnfantsRef.current = punitionsEnfants;
  }, [
    punitionsEnfants,
    enfants,
    fautes,
    userRole,
    userId,
    notify,
  ]);

  // ============================================================
  // APPEL ENTRANT
  // ============================================================
  const pendingCall = useQuery(
    api.appels.getPendingCall,
    userId ? { userId } : "skip"
  );

  const prevCallRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    const isNewCall =
      pendingCall && pendingCall._id !== prevCallRef.current?._id;

    if (isNewCall) {
      notify("Appel entrant", {
        body: "Quelqu'un vous appelle",
        tag: pendingCall._id,
      });
    }

    prevCallRef.current = pendingCall;
  }, [pendingCall, userId, notify]);

  return null;
}