import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useStyles } from "../../styles/theme";
import { useConfirm } from "../../hooks/useConfirm";
import { ConfirmDialog } from "../ConfirmDialog";
import { hashPassword } from "../../utils/crypto";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  Plus, Trash2, Edit2, Save, X, ShieldCheck, Loader, Search,
  ChevronDown, ChevronUp, Lock, Unlock, Download, Upload, ChevronLeft, ChevronRight,
  CheckCircle2, AlertTriangle, UserCog,
} from "lucide-react";

const PERMISSIONS_LIST = [
  { id: "gestion_ecoles", label: "Gérer les écoles" },
  { id: "gestion_demandes", label: "Approuver / rejeter les demandes" },
  { id: "gestion_statistiques", label: "Voir les statistiques globales" },
  { id: "gestion_utilisateurs", label: "Gérer les utilisateurs" },
  { id: "gestion_superadmins", label: "Gérer les super admins" },
  { id: "gestion_parametres", label: "Gérer les paramètres globaux" },
];

// Mapping des labels français vers les identifiants (pour l'import)
const PERMISSION_LABEL_TO_ID = Object.fromEntries(
  PERMISSIONS_LIST.map((p) => [p.label.toLowerCase(), p.id])
);

function PermissionBadge({ label, dark }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 500,
      background: dark ? "#312E81" : "#EEF2FF",
      color: dark ? "#A5B4FC" : "#4F46E5",
      marginRight: 4,
      marginBottom: 4,
    }}>
      {label}
    </span>
  );
}

