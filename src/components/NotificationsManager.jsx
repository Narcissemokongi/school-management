import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useNotifications } from "@/hooks/useNotifications";
import { getFaute } from "../utils";

export function NotificationsManager({ user, ecoleId, enfants, punitionsEnfants, fautes }) {
  const { notify } = useNotifications(true);

  const messagesRecus = useQuery(api.messages.listRecus, { destinataireId: user._id }) ?? [];
  const prevMessagesRef = useRef([]);

  useEffect(() => {
    const prev = prevMessagesRef.current;
    const newMessages = messagesRecus.filter((m) => !prev.some((old) => old._id === m._id));
    for (const msg of newMessages) {
      if (msg.expediteurId === user._id) continue;
      notify(`📩 Nouveau message`, {
        body: msg.contenu.substring(0, 100),
        tag: msg._id,
      });
    }
    prevMessagesRef.current = messagesRecus;
  }, [messagesRecus]);

  const prevPunitionsEnfantsRef = useRef([]);
  useEffect(() => {
    if (user.role !== "parent" || !punitionsEnfants || punitionsEnfants.length === 0) return;
    const prev = prevPunitionsEnfantsRef.current;
    const newPunitions = punitionsEnfants.filter((p) => !prev.some((old) => old._id === p._id));
    for (const p of newPunitions) {
      const eleve = enfants?.find((e) => e._id === p.idEleve);
      const faute = getFaute(fautes, p.idFaute);
      if (faute?.gravite === "Grave") {
        notify(`⚠️ Punition grave`, {
          body: `${eleve?.nom ?? "Un enfant"} : ${faute.libelle}`,
          tag: p._id,
        });
      }
    }
    prevPunitionsEnfantsRef.current = punitionsEnfants;
  }, [punitionsEnfants]);

  const pendingCall = useQuery(api.appels.getPendingCall, { userId: user._id });
  const prevCallRef = useRef(null);

  useEffect(() => {
    if (pendingCall && pendingCall._id !== prevCallRef.current?._id) {
      notify(`📞 Appel entrant`, {
        body: "Quelqu'un vous appelle",
        tag: pendingCall._id,
      });
    }
    prevCallRef.current = pendingCall;
  }, [pendingCall]);

  return null;
}