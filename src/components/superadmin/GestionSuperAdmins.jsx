// src/components/GestionSuperAdmins.jsx
import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "../ConfirmDialog";
import toast from "react-hot-toast";
import {
  Plus, Trash2, Edit2, Save, X, ShieldCheck, Loader, Search,
  ChevronDown, ChevronUp, Lock, Unlock, Download, Upload,
  ChevronLeft, ChevronRight,
} from "lucide-react";

const PERMISSIONS_LIST = [
  { id: "gestion_ecoles", label: "Gérer les écoles" },
  { id: "gestion_demandes", label: "Approuver / rejeter les demandes" },
  { id: "gestion_statistiques", label: "Voir les statistiques globales" },
  { id: "gestion_utilisateurs", label: "Gérer les utilisateurs" },
  { id: "gestion_superadmins", label: "Gérer les super admins" },
  { id: "gestion_parametres", label: "Gérer les paramètres globaux" },
];

const PERMISSION_LABEL_TO_ID = Object.fromEntries(
  PERMISSIONS_LIST.map((p) => [p.label.toLowerCase(), p.id])
);

// ✅ Constantes module-level
const PAGE_SIZE = 5;
const TOTAL_PERMISSIONS = PERMISSIONS_LIST.length;
const MIN_PASSWORD_LENGTH = 8;

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES (module-level, injectés UNE SEULE FOIS)
// ════════════════════════════════════════════════════════════════════
const GsaKeyframes = (
  <style>{`
    @keyframes gsa-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .gsa-spin { animation: gsa-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .gsa-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// BADGE PERMISSION
// ════════════════════════════════════════════════════════════════════
function PermissionBadge({ label, dark }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        background: dark ? "#312E81" : "#EEF2FF",
        color: dark ? "#A5B4FC" : "#4F46E5",
        marginRight: 4,
        marginBottom: 4,
      }}
    >
      {label}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function GestionSuperAdmins({ user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const userId = user?._id;

  // ✅ SOLUTION C — détection du rôle Principal
  const isPrincipal =
    (user?.role === "admin" && !user?.ecoleId) ||
    (user?.role === "superAdmin" &&
      (!user?.permissions || user.permissions.length === 0));

  // ✅ Query avec userId + garde
  const superAdminsRaw = useQuery(
    api.users.listSuperAdmins,
    userId ? { userId } : "skip"
  );
  const superAdmins = useMemo(() => superAdminsRaw ?? [], [superAdminsRaw]);

  const createSuperAdmin = useMutation(api.users.createSuperAdmin);
  const updatePermissions = useMutation(api.users.updateSuperAdminPermissions);
  const removeSuperAdmin = useMutation(api.users.removeSuperAdmin);

  const [showCreate, setShowCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    nom: "",
    login: "",
    password: "",
    permissions: [],
  });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editPermissions, setEditPermissions] = useState([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");

  // ════════════════════════════════════════════════════════════════
  // TRI + FILTRAGE
  // ════════════════════════════════════════════════════════════════
  const filteredAdmins = useMemo(() => {
    let result = superAdmins;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          (a.nom ?? "").toLowerCase().includes(q) ||
          (a.login ?? "").toLowerCase().includes(q) ||
          (a.permissions || []).some((p) => {
            const label =
              PERMISSIONS_LIST.find((perm) => perm.id === p)?.label || p;
            return label.toLowerCase().includes(q);
          })
      );
    }
    return [...result].sort((a, b) => {
      if (sortBy === "nom") {
        const an = (a.nom ?? "").toLowerCase();
        const bn = (b.nom ?? "").toLowerCase();
        return sortOrder === "asc" ? an.localeCompare(bn) : bn.localeCompare(an);
      }
      if (sortBy === "login") {
        const al = (a.login ?? "").toLowerCase();
        const bl = (b.login ?? "").toLowerCase();
        return sortOrder === "asc" ? al.localeCompare(bl) : bl.localeCompare(al);
      }
      if (sortBy === "permissions") {
        const aCount = a.permissions?.length || 0;
        const bCount = b.permissions?.length || 0;
        return sortOrder === "asc" ? aCount - bCount : bCount - aCount;
      }
      return 0;
    });
  }, [superAdmins, searchTerm, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredAdmins.length / PAGE_SIZE);
  const safeCurrentPage = Math.min(currentPage, totalPages || 1);
  const paginatedAdmins = useMemo(
    () =>
      filteredAdmins.slice(
        (safeCurrentPage - 1) * PAGE_SIZE,
        safeCurrentPage * PAGE_SIZE
      ),
    [filteredAdmins, safeCurrentPage]
  );

  const toggleSort = useCallback((field) => {
    setCurrentPage(1);
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  }, [sortBy]);

  const togglePermission = useCallback((permId) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter((p) => p !== permId)
        : [...prev.permissions, permId],
    }));
  }, []);

  // ════════════════════════════════════════════════════════════════
  // EXPORT EXCEL
  // ════════════════════════════════════════════════════════════════
  const handleExportExcel = useCallback(async () => {
    try {
      const XLSX = await import("xlsx");
      const data = filteredAdmins.map((a) => ({
        Nom: a.nom,
        Login: a.login,
        Permissions: (a.permissions || [])
          .map((p) => PERMISSIONS_LIST.find((perm) => perm.id === p)?.label || p)
          .join(", "),
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Super Admins");
      XLSX.writeFile(workbook, "super_admins.xlsx");
      toast.success("Export Excel réussi");
    } catch (err) {
      toast.error(
        "Impossible de générer l'export : " +
          (err?.message || "erreur inconnue")
      );
    }
  }, [filteredAdmins]);

  // ════════════════════════════════════════════════════════════════
  // IMPORT EXCEL
  // ════════════════════════════════════════════════════════════════
  const handleImportExcel = useCallback(
    async (e) => {
      // ✅ DOUBLE SÉCURITÉ — refuse même si le bouton est masqué
      if (!isPrincipal) {
        toast.error("Seul le super admin principal peut importer.");
        return;
      }

      const file = e.target.files?.[0];
      if (!file) return;
      if (!userId) {
        toast.error("Session invalide.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setImporting(true);

      try {
        const XLSX = await import("xlsx");
        const data = new Uint8Array(await file.arrayBuffer());
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (rows.length < 2) {
          toast.error("Fichier vide");
          return;
        }

        const headers = rows[0].map((h) => h.toString().toLowerCase().trim());
        const nomIdx = headers.indexOf("nom");
        const loginIdx = headers.indexOf("login");
        const passwordIdx = headers.indexOf("password");
        const permsIdx = headers.indexOf("permissions");

        if (
          nomIdx === -1 ||
          loginIdx === -1 ||
          passwordIdx === -1 ||
          permsIdx === -1
        ) {
          toast.error("Colonnes requises : nom, login, password, permissions");
          return;
        }

        // ✅ Set des logins existants (O(1) lookup)
        const existingLogins = new Set(superAdmins.map((a) => a.login));
        const createdLogins = new Set();

        let count = 0;
        let skipped = 0;
        const errors = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[nomIdx] || !row[loginIdx] || !row[passwordIdx]) {
            skipped++;
            continue;
          }

          const nom = row[nomIdx].toString().trim();
          const login = row[loginIdx].toString().trim();
          const password = row[passwordIdx].toString();
          const permsString = row[permsIdx]?.toString() || "";
          const permValues = permsString
            .split(/[;,]/)
            .map((p) => p.trim())
            .filter(Boolean);

          // ✅ Validation longueur mot de passe
          if (password.length < MIN_PASSWORD_LENGTH) {
            errors.push(
              `Ligne ${i + 1}: mot de passe trop court (min ${MIN_PASSWORD_LENGTH})`
            );
            continue;
          }

          const validPerms = permValues
            .map((p) => {
              const lower = p.toLowerCase();
              if (PERMISSION_LABEL_TO_ID[lower]) return PERMISSION_LABEL_TO_ID[lower];
              if (PERMISSIONS_LIST.some((perm) => perm.id === p)) return p;
              return null;
            })
            .filter(Boolean);

          if (validPerms.length === 0) {
            errors.push(`Ligne ${i + 1}: aucune permission valide`);
            continue;
          }

          if (existingLogins.has(login) || createdLogins.has(login)) {
            errors.push(`Ligne ${i + 1}: login "${login}" existe déjà`);
            continue;
          }

          try {
            await createSuperAdmin({
              nom,
              login,
              password,
              permissions: validPerms,
              userId,
            });
            createdLogins.add(login);
            count++;
          } catch (err) {
            errors.push(`Ligne ${i + 1}: ${err?.message ?? "échec de création"}`);
          }
        }

        const parts = [];
        if (count > 0) parts.push(`${count} créé(s)`);
        if (skipped > 0) parts.push(`${skipped} ignoré(s)`);
        if (errors.length > 0) parts.push(`${errors.length} erreur(s)`);

        if (count > 0) {
          toast.success(parts.join(" · "));
        } else {
          toast.error(parts.join(" · ") || "Aucun import");
        }
        if (errors.length > 0 && count > 0) {
          toast.error(errors.slice(0, 3).join(" ; "));
        }
      } catch (err) {
        toast.error(
          "Impossible de lire le fichier Excel : " +
            (err?.message ?? "erreur inconnue")
        );
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [userId, superAdmins, createSuperAdmin, isPrincipal]
  );

  // ════════════════════════════════════════════════════════════════
  // CRÉATION
  // ════════════════════════════════════════════════════════════════
  const handleCreate = useCallback(
    async (e) => {
      e.preventDefault();
      if (creating) return;

      // ✅ DOUBLE SÉCURITÉ
      if (!isPrincipal) {
        toast.error("Seul le super admin principal peut créer un super admin.");
        return;
      }
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }

      if (!form.nom.trim() || !form.login.trim() || !form.password.trim()) {
        toast.error("Veuillez remplir tous les champs.");
        return;
      }
      if (form.password.length < MIN_PASSWORD_LENGTH) {
        toast.error(`Mot de passe : ${MIN_PASSWORD_LENGTH} caractères minimum.`);
        return;
      }
      if (form.permissions.length === 0) {
        toast.error("Attribuez au moins une permission.");
        return;
      }

      setCreating(true);
      try {
        await createSuperAdmin({
          nom: form.nom.trim(),
          login: form.login.trim(),
          password: form.password,
          permissions: form.permissions,
          userId,
        });
        toast.success("Super admin créé avec succès");
        setForm({ nom: "", login: "", password: "", permissions: [] });
        setShowCreate(false);
        setShowPassword(false);
      } catch (err) {
        toast.error(
          "Impossible de créer : " + (err?.message || "erreur inconnue")
        );
      } finally {
        setCreating(false);
      }
    },
    [creating, userId, form, createSuperAdmin, isPrincipal]
  );

  // ════════════════════════════════════════════════════════════════
  // ÉDITION PERMISSIONS
  // ════════════════════════════════════════════════════════════════
  const startEditPermissions = useCallback((admin) => {
    setEditingId(admin._id);
    setEditPermissions(admin.permissions || []);
  }, []);

  const cancelEditPermissions = useCallback(() => {
    setEditingId(null);
    setEditPermissions([]);
  }, []);

  const toggleEditPermission = useCallback((perm) => {
    setEditPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }, []);

  const handleSavePermissions = useCallback(
    async (adminId) => {
      if (savingPermissions) return;
      if (!isPrincipal) {
        toast.error("Seul le super admin principal peut modifier les permissions.");
        return;
      }
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      setSavingPermissions(true);
      try {
        await updatePermissions({
          userId: adminId,
          permissions: editPermissions,
          adminId: userId,
        });
        toast.success("Permissions mises à jour");
        setEditingId(null);
      } catch (err) {
        toast.error(
          "Impossible de mettre à jour : " + (err?.message || "erreur inconnue")
        );
      } finally {
        setSavingPermissions(false);
      }
    },
    [savingPermissions, userId, updatePermissions, editPermissions, isPrincipal]
  );

  // ════════════════════════════════════════════════════════════════
  // SUPPRESSION
  // ════════════════════════════════════════════════════════════════
  const handleDelete = useCallback(
    async (admin) => {
      if (!isPrincipal) {
        toast.error("Seul le super admin principal peut supprimer.");
        return;
      }
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      const ok = await confirm(
        "Supprimer ce super admin",
        `Voulez-vous vraiment supprimer ${admin.nom} ? Cette action est irréversible.`
      );
      if (!ok) return;
      setDeletingId(admin._id);
      try {
        await removeSuperAdmin({
          userId: admin._id,
          adminId: userId,
        });
        toast.success("Super admin supprimé");
      } catch (err) {
        toast.error(
          "Impossible de supprimer : " + (err?.message || "erreur inconnue")
        );
      } finally {
        setDeletingId(null);
      }
    },
    [userId, confirm, removeSuperAdmin, isPrincipal]
  );

  // ════════════════════════════════════════════════════════════════
  // STATS
  // ════════════════════════════════════════════════════════════════
  const avgPermissions = useMemo(() => {
    if (superAdmins.length === 0) return 0;
    return (
      superAdmins.reduce((sum, a) => sum + (a.permissions?.length || 0), 0) /
      superAdmins.length
    ).toFixed(1);
  }, [superAdmins]);

  // ════════════════════════════════════════════════════════════════
  // STYLES ADAPTATIFS
  // ════════════════════════════════════════════════════════════════
  const inputStyle = {
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    borderRadius: 8,
    fontSize: isMobile ? 16 : 14,
    marginBottom: 16,
    outline: "none",
    background: dark ? "#0F172A" : "#F8FAFC",
    color: dark ? "#F1F5F9" : "#1E293B",
    transition: "border-color 0.2s, background-color 0.3s",
  };
  const headerFlexDirection = isMobile ? "column" : "row";
  const headerAlign = isMobile ? "stretch" : "center";
  const searchInputWidth = isMobile ? "100%" : 200;
  const toolbarFlexDirection = isMobile ? "column" : "row";
  const buttonPadding = isMobile ? "10px 12px" : "8px 12px";
  const buttonFontSize = isMobile ? 14 : 13;
  const cardPadding = isMobile ? 12 : 16;
  const cardFlexDirection = isMobile ? "column" : "row";
  const cardAlign = isMobile ? "stretch" : "center";
  const permissionGridColumns = isMobile
    ? "1fr"
    : "repeat(auto-fill, minmax(200px, 1fr))";
  const permissionLabelPadding = isMobile ? "10px 12px" : "8px 12px";
  const formButtonFlexDirection = isMobile ? "column" : "row";
  const formButtonWidth = isMobile ? "100%" : "auto";

  // ════════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════════
  if (superAdminsRaw === undefined) {
    return (
      <>
        {GsaKeyframes}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 40,
          }}
        >
          <Loader size={32} className="gsa-spin" style={{ color: dark ? "#818CF8" : "#4F46E5" }} />
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════
  return (
    <div>
      {GsaKeyframes}

      {/* En-tête */}
      <div
        style={{
          display: "flex",
          flexDirection: headerFlexDirection,
          justifyContent: "space-between",
          alignItems: headerAlign,
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h3
            style={{
              fontSize: isMobile ? 18 : 20,
              fontWeight: 600,
              color: dark ? "#F1F5F9" : "#1E293B",
              margin: 0,
            }}
          >
            Super Admins secondaires
          </h3>
          <p
            style={{
              fontSize: 13,
              color: dark ? "#94A3B8" : "#64748B",
              marginTop: 4,
            }}
          >
            {superAdmins.length} super admin(s) · Permissions moyennes :{" "}
            {avgPermissions}/{TOTAL_PERMISSIONS}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: toolbarFlexDirection,
            gap: 10,
            alignItems: isMobile ? "stretch" : "center",
            flexWrap: "wrap",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <div style={{ position: "relative", width: isMobile ? "100%" : "auto" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: dark ? "#94A3B8" : "#64748B",
              }}
            />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: isMobile ? "10px 12px 10px 34px" : "8px 12px 8px 34px",
                borderRadius: 8,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                background: dark ? "#1E293B" : "#FFFFFF",
                color: dark ? "#F1F5F9" : "#1E293B",
                fontSize: isMobile ? 16 : 14,
                outline: "none",
                width: searchInputWidth,
                boxSizing: "border-box",
              }}
              aria-label="Rechercher un super admin"
            />
          </div>

          {/* ✅ Exporter — visible pour tous (lecture) */}
          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: buttonPadding,
              background: dark ? "#334155" : "#F1F5F9",
              border: "none",
              borderRadius: 8,
              color: dark ? "#F1F5F9" : "#1E293B",
              cursor: "pointer",
              fontSize: buttonFontSize,
              width: isMobile ? "100%" : "auto",
            }}
            aria-label="Exporter en Excel"
          >
            <Download size={16} /> Exporter Excel
          </button>

          {/* ✅ Importer — Principal uniquement */}
          {isPrincipal && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: buttonPadding,
                background: dark ? "#334155" : "#F1F5F9",
                border: "none",
                borderRadius: 8,
                color: dark ? "#F1F5F9" : "#1E293B",
                cursor: importing ? "not-allowed" : "pointer",
                fontSize: buttonFontSize,
                width: isMobile ? "100%" : "auto",
              }}
              aria-label="Importer depuis Excel"
            >
              {importing ? (
                <Loader size={16} className="gsa-spin" />
              ) : (
                <Upload size={16} />
              )}
              Importer Excel
            </button>
          )}

          {/* ✅ Nouveau — Principal uniquement */}
          {isPrincipal && (
            <button
              type="button"
              onClick={() => setShowCreate(!showCreate)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: isMobile ? "10px 16px" : "8px 16px",
                background: dark ? "#818CF8" : "#4F46E5",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
                fontSize: isMobile ? 16 : 14,
                width: isMobile ? "100%" : "auto",
              }}
              aria-label={
                showCreate
                  ? "Fermer le formulaire"
                  : "Créer un nouveau super admin"
              }
            >
              {showCreate ? <X size={16} /> : <Plus size={16} />}
              {showCreate ? "Fermer" : "Nouveau"}
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={handleImportExcel}
        disabled={!isPrincipal}
      />

      {/* Formulaire de création */}
      {showCreate && isPrincipal && (
        <div
          style={{
            background: dark ? "#1E293B" : "#FFFFFF",
            borderRadius: 12,
            padding: isMobile ? 14 : 20,
            marginBottom: 24,
            boxShadow: dark
              ? "0 1px 3px rgba(0,0,0,0.3)"
              : "0 1px 3px rgba(0,0,0,0.05)",
            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
          }}
        >
          <h4
            style={{
              marginTop: 0,
              marginBottom: 16,
              color: dark ? "#F1F5F9" : "#1E293B",
              fontSize: isMobile ? 16 : 18,
            }}
          >
            Créer un super admin
          </h4>
          <form onSubmit={handleCreate}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 500,
                color: dark ? "#CBD5E1" : "#374151",
                fontSize: isMobile ? 15 : 14,
              }}
            >
              Nom complet
            </label>
            <input
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Ex: Jean Dupont"
              style={inputStyle}
            />

            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 500,
                color: dark ? "#CBD5E1" : "#374151",
                fontSize: isMobile ? 15 : 14,
              }}
            >
              Login
            </label>
            <input
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              placeholder="Ex: jean.dupont"
              style={inputStyle}
            />

            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 500,
                color: dark ? "#CBD5E1" : "#374151",
                fontSize: isMobile ? 15 : 14,
              }}
            >
              Mot de passe
            </label>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={`Mot de passe (min ${MIN_PASSWORD_LENGTH} caractères)`}
                style={{ ...inputStyle, marginBottom: 0, paddingRight: 40 }}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: dark ? "#94A3B8" : "#64748B",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                }}
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {showPassword ? (
                  <Lock size={isMobile ? 20 : 18} />
                ) : (
                  <Unlock size={isMobile ? 20 : 18} />
                )}
              </button>
            </div>

            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 500,
                color: dark ? "#CBD5E1" : "#374151",
                fontSize: isMobile ? 15 : 14,
              }}
            >
              Permissions
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: permissionGridColumns,
                gap: 8,
                marginBottom: 16,
              }}
            >
              {PERMISSIONS_LIST.map((perm) => (
                <label
                  key={perm.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: permissionLabelPadding,
                    borderRadius: 8,
                    background: form.permissions.includes(perm.id)
                      ? dark
                        ? "#312E81"
                        : "#EEF2FF"
                      : "transparent",
                    border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                    style={{
                      width: isMobile ? 18 : 16,
                      height: isMobile ? 18 : 16,
                      accentColor: dark ? "#818CF8" : "#4F46E5",
                    }}
                  />
                  <span
                    style={{
                      fontSize: isMobile ? 14 : 13,
                      color: dark ? "#F1F5F9" : "#1E293B",
                    }}
                  >
                    {perm.label}
                  </span>
                </label>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexDirection: formButtonFlexDirection,
              }}
            >
              <button
                type="submit"
                disabled={creating}
                style={{
                  flex: isMobile ? "none" : 1,
                  padding: isMobile ? "12px 16px" : "10px 16px",
                  background: creating
                    ? "#A5B4FC"
                    : dark
                    ? "#818CF8"
                    : "#4F46E5",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: creating ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontSize: isMobile ? 16 : 14,
                  width: formButtonWidth,
                }}
              >
                {creating ? (
                  <Loader size={16} className="gsa-spin" />
                ) : (
                  <Plus size={16} />
                )}
                {creating ? "Création..." : "Créer le super admin"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                style={{
                  padding: isMobile ? "12px 16px" : "10px 16px",
                  background: dark ? "#334155" : "#F1F5F9",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 500,
                  cursor: "pointer",
                  color: dark ? "#F1F5F9" : "#1E293B",
                  fontSize: isMobile ? 16 : 14,
                  width: formButtonWidth,
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste */}
      {filteredAdmins.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: isMobile ? 24 : 40,
            color: dark ? "#94A3B8" : "#64748B",
            background: dark ? "#1E293B" : "#FFFFFF",
            borderRadius: 12,
          }}
        >
          <ShieldCheck
            size={isMobile ? 40 : 48}
            color={dark ? "#334155" : "#CBD5E1"}
          />
          <p style={{ marginTop: 12, fontSize: isMobile ? 15 : 16 }}>
            {searchTerm
              ? "Aucun super admin trouvé"
              : isPrincipal
              ? "Aucun super admin secondaire. Cliquez sur « Nouveau » pour en créer."
              : "Aucun super admin secondaire à afficher."}
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
              fontSize: isMobile ? 12 : 13,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => toggleSort("nom")}
              style={{
                padding: isMobile ? "8px 10px" : "4px 8px",
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 6,
                background: "transparent",
                color: dark ? "#F1F5F9" : "#1E293B",
                cursor: "pointer",
              }}
            >
              Nom{" "}
              {sortBy === "nom" &&
                (sortOrder === "asc" ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                ))}
            </button>
            <button
              type="button"
              onClick={() => toggleSort("login")}
              style={{
                padding: isMobile ? "8px 10px" : "4px 8px",
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 6,
                background: "transparent",
                color: dark ? "#F1F5F9" : "#1E293B",
                cursor: "pointer",
              }}
            >
              Login{" "}
              {sortBy === "login" &&
                (sortOrder === "asc" ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                ))}
            </button>
            <button
              type="button"
              onClick={() => toggleSort("permissions")}
              style={{
                padding: isMobile ? "8px 10px" : "4px 8px",
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 6,
                background: "transparent",
                color: dark ? "#F1F5F9" : "#1E293B",
                cursor: "pointer",
              }}
            >
              Permissions{" "}
              {sortBy === "permissions" &&
                (sortOrder === "asc" ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                ))}
            </button>
          </div>

          <div style={{ display: "grid", gap: isMobile ? 8 : 12 }}>
            {paginatedAdmins.map((admin) => (
              <div
                key={admin._id}
                style={{
                  background: dark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 12,
                  padding: cardPadding,
                  boxShadow: dark
                    ? "0 1px 3px rgba(0,0,0,0.3)"
                    : "0 1px 3px rgba(0,0,0,0.05)",
                  border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: cardAlign,
                    flexWrap: "wrap",
                    gap: 12,
                    flexDirection: cardFlexDirection,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 16,
                        color: dark ? "#F1F5F9" : "#1E293B",
                      }}
                    >
                      {admin.nom}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: dark ? "#94A3B8" : "#64748B",
                      }}
                    >
                      @{admin.login}
                    </div>
                  </div>
                  {/* ✅ Boutons d'action — Principal uniquement */}
                  {isPrincipal && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => startEditPermissions(admin)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: isMobile ? "10px 12px" : "6px 12px",
                          background: dark ? "#818CF8" : "#4F46E5",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: isMobile ? 14 : 13,
                        }}
                      >
                        <Edit2 size={isMobile ? 16 : 14} /> Permissions
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(admin)}
                        disabled={deletingId === admin._id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: isMobile ? "10px 12px" : "6px 12px",
                          background: "#EF4444",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor:
                            deletingId === admin._id
                              ? "not-allowed"
                              : "pointer",
                          opacity: deletingId === admin._id ? 0.7 : 1,
                          fontSize: isMobile ? 14 : 13,
                        }}
                      >
                        {deletingId === admin._id ? (
                          <Loader size={14} className="gsa-spin" />
                        ) : (
                          <Trash2 size={isMobile ? 16 : 14} />
                        )}
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 8 }}>
                  {(admin.permissions || []).map((perm) => {
                    const permLabel =
                      PERMISSIONS_LIST.find((p) => p.id === perm)?.label ||
                      perm;
                    return (
                      <PermissionBadge
                        key={perm}
                        label={permLabel}
                        dark={dark}
                      />
                    );
                  })}
                </div>

                {/* ✅ Bloc édition — Principal uniquement */}
                {editingId === admin._id && isPrincipal && (
                  <div
                    style={{
                      marginTop: 16,
                      borderTop: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                      paddingTop: 12,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 500,
                        marginBottom: 8,
                        color: dark ? "#CBD5E1" : "#374151",
                        fontSize: isMobile ? 15 : 14,
                      }}
                    >
                      Modifier les permissions
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: 12,
                        flexDirection: isMobile ? "column" : "row",
                      }}
                    >
                      {PERMISSIONS_LIST.map((perm) => (
                        <label
                          key={perm.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: isMobile ? "10px 12px" : "6px 10px",
                            borderRadius: 6,
                            background: editPermissions.includes(perm.id)
                              ? dark
                                ? "#312E81"
                                : "#EEF2FF"
                              : "transparent",
                            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={editPermissions.includes(perm.id)}
                            onChange={() => toggleEditPermission(perm.id)}
                            style={{
                              width: isMobile ? 18 : 14,
                              height: isMobile ? 18 : 14,
                              accentColor: dark ? "#818CF8" : "#4F46E5",
                            }}
                          />
                          <span
                            style={{
                              fontSize: isMobile ? 14 : 12,
                              color: dark ? "#F1F5F9" : "#1E293B",
                            }}
                          >
                            {perm.label}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexDirection: isMobile ? "column" : "row",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSavePermissions(admin._id)}
                        disabled={savingPermissions}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          padding: isMobile ? "12px 14px" : "8px 14px",
                          background: "#10B981",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: savingPermissions
                            ? "not-allowed"
                            : "pointer",
                          fontSize: isMobile ? 14 : 13,
                        }}
                      >
                        {savingPermissions ? (
                          <Loader size={14} className="gsa-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditPermissions}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          padding: isMobile ? "12px 14px" : "8px 14px",
                          background: dark ? "#334155" : "#F1F5F9",
                          color: dark ? "#F1F5F9" : "#1E293B",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: isMobile ? 14 : 13,
                        }}
                      >
                        <X size={14} /> Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                marginTop: 16,
              }}
            >
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                style={{
                  padding: isMobile ? "8px 12px" : "6px 10px",
                  border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                  borderRadius: 6,
                  background: "transparent",
                  color:
                    safeCurrentPage === 1
                      ? "#94A3B8"
                      : dark
                      ? "#F1F5F9"
                      : "#1E293B",
                  cursor: "pointer",
                }}
                aria-label="Page précédente"
              >
                <ChevronLeft size={16} />
              </button>
              <span
                style={{
                  fontSize: isMobile ? 14 : 13,
                  color: dark ? "#94A3B8" : "#64748B",
                }}
              >
                {safeCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={safeCurrentPage === totalPages}
                style={{
                  padding: isMobile ? "8px 12px" : "6px 10px",
                  border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                  borderRadius: 6,
                  background: "transparent",
                  color:
                    safeCurrentPage === totalPages
                      ? "#94A3B8"
                      : dark
                      ? "#F1F5F9"
                      : "#1E293B",
                  cursor: "pointer",
                }}
                aria-label="Page suivante"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}