export function GestionSuperAdmins({ user }) {
  const { dark } = useStyles();
  const { confirm, dialogProps } = useConfirm();

  const superAdmins = useQuery(api.users.listSuperAdmins) ?? [];
  const createSuperAdmin = useMutation(api.users.createSuperAdmin);
  const updatePermissions = useMutation(api.users.updateSuperAdminPermissions);
  const removeSuperAdmin = useMutation(api.users.removeSuperAdmin);

  const [showCreate, setShowCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({ nom: "", login: "", password: "", permissions: [] });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editPermissions, setEditPermissions] = useState([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Pagination et tri
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const pageSize = 5;

  const filteredAdmins = useMemo(() => {
    let result = superAdmins;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((a) =>
        a.nom.toLowerCase().includes(q) ||
        a.login.toLowerCase().includes(q) ||
        (a.permissions || []).some((p) => {
          const label = PERMISSIONS_LIST.find((perm) => perm.id === p)?.label || p;
          return label.toLowerCase().includes(q);
        })
      );
    }
    return [...result].sort((a, b) => {
      if (sortBy === "nom") {
        return sortOrder === "asc" ? a.nom.localeCompare(b.nom) : b.nom.localeCompare(a.nom);
      } else if (sortBy === "login") {
        return sortOrder === "asc" ? a.login.localeCompare(b.login) : b.login.localeCompare(a.login);
      } else if (sortBy === "permissions") {
        const aCount = a.permissions?.length || 0;
        const bCount = b.permissions?.length || 0;
        return sortOrder === "asc" ? aCount - bCount : bCount - aCount;
      }
      return 0;
    });
  }, [superAdmins, searchTerm, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredAdmins.length / pageSize);
  const safeCurrentPage = Math.min(currentPage, totalPages || 1);
  const paginatedAdmins = filteredAdmins.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  const toggleSort = (field) => {
    setCurrentPage(1); // Reset page on sort change
    if (sortBy === field) setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Fonction pour basculer une permission dans le formulaire de création
  const togglePermission = (permId) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter((p) => p !== permId)
        : [...prev.permissions, permId],
    }));
  };

  // Export Excel
  const handleExportExcel = () => {
    try {
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
      toast.error("Erreur lors de l'export");
    }
  };

  // Import Excel amélioré
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
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

        if (nomIdx === -1 || loginIdx === -1 || passwordIdx === -1 || permsIdx === -1) {
          toast.error("Colonnes requises : nom, login, password, permissions");
          return;
        }

        let count = 0;
        const errors = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[nomIdx] || !row[loginIdx] || !row[passwordIdx]) continue;

          const nom = row[nomIdx].toString().trim();
          const login = row[loginIdx].toString().trim();
          const password = row[passwordIdx].toString();
          const permsString = row[permsIdx]?.toString() || "";
          // Sépare par virgule ou point-virgule
          const permValues = permsString.split(/[;,]/).map((p) => p.trim()).filter(Boolean);

          // Convertit les labels ou identifiants en identifiants valides
          const validPerms = permValues.map((p) => {
            const lower = p.toLowerCase();
            if (PERMISSION_LABEL_TO_ID[lower]) return PERMISSION_LABEL_TO_ID[lower];
            if (PERMISSIONS_LIST.some((perm) => perm.id === p)) return p;
            return null;
          }).filter(Boolean);

          if (validPerms.length === 0) {
            errors.push(`Ligne ${i + 1}: aucune permission valide`);
            continue;
          }

          // Vérification rapide des doublons (login existant)
          if (superAdmins.some((a) => a.login === login)) {
            errors.push(`Ligne ${i + 1}: login "${login}" existe déjà`);
            continue;
          }

          const hashed = await hashPassword(password);
          await createSuperAdmin({
            nom,
            login,
            password: hashed,
            permissions: validPerms,
            userId: user._id,
          });
          count++;
        }

        if (count > 0) toast.success(`${count} super admin(s) importé(s)`);
        if (errors.length > 0) {
          toast.error(`${errors.length} erreur(s) : ${errors.slice(0, 3).join(" ; ")}`);
        }
      } catch (err) {
        toast.error(err.message || "Erreur lors de l'import");
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Styles
  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
    outline: "none",
    background: dark ? "#0F172A" : "#F8FAFC",
    color: dark ? "#F1F5F9" : "#1E293B",
    transition: "border-color 0.2s, background-color 0.3s",
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.login.trim() || !form.password.trim()) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }
    if (form.permissions.length === 0) {
      toast.error("Attribuez au moins une permission.");
      return;
    }
    setCreating(true);
    try {
      const hashedPassword = await hashPassword(form.password);
      await createSuperAdmin({
        nom: form.nom.trim(),
        login: form.login.trim(),
        password: hashedPassword,
        permissions: form.permissions,
        userId: user._id,
      });
      toast.success("Super admin créé avec succès");
      setForm({ nom: "", login: "", password: "", permissions: [] });
      setShowCreate(false);
      setShowPassword(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const startEditPermissions = (admin) => {
    setEditingId(admin._id);
    setEditPermissions(admin.permissions || []);
  };

  const cancelEditPermissions = () => {
    setEditingId(null);
    setEditPermissions([]);
  };

  const toggleEditPermission = (perm) => {
    setEditPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSavePermissions = async (adminId) => {
    setSavingPermissions(true);
    try {
      await updatePermissions({
        userId: adminId,
        permissions: editPermissions,
        adminId: user._id,
      });
      toast.success("Permissions mises à jour");
      setEditingId(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleDelete = async (admin) => {
    const ok = await confirm(
      "Supprimer ce super admin",
      `Voulez-vous vraiment supprimer ${admin.nom} ? Cette action est irréversible.`
    );
    if (!ok) return;
    setDeletingId(admin._id);
    try {
      await removeSuperAdmin({
        userId: admin._id,
        adminId: user._id,
      });
      toast.success("Super admin supprimé");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Statistiques rapides
  const totalPermissions = PERMISSIONS_LIST.length;
  const avgPermissions = superAdmins.length > 0
    ? (superAdmins.reduce((sum, a) => sum + (a.permissions?.length || 0), 0) / superAdmins.length).toFixed(1)
    : 0;

  return (
    <div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* En-tête */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12, marginBottom: 20,
      }}>
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", margin: 0 }}>
            Super Admins secondaires
          </h3>
          <p style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B", marginTop: 4 }}>
            {superAdmins.length} super admin(s) · Permissions moyennes : {avgPermissions}/{totalPermissions}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }} />
            <input
              type="search"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                padding: "8px 12px 8px 34px", borderRadius: 8,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                background: dark ? "#1E293B" : "#FFFFFF",
                color: dark ? "#F1F5F9" : "#1E293B",
                fontSize: 14, outline: "none", width: 200,
              }}
              aria-label="Rechercher un super admin"
            />
          </div>

          <button
            onClick={handleExportExcel}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: dark ? "#334155" : "#F1F5F9", border: "none", borderRadius: 8, color: dark ? "#F1F5F9" : "#1E293B", cursor: "pointer", fontSize: 13 }}
            aria-label="Exporter en Excel"
          >
            <Download size={16} /> Exporter Excel
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: dark ? "#334155" : "#F1F5F9", border: "none", borderRadius: 8, color: dark ? "#F1F5F9" : "#1E293B", cursor: importing ? "not-allowed" : "pointer", fontSize: 13 }}
            aria-label="Importer depuis Excel"
          >
            {importing ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
            Importer Excel
          </button>

          <button
            onClick={() => setShowCreate(!showCreate)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: dark ? "#818CF8" : "#4F46E5", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}
            aria-label={showCreate ? "Fermer le formulaire" : "Créer un nouveau super admin"}
          >
            {showCreate ? <X size={16} /> : <Plus size={16} />}
            {showCreate ? "Fermer" : "Nouveau"}
          </button>
        </div>
      </div>

      {/* Input fichier caché pour l'import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={handleImportExcel}
      />

      {/* Formulaire de création */}
      {showCreate && (
        <div style={{
          background: dark ? "#1E293B" : "#FFFFFF",
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
          border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        }}>
          <h4 style={{ marginTop: 0, marginBottom: 16, color: dark ? "#F1F5F9" : "#1E293B" }}>
            Créer un super admin
          </h4>
          <form onSubmit={handleCreate}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: dark ? "#CBD5E1" : "#374151" }}>Nom complet</label>
            <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Jean Dupont" style={inputStyle} />

            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: dark ? "#CBD5E1" : "#374151" }}>Login</label>
            <input value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} placeholder="Ex: jean.dupont" style={inputStyle} />

            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: dark ? "#CBD5E1" : "#374151" }}>Mot de passe</label>
            <div style={{ position: "relative" }}>
              <input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mot de passe temporaire" style={{ ...inputStyle, paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 10, top: "35%", transform: "translateY(-50%)", background: "none", border: "none", color: dark ? "#94A3B8" : "#64748B", cursor: "pointer" }} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                {showPassword ? <Lock size={18} /> : <Unlock size={18} />}
              </button>
            </div>

            <label style={{ display: "block", marginBottom: 8, fontWeight: 500, color: dark ? "#CBD5E1" : "#374151" }}>Permissions</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 16 }}>
              {PERMISSIONS_LIST.map((perm) => (
                <label key={perm.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: form.permissions.includes(perm.id) ? (dark ? "#312E81" : "#EEF2FF") : "transparent", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.permissions.includes(perm.id)} onChange={() => togglePermission(perm.id)} style={{ width: 16, height: 16, accentColor: dark ? "#818CF8" : "#4F46E5" }} />
                  <span style={{ fontSize: 13, color: dark ? "#F1F5F9" : "#1E293B" }}>{perm.label}</span>
                </label>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" disabled={creating} style={{ flex: 1, padding: "10px 16px", background: creating ? "#A5B4FC" : dark ? "#818CF8" : "#4F46E5", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: creating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {creating ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                {creating ? "Création..." : "Créer le super admin"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} style={{ padding: "10px 16px", background: dark ? "#334155" : "#F1F5F9", border: "none", borderRadius: 8, fontWeight: 500, cursor: "pointer", color: dark ? "#F1F5F9" : "#1E293B" }}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Liste */}
      {filteredAdmins.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: dark ? "#94A3B8" : "#64748B", background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 12 }}>
          <ShieldCheck size={48} color={dark ? "#334155" : "#CBD5E1"} />
          <p style={{ marginTop: 12, fontSize: 16 }}>{searchTerm ? "Aucun super admin trouvé" : "Aucun super admin secondaire"}</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, fontSize: 13, flexWrap: "wrap" }}>
            <button onClick={() => toggleSort("nom")} style={{ padding: "4px 8px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 6, background: "transparent", color: dark ? "#F1F5F9" : "#1E293B", cursor: "pointer" }}>
              Nom {sortBy === "nom" && (sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
            </button>
            <button onClick={() => toggleSort("login")} style={{ padding: "4px 8px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 6, background: "transparent", color: dark ? "#F1F5F9" : "#1E293B", cursor: "pointer" }}>
              Login {sortBy === "login" && (sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
            </button>
            <button onClick={() => toggleSort("permissions")} style={{ padding: "4px 8px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 6, background: "transparent", color: dark ? "#F1F5F9" : "#1E293B", cursor: "pointer" }}>
              Permissions {sortBy === "permissions" && (sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
            </button>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {paginatedAdmins.map((admin) => (
              <div key={admin._id} style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 12, padding: 16, boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: dark ? "#F1F5F9" : "#1E293B" }}>{admin.nom}</div>
                    <div style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B" }}>@{admin.login}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => startEditPermissions(admin)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: dark ? "#818CF8" : "#4F46E5", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                      <Edit2 size={14} /> Permissions
                    </button>
                    <button onClick={() => handleDelete(admin)} disabled={deletingId === admin._id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#EF4444", color: "white", border: "none", borderRadius: 6, cursor: deletingId === admin._id ? "not-allowed" : "pointer", opacity: deletingId === admin._id ? 0.7 : 1, fontSize: 13 }}>
                      {deletingId === admin._id ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      Supprimer
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  {(admin.permissions || []).map((perm) => {
                    const permLabel = PERMISSIONS_LIST.find((p) => p.id === perm)?.label || perm;
                    return <PermissionBadge key={perm} label={permLabel} dark={dark} />;
                  })}
                </div>

                {editingId === admin._id && (
                  <div style={{ marginTop: 16, borderTop: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, paddingTop: 12 }}>
                    <div style={{ fontWeight: 500, marginBottom: 8, color: dark ? "#CBD5E1" : "#374151" }}>Modifier les permissions</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                      {PERMISSIONS_LIST.map((perm) => (
                        <label key={perm.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6, background: editPermissions.includes(perm.id) ? (dark ? "#312E81" : "#EEF2FF") : "transparent", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, cursor: "pointer" }}>
                          <input type="checkbox" checked={editPermissions.includes(perm.id)} onChange={() => toggleEditPermission(perm.id)} style={{ width: 14, height: 14, accentColor: dark ? "#818CF8" : "#4F46E5" }} />
                          <span style={{ fontSize: 12, color: dark ? "#F1F5F9" : "#1E293B" }}>{perm.label}</span>
                        </label>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleSavePermissions(admin._id)} disabled={savingPermissions} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#10B981", color: "white", border: "none", borderRadius: 6, cursor: savingPermissions ? "not-allowed" : "pointer", fontSize: 13 }}>
                        {savingPermissions ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                        Enregistrer
                      </button>
                      <button onClick={cancelEditPermissions} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: dark ? "#334155" : "#F1F5F9", color: dark ? "#F1F5F9" : "#1E293B", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                        <X size={14} /> Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 }}>
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safeCurrentPage === 1} style={{ padding: "6px 10px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 6, background: "transparent", color: safeCurrentPage === 1 ? "#94A3B8" : dark ? "#F1F5F9" : "#1E293B", cursor: "pointer" }} aria-label="Page précédente">
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B" }}>{safeCurrentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages} style={{ padding: "6px 10px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 6, background: "transparent", color: safeCurrentPage === totalPages ? "#94A3B8" : dark ? "#F1F5F9" : "#1E293B", cursor: "pointer" }} aria-label="Page suivante">
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