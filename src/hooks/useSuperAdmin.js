// src/hooks/useSuperAdmin.js
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useMemo, useCallback } from "react";
import toast from "react-hot-toast";

export function useSuperAdmin(userId) {
  // Queries
  const ecolesRaw = useQuery(api.ecoles.listWithUserCount, userId ? { userId } : "skip");
  const statsRaw = useQuery(api.stats.globalStats, userId ? { userId } : "skip");
  const pendingRaw = useQuery(api.users.listAllPendingUsers, userId ? { userId } : "skip");

  const ecoles = useMemo(() => ecolesRaw ?? [], [ecolesRaw]);
  const stats = useMemo(() => statsRaw ?? {}, [statsRaw]);
  const pending = useMemo(() => pendingRaw ?? [], [pendingRaw]);
  const loading = ecolesRaw === undefined || statsRaw === undefined || pendingRaw === undefined;

  // Mutations
  const addEcole = useMutation(api.ecoles.add);
  const removeEcole = useMutation(api.ecoles.remove);
  const suspendEcole = useMutation(api.ecoles.suspendEcole);
  const reactiverEcole = useMutation(api.ecoles.reactiverEcole);

  const actions = useMemo(() => ({
    add: (nom) => addEcole({ nom, userId }),
    remove: (ecoleId) => removeEcole({ ecoleId, userId }),
    suspend: (ecoleId) => suspendEcole({ ecoleId, userId }),
    reactivate: (ecoleId) => reactiverEcole({ ecoleId, userId }),
  }), [addEcole, removeEcole, suspendEcole, reactiverEcole, userId]);

  return { ecoles, stats, pending, loading, actions };
}