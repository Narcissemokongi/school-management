import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useConfirm } from "../hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Search, Edit2, Trash2, UserCheck, UserX, Loader,
  Users, UserPlus, Clock, CheckCircle,
  ChevronLeft, ChevronRight, Filter,
} from "lucide-react";
import toast from "react-hot-toast";

export function GestionUtilisateurs({ ecoleId, userId }) {
  const { S } = useStyles();
  const { confirm, dialogProps } = useConfirm();

  // Onglet actif
  const [tab, setTab] = useState("actifs");

  // Données
  const users = useQuery(api.users.listByEcole, ecoleId ? { ecoleId } : "skip") ?? [];
  const pendingUsers = useQuery(api.users.listPendingUsers, ecoleId ? { ecoleId } : "skip") ?? [];
  const classes = useQuery(api.classes.list, ecoleId ? { ecoleId } : "skip") ?? [];
  const addUser = useMutation(api.users.add);
  const updateUser = useMutation(api.users.update);
  const removeUser = useMutation(api.users.remove);
  const approveUser = useMutation(api.users.approveUser);
  const rejectUser = useMutation(api.users.rejectUser);

  // États pour le formulaire modal
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({
    nom: "",
    login: "",
    password: "",
    role: "enseignant",
    classe: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // États pour la recherche, pagination, tri, sélection, filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [classeFilter, setClasseFilter] = useState(""); // nouveau filtre par classe
  const [sortKey, setSortKey] = useState("nom");
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const pageSize = 10;

  // Classes uniques pour le filtre
  const classNames = useMemo(() => [...new Set(classes.map(c => c.nom))].sort(), [classes]);

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const parRole = {};
    users.forEach(u => {
      parRole[u.role] = (parRole[u.role] || 0) + 1;
    });
    return { total, pending: pendingUsers.length, parRole };
  }, [users, pendingUsers]);

  // Filtrage, tri, pagination des utilisateurs actifs
  const filteredUsers = useMemo(() => {
    let list = users.filter(u => {
      const matchSearch = searchTerm.length === 0 ||
        u.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.login.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = !roleFilter || u.role === roleFilter;
      const matchClasse = !classeFilter || u.classe === classeFilter;
      return matchSearch && matchRole && matchClasse;
    });
    // Tri
    list.sort((a, b) => {
      const aVal = (a[sortKey] ?? "").toString().toLowerCase();
      const bVal = (b[sortKey] ?? "").toString().toLowerCase();
      if (sortDir === "asc") return aVal.localeCompare(bVal);
      else return bVal.localeCompare(aVal);
    });
    return list;
  }, [users, searchTerm, roleFilter, classeFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handlers filtres
  const handleSearchChange = (val) => { setSearchTerm(val); setCurrentPage(1); };
  const handleRoleFilterChange = (val) => { setRoleFilter(val); setCurrentPage(1); };
  const handleClasseFilterChange = (val) => { setClasseFilter(val); setCurrentPage(1); };

  // Rôles uniques pour le filtre
  const roles = useMemo(() => {
    const set = new Set(users.map(u => u.role));
    return Array.from(set).sort();
  }, [users]);

  // Gestion du formulaire
  const resetForm = () => {
    setFormData({ nom: "", login: "", password: "", role: "enseignant", classe: "" });
    setFormErrors({});
    setEditUser(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };
  const openEdit = (user) => {
    setEditUser(user);
    setFormData({
      nom: user.nom,
      login: user.login,
      password: "",
      role: user.role,
      classe: user.classe || "",
    });
    setFormErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.nom.trim()) errs.nom = "Requis";
    if (!editUser) {
      if (!formData.login.trim()) errs.login = "Requis";
      if (!formData.password.trim()) errs.password = "Requis";
    }
    if (formData.password && formData.password.length < 4) errs.password = "4 caractères min.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      if (editUser) {
        const payload = {
          id: editUser._id,
          nom: formData.nom.trim(),
          role: formData.role,
          classe: formData.classe || undefined,
          userId,
        };
        if (formData.password) payload.password = formData.password;
        await updateUser(payload);
        toast.success("Utilisateur mis à jour");
      } else {
        await addUser({
          nom: formData.nom.trim(),
          login: formData.login.trim(),
          password: formData.password,
          role: formData.role,
          classe: formData.classe || undefined,
          ecoleId,
          userId,
        });
        toast.success("Utilisateur créé");
      }
      setShowForm(false);
      resetForm();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Suppression
  const handleDelete = async (id) => {
    const ok = await confirm("Supprimer", "Supprimer cet utilisateur ?");
    if (!ok) return;
    try {
      await removeUser({ id, userId });
      toast.success("Utilisateur supprimé");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Sélection multiple
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedUsers.map(u => u._id)));
    }
  };

  const deleteSelected = async () => {
    const ok = await confirm("Supprimer la sélection", `Supprimer ${selectedIds.size} utilisateur(s) ?`);
    if (!ok) return;
    for (const id of selectedIds) {
      await removeUser({ id, userId }).catch(() => {});
    }
    toast.success(`${selectedIds.size} utilisateur(s) supprimé(s)`);
    setSelectedIds(new Set());
  };

  // Approbation / rejet (onglet en attente)
  const handleApprove = async (id) => {
    try {
      await approveUser({ userId: id });
      toast.success("Utilisateur approuvé");
    } catch (err) {
      toast.error(err.message);
    }
  };
  const handleReject = async (id) => {
    const reason = prompt("Motif du rejet (optionnel) :");
    try {
      await rejectUser({ userId: id, reason: reason || undefined });
      toast.success("Utilisateur rejeté");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // --- Rendu JSX ---
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>Gestion des utilisateurs</h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
          {stats.total} compte(s) actif(s) · {stats.pending} en attente
        </p>
      </div>

      {/* Statistiques */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard icon={<Users size={24} />} value={stats.total} label="Total" color="#4F46E5" />
        <StatCard icon={<Clock size={24} />} value={stats.pending} label="En attente" color="#F59E0B" />
        {roles.map(role => (
          <StatCard key={role} icon={<Users size={24} />} value={stats.parRole[role] || 0} label={role} color="#10B981" />
        )).slice(0, 4)}
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E2E8F0", marginBottom: 24 }}>
        <button
          onClick={() => { setTab("actifs"); setCurrentPage(1); }}
          style={{
            padding: "12px 20px", border: "none", background: "transparent",
            color: tab === "actifs" ? "#4F46E5" : "#64748B",
            fontWeight: tab === "actifs" ? 600 : 400,
            borderBottom: tab === "actifs" ? "3px solid #4F46E5" : "3px solid transparent",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <UserCheck size={18} /> Comptes actifs
        </button>
        <button
          onClick={() => { setTab("pending"); }}
          style={{
            padding: "12px 20px", border: "none", background: "transparent",
            color: tab === "pending" ? "#4F46E5" : "#64748B",
            fontWeight: tab === "pending" ? 600 : 400,
            borderBottom: tab === "pending" ? "3px solid #4F46E5" : "3px solid transparent",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <Clock size={18} /> Demandes en attente ({stats.pending})
        </button>
      </div>

      {/* Contenu selon l'onglet */}
      {tab === "actifs" ? (
        <>
          {/* Barre d'outils */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20, alignItems: "center" }}>
            {/* Recherche */}
            <div style={{ display: "flex", alignItems: "center", background: "#FFF", borderRadius: 10, padding: "8px 12px", border: "1px solid #E2E8F0", flex: 1, minWidth: 200 }}>
              <Search size={18} color="#94A3B8" />
              <input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{ border: "none", outline: "none", marginLeft: 8, fontSize: 14, width: "100%", background: "transparent" }}
              />
            </div>

            {/* Filtre par rôle */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Filter size={16} color="#64748B" />
              <select
                value={roleFilter}
                onChange={(e) => handleRoleFilterChange(e.target.value)}
                style={{ padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, background: "#FFF", outline: "none" }}
              >
                <option value="">Tous les rôles</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Filtre par classe (NOUVEAU) */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Filter size={16} color="#64748B" />
              <select
                value={classeFilter}
                onChange={(e) => handleClasseFilterChange(e.target.value)}
                style={{ padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, background: "#FFF", outline: "none" }}
              >
                <option value="">Toutes les classes</option>
                {classNames.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Bouton créer */}
            <button onClick={openCreate} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 16px", background: "#4F46E5", color: "white",
              border: "none", borderRadius: 10, fontWeight: 500, cursor: "pointer",
              whiteSpace: "nowrap",
            }}>
              <UserPlus size={18} /> Nouveau compte
            </button>

            {/* Actions groupées (si sélection) */}
            {selectedIds.size > 0 && (
              <button onClick={deleteSelected} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 16px", background: "#EF4444", color: "white",
                border: "none", borderRadius: 10, fontWeight: 500, cursor: "pointer",
              }}>
                <Trash2 size={18} /> Supprimer ({selectedIds.size})
              </button>
            )}
          </div>

          {/* Tableau */}
          <div style={{ background: "#FFF", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", width: 40 }}>
                    <input type="checkbox" checked={selectedIds.size === paginatedUsers.length && paginatedUsers.length > 0} onChange={toggleSelectAll} style={{ accentColor: "#4F46E5" }} />
                  </th>
                  <th
                    style={{ padding: "12px 16px", textAlign: "left", cursor: "pointer", color: "#475569", fontWeight: 600 }}
                    onClick={() => { setSortKey("nom"); setSortDir(d => d === "asc" ? "desc" : "asc"); }}
                  >
                    Nom {sortKey === "nom" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 600 }}>Login</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 600 }}>Rôle</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 600 }}>Classe</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: "#475569", fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u, idx) => (
                  <tr key={u._id} style={{ borderBottom: "1px solid #F1F5F9", background: idx % 2 === 0 ? "#FFF" : "#F8FAFC" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <input type="checkbox" checked={selectedIds.has(u._id)} onChange={() => toggleSelect(u._id)} style={{ accentColor: "#4F46E5" }} />
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 500 }}>{u.nom}</td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>{u.login}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: "#EEF2FF", color: "#4F46E5", padding: "2px 10px", borderRadius: 12, fontSize: 13, fontWeight: 500 }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>{u.classe || "—"}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <button onClick={() => openEdit(u)} style={{ background: "none", border: "none", cursor: "pointer", color: "#4F46E5", marginRight: 8 }} title="Modifier">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(u._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444" }} title="Supprimer">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {paginatedUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>
                      {searchTerm || roleFilter || classeFilter ? "Aucun résultat trouvé." : "Ajoutez un premier utilisateur."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: currentPage === 1 ? "#CBD5E1" : "#4F46E5" }}>
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: 14, color: "#64748B" }}>Page {currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: currentPage === totalPages ? "#CBD5E1" : "#4F46E5" }}>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      ) : (
        /* Onglet demandes en attente */
        <div>
          {pendingUsers.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: "#64748B" }}>
              <CheckCircle size={48} color="#10B981" style={{ marginBottom: 12 }} />
              <p>Aucune demande en attente.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {pendingUsers.map(u => (
                <div key={u._id} style={{ background: "#FFF", borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{u.nom}</div>
                    <div style={{ fontSize: 13, color: "#64748B" }}>@{u.login} · {u.role}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleApprove(u._id)} style={{ background: "#10B981", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                      <UserCheck size={16} /> Approuver
                    </button>
                    <button onClick={() => handleReject(u._id)} style={{ background: "#EF4444", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                      <UserX size={16} /> Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal formulaire */}
      {showForm && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => { setShowForm(false); resetForm(); }}>
          <div style={{ background: "#FFF", borderRadius: 16, padding: 24, maxWidth: 500, width: "90%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>
              {editUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Nom complet</label>
                <input value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${formErrors.nom ? "#EF4444" : "#E2E8F0"}`, borderRadius: 8, fontSize: 14 }} />
                {formErrors.nom && <span style={{ color: "#EF4444", fontSize: 12 }}>{formErrors.nom}</span>}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Login</label>
                <input value={formData.login} onChange={e => setFormData({ ...formData, login: e.target.value })} disabled={!!editUser}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${formErrors.login ? "#EF4444" : "#E2E8F0"}`, borderRadius: 8, fontSize: 14, background: editUser ? "#F1F5F9" : "white" }} />
                {formErrors.login && <span style={{ color: "#EF4444", fontSize: 12 }}>{formErrors.login}</span>}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>
                  Mot de passe {editUser && "(laisser vide pour ne pas changer)"}
                </label>
                <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${formErrors.password ? "#EF4444" : "#E2E8F0"}`, borderRadius: 8, fontSize: 14 }} />
                {formErrors.password && <span style={{ color: "#EF4444", fontSize: 12 }}>{formErrors.password}</span>}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Rôle</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, background: "#F8FAFC" }}>
                  {["admin","directeur","disciplinaire","enseignant","parent","comptable","eleve"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {formData.role === "enseignant" && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Classe</label>
                  <input value={formData.classe} onChange={e => setFormData({ ...formData, classe: e.target.value })}
                    placeholder="Ex: 6ème A" style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14 }} />
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                <button type="submit" disabled={submitting}
                  style={{ background: "#4F46E5", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  {submitting ? <Loader size={16} className="animate-spin" /> : null}
                  {editUser ? "Enregistrer" : "Créer"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  style={{ background: "#F1F5F9", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 500, cursor: "pointer" }}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// Petite carte statistique
function StatCard({ icon, value, label, color }) {
  return (
    <div style={{
      background: "#FFF", borderRadius: 16, padding: 16, display: "flex",
      alignItems: "center", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
    }}>
      <div style={{ width: 40, height: 40, background: `${color}15`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#1E293B" }}>{value}</div>
        <div style={{ fontSize: 13, color: "#64748B" }}>{label}</div>
      </div>
    </div>
  );
}