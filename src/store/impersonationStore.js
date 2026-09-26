// src/store/impersonationStore.js
import { create } from "zustand";

const STORAGE_KEY = "edu_impersonation_session";
const MAX_DURATION_MS = 4 * 60 * 60 * 1000; // 4h

export const useImpersonationStore = create((set, get) => ({
  session: null,

  start: (originalUser, targetUser) => {
    const session = {
      originalUser,
      targetUser,
      ecoleId: targetUser.ecoleId,
      startedAt: Date.now(),
    };
    set({ session });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn("[impersonation] localStorage write failed:", e);
    }
  },

  end: () => {
    set({ session: null });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("[impersonation] localStorage remove failed:", e);
    }
  },

  restore: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const session = JSON.parse(raw);
      if (!session || !session.originalUser || !session.targetUser) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      if (Date.now() - session.startedAt > MAX_DURATION_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      set({ session });
    } catch (e) {
      console.warn("[impersonation] restore failed:", e);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  },

  getEffectiveUser: (realUser) => {
    const { session } = get();
    return session?.targetUser ?? realUser;
  },
}));

export default useImpersonationStore;