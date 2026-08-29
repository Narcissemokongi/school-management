import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Preferences } from '@capacitor/preferences';

// Détecter si nous sommes sur une plateforme native Capacitor
const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

// Storage adaptatif : utilise Preferences sur natif, localStorage sur web
const storage = {
  getItem: async (name) => {
    if (isNative) {
      const { value } = await Preferences.get({ key: name });
      return value ?? null;
    }
    return localStorage.getItem(name);
  },
  setItem: async (name, value) => {
    if (isNative) {
      await Preferences.set({ key: name, value });
    } else {
      localStorage.setItem(name, value);
    }
  },
  removeItem: async (name) => {
    if (isNative) {
      await Preferences.remove({ key: name });
    } else {
      localStorage.removeItem(name);
    }
  },
};

export const useAppStore = create(
  persist(
    (set) => ({
      // ========== ÉTATS GÉNÉRAUX ==========
      activeTab: 'accueil',               // onglet générique
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      formData: {},                        // stockage générique de formulaires
      filters: {},                         // filtres génériques

      // ========== ÉTATS PAR RÔLE ==========
      // Admin
      adminTab: 'accueil',
      adminDirty: false,
      adminPendingTab: null,

      // Directeur
      directeurTab: 'accueil',

      // Disciplinaire
      disciplinaireTab: 'accueil',

      // Enseignant
      enseignantTab: 'dashboard',
      enseignantSelectedCours: null,

      // Comptable
      comptableTab: 'dashboard',
      comptableSearchTerm: '',
      comptableFilterStatut: 'all',
      comptableCurrentPage: 1,

      // Parent
      parentTab: 'enfants',
      parentSelectedEnfant: null,
      parentSearchEnfant: '',
      parentShowAddChild: false,

      // Élève
      eleveTab: 'accueil',

      // SuperAdmin
      superadminActiveSection: 'overview',
      superadminSearchTerm: '',
      superadminSchoolFilter: 'all',
      superadminSchoolView: 'table',
      superadminPendingFilterRole: 'all',
      superadminPendingSearch: '',
      superadminCurrentPage: 1,
      superadminSelectedSchoolIds: [],

      // Paramètres (admin école)
      parametresTab: 'profil',

      // Saisir absence
      saisirAbsenceSelectedEleve: null,
      saisirAbsenceType: 'absence',
      saisirAbsenceDate: new Date().toISOString().split("T")[0],
      saisirAbsenceCommentaire: '',
      saisirAbsenceSearch: '',

      // Saisir punition
      saisirPunitionSearch: '',
      saisirPunitionSelectedEleve: null,
      saisirPunitionIdFaute: '',
      saisirPunitionDate: new Date().toISOString().split("T")[0],
      saisirPunitionCommentaire: '',
      saisirPunitionSanction: '',
      saisirPunitionGraviteFilter: 'toutes',

      // Contact de messagerie partagé
      messagingContactId: null,

      // ========== ACTIONS ==========
      // Général
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
      setFormData: (data) => set({ formData: data }),
      setFilters: (filters) => set({ filters }),
      setMessagingContactId: (id) => set({ messagingContactId: id }),

      // Admin
      setAdminTab: (tab) => set({ adminTab: tab }),
      setAdminDirty: (dirty) => set({ adminDirty: dirty }),
      setAdminPendingTab: (tab) => set({ adminPendingTab: tab }),

      // Directeur
      setDirecteurTab: (tab) => set({ directeurTab: tab }),

      // Disciplinaire
      setDisciplinaireTab: (tab) => set({ disciplinaireTab: tab }),

      // Enseignant
      setEnseignantTab: (tab) => set({ enseignantTab: tab }),
      setEnseignantSelectedCours: (cours) => set({ enseignantSelectedCours: cours }),

      // Comptable
      setComptableTab: (tab) => set({ comptableTab: tab }),
      setComptableSearchTerm: (term) => set({ comptableSearchTerm: term }),
      setComptableFilterStatut: (statut) => set({ comptableFilterStatut: statut }),
      setComptableCurrentPage: (page) => set({ comptableCurrentPage: page }),

      // Parent
      setParentTab: (tab) => set({ parentTab: tab }),
      setParentSelectedEnfant: (enfant) => set({ parentSelectedEnfant: enfant }),
      setParentSearchEnfant: (search) => set({ parentSearchEnfant: search }),
      setParentShowAddChild: (show) => set({ parentShowAddChild: show }),

      // Élève
      setEleveTab: (tab) => set({ eleveTab: tab }),

      // SuperAdmin
      setSuperadminActiveSection: (section) => set({ superadminActiveSection: section }),
      setSuperadminSearchTerm: (term) => set({ superadminSearchTerm: term }),
      setSuperadminSchoolFilter: (filter) => set({ superadminSchoolFilter: filter }),
      setSuperadminSchoolView: (view) => set({ superadminSchoolView: view }),
      setSuperadminPendingFilterRole: (role) => set({ superadminPendingFilterRole: role }),
      setSuperadminPendingSearch: (search) => set({ superadminPendingSearch: search }),
      setSuperadminCurrentPage: (page) => set({ superadminCurrentPage: page }),
      setSuperadminSelectedSchoolIds: (ids) => set({ superadminSelectedSchoolIds: ids }),

      // Paramètres
      setParametresTab: (tab) => set({ parametresTab: tab }),

      // Saisir absence
      setSaisirAbsenceSelectedEleve: (eleve) => set({ saisirAbsenceSelectedEleve: eleve }),
      setSaisirAbsenceType: (type) => set({ saisirAbsenceType: type }),
      setSaisirAbsenceDate: (date) => set({ saisirAbsenceDate: date }),
      setSaisirAbsenceCommentaire: (commentaire) => set({ saisirAbsenceCommentaire: commentaire }),
      setSaisirAbsenceSearch: (search) => set({ saisirAbsenceSearch: search }),

      // Saisir punition
      setSaisirPunitionSearch: (search) => set({ saisirPunitionSearch: search }),
      setSaisirPunitionSelectedEleve: (eleve) => set({ saisirPunitionSelectedEleve: eleve }),
      setSaisirPunitionIdFaute: (id) => set({ saisirPunitionIdFaute: id }),
      setSaisirPunitionDate: (date) => set({ saisirPunitionDate: date }),
      setSaisirPunitionCommentaire: (commentaire) => set({ saisirPunitionCommentaire: commentaire }),
      setSaisirPunitionSanction: (sanction) => set({ saisirPunitionSanction: sanction }),
      setSaisirPunitionGraviteFilter: (filter) => set({ saisirPunitionGraviteFilter: filter }),

      // Reset complet
      resetAll: () => set({
        activeTab: 'accueil',
        sidebarCollapsed: false,
        mobileSidebarOpen: false,
        formData: {},
        filters: {},
        adminTab: 'accueil',
        adminDirty: false,
        adminPendingTab: null,
        directeurTab: 'accueil',
        disciplinaireTab: 'accueil',
        enseignantTab: 'dashboard',
        enseignantSelectedCours: null,
        comptableTab: 'dashboard',
        comptableSearchTerm: '',
        comptableFilterStatut: 'all',
        comptableCurrentPage: 1,
        parentTab: 'enfants',
        parentSelectedEnfant: null,
        parentSearchEnfant: '',
        parentShowAddChild: false,
        eleveTab: 'accueil',
        superadminActiveSection: 'overview',
        superadminSearchTerm: '',
        superadminSchoolFilter: 'all',
        superadminSchoolView: 'table',
        superadminPendingFilterRole: 'all',
        superadminPendingSearch: '',
        superadminCurrentPage: 1,
        superadminSelectedSchoolIds: [],
        parametresTab: 'profil',
        saisirAbsenceSelectedEleve: null,
        saisirAbsenceType: 'absence',
        saisirAbsenceDate: new Date().toISOString().split("T")[0],
        saisirAbsenceCommentaire: '',
        saisirAbsenceSearch: '',
        saisirPunitionSearch: '',
        saisirPunitionSelectedEleve: null,
        saisirPunitionIdFaute: '',
        saisirPunitionDate: new Date().toISOString().split("T")[0],
        saisirPunitionCommentaire: '',
        saisirPunitionSanction: '',
        saisirPunitionGraviteFilter: 'toutes',
        messagingContactId: null,
      }),
    }),
    {
      name: 'app-storage',
      getStorage: () => storage,
    }
  )
);