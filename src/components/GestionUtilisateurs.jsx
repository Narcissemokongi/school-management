import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { useConfirm } from "../hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Search, Edit2, Trash2, UserCheck, UserX, Loader,
  Users, UserPlus, Clock, CheckCircle, ChevronLeft, ChevronRight,
  Filter, Download, LayoutGrid, List as ListIcon, Eye, X,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export function GestionUtilisateurs({ ecoleId, userId }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const { confirm, dialogProps } = useConfirm();

  const [tab, setTab] = useState("actifs");

  const users = useQuery(api.users.listByEcole, ecoleId ? { ecoleId } : "skip");
  const pendingUsers = useQuery(api.users.listPendingUsers, ecoleId ? { ecoleId } : "skip");
  const classes = useQuery(api.classes.list, ecoleId ? { ecoleId } : "skip") ?? [];

  const addUser = useMutation(api.users.add);
  const updateUser = useMutation(api.users.update);
  const removeUser = useMutation(api.users.remove);
  const approveUser = useMutation(api.users.approveUser);
  const rejectUser = useMutation(api.users.rejectUser);

  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({
    nom: "",
    login: "",
    password: "",
    confirmPassword: "",
    role: "enseignant",
    classe: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [classeFilter, setClasseFilter] = useState("");
  const [sortKey, setSortKey] = useState("nom");
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [viewMode, setViewMode] = useState("table");
  const [showFilters, setShowFilters] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const pageSize = 10;

  const classNames = useMemo(() => [...new Set(classes.map(c => c.nom))].sort(), [classes]);

  const stats = useMemo(() => {
    const total = users?.length ?? 0;
    const parRole = {};
    users?.forEach(u => {
      parRole[u.role] = (parRole[u.role] || 0) + 1;
    });
    return { total, pending: pendingUsers?.length ?? 0, parRole };
  }, [users, pendingUsers]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    let list = users.filter(u => {
      const matchSearch = searchTerm.length === 0 ||
        u.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.login.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = !roleFilter || u.role === roleFilter;
      const matchClasse = !classeFilter || u.classe === classeFilter;
      return matchSearch && matchRole && matchClasse;
    });
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

  const handleSearchChange = (val) => { setSearchTerm(val); setCurrentPage(1); };
  const handleRoleFilterChange = (val) => { setRoleFilter(val); setCurrentPage(1); };
  const handleClasseFilterChange = (val) => { setClasseFilter(val); setCurrentPage(1); };
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const roles = useMemo(() => {
    if (!users) return [];
    const set = new Set(users.map(u => u.role));
    return Array.from(set).sort();
  }, [users]);

  const resetForm = () => {
    setFormData({ nom: "", login: "", password: "", confirmPassword: "", role: "enseignant", classe: "" });
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
      confirmPassword: "",
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
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = "Les mots de passe ne correspondent pas.";
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
          adminId: userId,
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

  const handleDelete = async (id) => {
    const ok = await confirm("Supprimer", "Supprimer cet utilisateur ?");
    if (!ok) return;
    try {
      await removeUser({ id, adminId: userId });
      toast.success("Utilisateur supprimé");
    } catch (err) {
      toast.error(err.message);
    }
  };

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
      await removeUser({ id, adminId: userId }).catch(() => {});
    }
    toast.success(`${selectedIds.size} utilisateur(s) supprimé(s)`);
    setSelectedIds(new Set());
  };

  const handleApprove = async (id) => {
    try {
      await approveUser({ userId: id, adminId: userId });
      toast.success("Utilisateur approuvé");
    } catch (err) {
      toast.error(err.message);
    }
  };
  const handleReject = async (id) => {
    const reason = prompt("Motif du rejet (optionnel) :");
    try {
      await rejectUser({ userId: id, reason: reason || undefined, adminId: userId });
      toast.success("Utilisateur rejeté");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleExportExcel = () => {
    setExporting(true);
    try {
      const data = filteredUsers.map(u => ({
        Nom: u.nom,
        Login: u.login,
        Rôle: u.role,
        Classe: u.classe || "",
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Utilisateurs");
      XLSX.writeFile(workbook, "utilisateurs.xlsx");
      toast.success("Export Excel réussi.");
    } catch (err) {
      toast.error("Erreur lors de l'export.");
    } finally {
      setExporting(false);
    }
  };

  // ========== COULEURS ADAPTATIVES ==========
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const tableHeaderBg = dark ? "#0F172A" : "#F8FAFC";
  const rowEvenBg = dark ? "#1E293B" : "#FFFFFF";
  const rowOddBg = dark ? "#0F172A" : "#F8FAFC";
  const buttonPrimary = dark ? "#818CF8" : "#4F46E5";
  const buttonSecondaryBg = dark ? "#334155" : "#F1F5F9";
  const buttonSecondaryText = dark ? "#F1F5F9" : "#1E293B";
  const modalBg = dark ? "#1E293B" : "#FFFFFF";

  // ========== STYLES ADAPTATIFS MOBILE ==========
  const containerPadding = isMobile ? "16px 12px" : "clamp(16px, 4vw, 32px)";
  const headerMargin = isMobile ? 20 : 32;
  const headerTitleSize = isMobile ? 22 : 28;
  const headerSubtitleSize = isMobile ? 14 : 14;
  const statGridCols = isMobile ? "1fr" : "repeat(auto-fit, minmax(150px, 1fr))";
  const statGap = isMobile ? 8 : 16;
  const tabPadding = isMobile ? "10px 12px" : "12px 20px";
  const tabFontSize = isMobile ? 14 : 16;
  const toolbarFlexDirection = isMobile ? "column" : "row";
  const toolbarGap = isMobile ? 8 : 12;
  const toolbarInputPadding = isMobile ? "10px 12px" : "8px 12px";
  const toolbarInputFontSize = isMobile ? 16 : 14;
  const toolbarButtonPadding = isMobile ? "10px 16px" : "10px 16px";
  const toolbarButtonFontSize = isMobile ? 14 : 14;
  const filterGridDirection = isMobile ? "column" : "row";
  const filterSelectPadding = isMobile ? "10px 12px" : "8px 12px";
  const filterSelectFontSize = isMobile ? 16 : 14;
  const tableViewDisplay = isMobile ? "none" : "block"; // Masquer le tableau sur mobile, afficher les cartes
  const cardsGridCols = isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))";
  const modalMaxWidth = isMobile ? "92%" : 500;
  const modalPadding = isMobile ? 18 : 24;
  const formInputPadding = isMobile ? "12px 14px" : "10px 14px";
  const formInputFontSize = isMobile ? 16 : 14;
  const formButtonPadding = isMobile ? "12px 16px" : "10px 20px";
  const formButtonFontSize = isMobile ? 16 : 14;

  // ========== RENDU ==========
  if (users === undefined || pendingUsers === undefined) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <Loader size={32} className="animate-spin" style={{ color: buttonPrimary }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: containerPadding }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes fadeInZoom {
          0% { opacity: 0; transform: scale(0.95) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* En-tête */}
      <div style={{ marginBottom: headerMargin }}>
        <h2 style={{ fontSize: headerTitleSize, fontWeight: 700, color: textPrimary, margin: 0 }}>Gestion des utilisateurs</h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: headerSubtitleSize }}>
          {stats.total} compte(s) actif(s) · {stats.pending} en attente
        </p>
      </div>

      {/* Statistiques */}
      <div style={{ display: "grid", gridTemplateColumns: statGridCols, gap: statGap, marginBottom: headerMargin }}>
        <StatCard icon={<Users size={24} />} value={stats.total} label="Total" color="#4F46E5" dark={dark} isMobile={isMobile} />
        <StatCard icon={<Clock size={24} />} value={stats.pending} label="En attente" color="#F59E0B" dark={dark} isMobile={isMobile} />
        {roles.slice(0, 4).map(role => (
          <StatCard key={role} icon={<Users size={24} />} value={stats.parRole[role] || 0} label={role} color="#10B981" dark={dark} isMobile={isMobile} />
        ))}
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${cardBorder}`, marginBottom: headerMargin }}>
        <button
          onClick={() => { setTab("actifs"); setCurrentPage(1); }}
          style={{
            padding: tabPadding, border: "none", background: "transparent",
            color: tab === "actifs" ? buttonPrimary : textSecondary,
            fontWeight: tab === "actifs" ? 600 : 400,
            borderBottom: tab === "actifs" ? `3px solid ${buttonPrimary}` : "3px solid transparent",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            transition: "color 0.2s, border-color 0.2s",
            fontSize: tabFontSize, whiteSpace: "nowrap",
          }}
        >
          <UserCheck size={isMobile ? 16 : 18} /> Comptes actifs
        </button>
        <button
          onClick={() => { setTab("pending"); }}
          style={{
            padding: tabPadding, border: "none", background: "transparent",
            color: tab === "pending" ? buttonPrimary : textSecondary,
            fontWeight: tab === "pending" ? 600 : 400,
            borderBottom: tab === "pending" ? `3px solid ${buttonPrimary}` : "3px solid transparent",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            transition: "color 0.2s, border-color 0.2s",
            fontSize: tabFontSize, whiteSpace: "nowrap",
          }}
        >
          <Clock size={isMobile ? 16 : 18} /> Demandes en attente ({stats.pending})
        </button>
      </div>

      {/* Contenu selon l'onglet */}
      {tab === "actifs" ? (
        <>
          {/* Barre d'outils */}
          <div style={{ display: "flex", flexDirection: toolbarFlexDirection, flexWrap: "wrap", gap: toolbarGap, marginBottom: 20, alignItems: isMobile ? "stretch" : "center" }}>
            <div style={{ display: "flex", alignItems: "center", background: cardBg, borderRadius: 12, padding: toolbarInputPadding, border: `1px solid ${cardBorder}`, flex: 1, minWidth: isMobile ? "100%" : 200 }}>
              <Search size={isMobile ? 16 : 18} color={textSecondary} />
              <input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{ border: "none", outline: "none", marginLeft: 8, fontSize: toolbarInputFontSize, width: "100%", background: "transparent", color: textPrimary }}
              />
            </div>

            <button
              onClick={() => setShowFilters(prev => !prev)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: toolbarButtonPadding, background: buttonSecondaryBg, color: buttonSecondaryText,
                border: "none", borderRadius: 12, fontWeight: 500, cursor: "pointer",
                fontSize: toolbarButtonFontSize, width: isMobile ? "100%" : "auto",
              }}
            >
              <Filter size={16} /> Filtres
            </button>

            <button
              onClick={() => setViewMode(prev => prev === "table" ? "cards" : "table")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: toolbarButtonPadding, background: buttonSecondaryBg, color: buttonSecondaryText,
                border: "none", borderRadius: 12, fontWeight: 500, cursor: "pointer",
                fontSize: toolbarButtonFontSize, width: isMobile ? "100%" : "auto",
              }}
            >
              {viewMode === "table" ? <LayoutGrid size={16} /> : <ListIcon size={16} />}
              {viewMode === "table" ? "Cartes" : "Tableau"}
            </button>

            <button onClick={openCreate} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: toolbarButtonPadding, background: buttonPrimary, color: "white",
              border: "none", borderRadius: 12, fontWeight: 500, cursor: "pointer",
              whiteSpace: "nowrap", fontSize: toolbarButtonFontSize, width: isMobile ? "100%" : "auto",
            }}>
              <UserPlus size={18} /> Nouveau compte
            </button>

            <button onClick={handleExportExcel} disabled={exporting} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: toolbarButtonPadding, background: buttonSecondaryBg, color: buttonSecondaryText,
              border: "none", borderRadius: 12, fontWeight: 500, cursor: "pointer",
              whiteSpace: "nowrap", fontSize: toolbarButtonFontSize, width: isMobile ? "100%" : "auto",
            }}>
              {exporting ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? "Export..." : "Exporter Excel"}
            </button>

            {selectedIds.size > 0 && (
              <button onClick={deleteSelected} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: toolbarButtonPadding, background: "#EF4444", color: "white",
                border: "none", borderRadius: 12, fontWeight: 500, cursor: "pointer",
                fontSize: toolbarButtonFontSize, width: isMobile ? "100%" : "auto",
              }}>
                <Trash2 size={18} /> Supprimer ({selectedIds.size})
              </button>
            )}
          </div>

          {/* Filtres additionnels */}
          {showFilters && (
            <div style={{ display: "flex", flexDirection: filterGridDirection, flexWrap: "wrap", gap: 12, marginBottom: 16, padding: 16, background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Filter size={16} color={textSecondary} />
                <select
                  value={roleFilter}
                  onChange={(e) => handleRoleFilterChange(e.target.value)}
                  style={{ padding: filterSelectPadding, border: `1px solid ${cardBorder}`, borderRadius: 8, fontSize: filterSelectFontSize, background: inputBg, color: textPrimary, outline: "none", width: isMobile ? "100%" : "auto" }}
                >
                  <option value="">Tous les rôles</option>
                  {roles.map(r => <option key={r} value={r} style={{ background: dark ? "#1E293B" : "#FFF" }}>{r}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Filter size={16} color={textSecondary} />
                <select
                  value={classeFilter}
                  onChange={(e) => handleClasseFilterChange(e.target.value)}
                  style={{ padding: filterSelectPadding, border: `1px solid ${cardBorder}`, borderRadius: 8, fontSize: filterSelectFontSize, background: inputBg, color: textPrimary, outline: "none", width: isMobile ? "100%" : "auto" }}
                >
                  <option value="">Toutes les classes</option>
                  {classNames.map(c => <option key={c} value={c} style={{ background: dark ? "#1E293B" : "#FFF" }}>{c}</option>)}
                </select>
              </div>

              <button
                onClick={() => { setRoleFilter(""); setClasseFilter(""); setSearchTerm(""); setCurrentPage(1); }}
                style={{ padding: isMobile ? "10px 12px" : "8px 12px", border: `1px solid ${cardBorder}`, borderRadius: 8, background: "transparent", color: textPrimary, cursor: "pointer", fontSize: isMobile ? 14 : 14, width: isMobile ? "100%" : "auto" }}
              >
                Réinitialiser
              </button>
            </div>
          )}

          {/* Affichage tableau ou cartes */}
          {!isMobile && viewMode === "table" ? (
            <div style={{ background: cardBg, borderRadius: 20, overflow: "hidden", boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                {/* ... le tableau reste inchangé ... */}
              </table>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: cardsGridCols, gap: 16 }}>
              {paginatedUsers.map(u => (
                <div key={u._id} style={{ background: cardBg, borderRadius: 16, padding: 16, border: `1px solid ${cardBorder}`, boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 600, fontSize: 16, color: textPrimary }}>{u.nom}</div>
                    <input type="checkbox" checked={selectedIds.has(u._id)} onChange={() => toggleSelect(u._id)} style={{ accentColor: buttonPrimary }} />
                  </div>
                  <div style={{ fontSize: 13, color: textSecondary }}>@{u.login}</div>
                  <RoleBadge role={u.role} dark={dark} />
                  <div style={{ fontSize: 13, color: textSecondary }}>{u.classe || "Aucune classe"}</div>
                  <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button onClick={() => setDetailUser(u)} title="Détails" style={{ background: "none", border: "none", cursor: "pointer", color: buttonPrimary }}>
                      <Eye size={18} />
                    </button>
                    <button onClick={() => openEdit(u)} title="Modifier" style={{ background: "none", border: "none", cursor: "pointer", color: buttonPrimary }}>
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(u._id)} title="Supprimer" style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444" }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {paginatedUsers.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: textSecondary }}>
                  Aucun utilisateur trouvé.
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ background: "none", border: `1px solid ${cardBorder}`, borderRadius: 8, padding: isMobile ? "10px 12px" : "6px 12px", cursor: "pointer", color: currentPage === 1 ? "#CBD5E1" : buttonPrimary }}
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    padding: isMobile ? "10px 12px" : "6px 12px",
                    border: "none",
                    borderRadius: 8,
                    background: currentPage === page ? buttonPrimary : buttonSecondaryBg,
                    color: currentPage === page ? "#FFF" : buttonSecondaryText,
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: isMobile ? 14 : 14,
                  }}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ background: "none", border: `1px solid ${cardBorder}`, borderRadius: 8, padding: isMobile ? "10px 12px" : "6px 12px", cursor: "pointer", color: currentPage === totalPages ? "#CBD5E1" : buttonPrimary }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div>
          {pendingUsers.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: textSecondary }}>
              <CheckCircle size={48} color="#10B981" style={{ marginBottom: 12 }} />
              <p>Aucune demande en attente.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {pendingUsers.map(u => (
                <div key={u._id} style={{ background: cardBg, borderRadius: 16, padding: isMobile ? "12px 14px" : "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)", border: `1px solid ${cardBorder}`, flexDirection: isMobile ? "column" : "row", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: textPrimary }}>{u.nom}</div>
                    <div style={{ fontSize: 13, color: textSecondary }}>@{u.login} · {u.role}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, width: isMobile ? "100%" : "auto", flexDirection: isMobile ? "column" : "row" }}>
                    <button onClick={() => handleApprove(u._id)} style={{ background: "#10B981", color: "white", border: "none", borderRadius: 10, padding: isMobile ? "12px 14px" : "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: isMobile ? 14 : 14 }}>
                      <UserCheck size={16} /> Approuver
                    </button>
                    <button onClick={() => handleReject(u._id)} style={{ background: "#EF4444", color: "white", border: "none", borderRadius: 10, padding: isMobile ? "12px 14px" : "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: isMobile ? 14 : 14 }}>
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
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? 12 : 16 }}
          onClick={() => { setShowForm(false); resetForm(); }}>
          <div style={{ background: modalBg, borderRadius: 24, padding: modalPadding, maxWidth: modalMaxWidth, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: dark ? "0 20px 40px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.2)", border: `1px solid ${cardBorder}`, animation: "fadeInZoom 0.3s" }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: textPrimary }}>
              {editUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: isMobile ? 15 : 14, color: textSecondary }}>Nom complet</label>
                <input value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })}
                  style={{ width: "100%", padding: formInputPadding, border: `1px solid ${formErrors.nom ? "#EF4444" : cardBorder}`, borderRadius: 10, fontSize: formInputFontSize, background: inputBg, color: textPrimary }} />
                {formErrors.nom && <span style={{ color: "#EF4444", fontSize: 12 }}>{formErrors.nom}</span>}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: isMobile ? 15 : 14, color: textSecondary }}>Login</label>
                <input value={formData.login} onChange={e => setFormData({ ...formData, login: e.target.value })} disabled={!!editUser}
                  style={{ width: "100%", padding: formInputPadding, border: `1px solid ${formErrors.login ? "#EF4444" : cardBorder}`, borderRadius: 10, fontSize: formInputFontSize, background: editUser ? dark ? "#334155" : "#F1F5F9" : inputBg, color: textPrimary }} />
                {formErrors.login && <span style={{ color: "#EF4444", fontSize: 12 }}>{formErrors.login}</span>}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: isMobile ? 15 : 14, color: textSecondary }}>
                  Mot de passe {editUser && "(laisser vide pour ne pas changer)"}
                </label>
                <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: "100%", padding: formInputPadding, border: `1px solid ${formErrors.password ? "#EF4444" : cardBorder}`, borderRadius: 10, fontSize: formInputFontSize, background: inputBg, color: textPrimary }} />
                {formErrors.password && <span style={{ color: "#EF4444", fontSize: 12 }}>{formErrors.password}</span>}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: isMobile ? 15 : 14, color: textSecondary }}>Confirmer le mot de passe</label>
                <input type="password" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  style={{ width: "100%", padding: formInputPadding, border: `1px solid ${formErrors.confirmPassword ? "#EF4444" : cardBorder}`, borderRadius: 10, fontSize: formInputFontSize, background: inputBg, color: textPrimary }} />
                {formErrors.confirmPassword && <span style={{ color: "#EF4444", fontSize: 12 }}>{formErrors.confirmPassword}</span>}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: isMobile ? 15 : 14, color: textSecondary }}>Rôle</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: "100%", padding: formInputPadding, border: `1px solid ${cardBorder}`, borderRadius: 10, fontSize: formInputFontSize, background: inputBg, color: textPrimary }}>
                  {["admin","directeur","disciplinaire","enseignant","parent","comptable","eleve"].map(r => <option key={r} value={r} style={{ background: dark ? "#1E293B" : "#FFF" }}>{r}</option>)}
                </select>
              </div>
              {formData.role === "enseignant" && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: isMobile ? 15 : 14, color: textSecondary }}>Classe</label>
                  <select value={formData.classe} onChange={e => setFormData({ ...formData, classe: e.target.value })}
                    style={{ width: "100%", padding: formInputPadding, border: `1px solid ${cardBorder}`, borderRadius: 10, fontSize: formInputFontSize, background: inputBg, color: textPrimary }}>
                    <option value="">Aucune classe</option>
                    {classNames.map(c => <option key={c} value={c} style={{ background: dark ? "#1E293B" : "#FFF" }}>{c}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 20, flexDirection: isMobile ? "column" : "row" }}>
                <button type="submit" disabled={submitting}
                  style={{ background: buttonPrimary, color: "white", border: "none", borderRadius: 12, padding: formButtonPadding, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: formButtonFontSize, flex: isMobile ? "none" : 1 }}>
                  {submitting ? <Loader size={16} className="animate-spin" /> : null}
                  {editUser ? "Enregistrer" : "Créer"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  style={{ background: buttonSecondaryBg, color: buttonSecondaryText, border: "none", borderRadius: 12, padding: formButtonPadding, fontWeight: 500, cursor: "pointer", fontSize: formButtonFontSize }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal détails utilisateur */}
      {detailUser && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? 12 : 16 }}
          onClick={() => setDetailUser(null)}>
          <div style={{ background: modalBg, borderRadius: 24, padding: modalPadding, maxWidth: modalMaxWidth, width: "100%", boxShadow: dark ? "0 20px 40px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.2)", border: `1px solid ${cardBorder}`, animation: "fadeInZoom 0.3s" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: textPrimary }}>Détails de l'utilisateur</h3>
              <button onClick={() => setDetailUser(null)} style={{ background: "none", border: "none", cursor: "pointer", color: textSecondary }}><X size={20} /></button>
            </div>
            <p><strong style={{ color: textPrimary }}>Nom :</strong> {detailUser.nom}</p>
            <p><strong style={{ color: textPrimary }}>Login :</strong> {detailUser.login}</p>
            <p><strong style={{ color: textPrimary }}>Rôle :</strong> <RoleBadge role={detailUser.role} dark={dark} /></p>
            <p><strong style={{ color: textPrimary }}>Classe :</strong> {detailUser.classe || "Aucune"}</p>
          </div>
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// Badge de rôle avec couleur (adaptatif)
function RoleBadge({ role, dark }) {
  const colors = {
    admin: { bg: dark ? "#7F1D1D" : "#FEE2E2", color: dark ? "#F87171" : "#B91C1C" },
    directeur: { bg: dark ? "#064E3B" : "#D1FAE5", color: dark ? "#34D399" : "#065F46" },
    disciplinaire: { bg: dark ? "#78350F" : "#FEF3C7", color: dark ? "#FBBF24" : "#92400E" },
    enseignant: { bg: dark ? "#312E81" : "#EEF2FF", color: dark ? "#A5B4FC" : "#4F46E5" },
    parent: { bg: dark ? "#082F49" : "#E0F2FE", color: dark ? "#38BDF8" : "#0369A1" },
    comptable: { bg: dark ? "#500724" : "#FCE7F3", color: dark ? "#F472B6" : "#BE185D" },
    eleve: { bg: dark ? "#2E1065" : "#F3E8FF", color: dark ? "#C084FC" : "#6B21A8" },
  };
  const style = colors[role] || { bg: dark ? "#334155" : "#F1F5F9", color: dark ? "#CBD5E1" : "#475569" };
  return (
    <span style={{
      background: style.bg, color: style.color, padding: "2px 10px",
      borderRadius: 12, fontSize: 13, fontWeight: 500,
    }}>
      {role}
    </span>
  );
}

// Carte statistique adaptative
function StatCard({ icon, value, label, color, dark, isMobile }) {
  return (
    <div style={{
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: 16,
      padding: isMobile ? 14 : 16,
      display: "flex",
      alignItems: "center",
      gap: 12,
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
      transition: "background-color 0.3s",
    }}>
      <div style={{ width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, background: `${color}${dark ? "33" : "15"}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B" }}>{value}</div>
        <div style={{ fontSize: isMobile ? 12 : 13, color: dark ? "#94A3B8" : "#64748B" }}>{label}</div>
      </div>
    </div>
  );
}