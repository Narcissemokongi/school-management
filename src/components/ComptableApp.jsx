import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { Layout } from "./Layout";
import { DashboardComptable } from "./DashboardComptable";
import { GestionFrais } from "./GestionFrais";
import { MessagerieApp } from "./messagerie/MessagerieApp";
import { Appels } from "./Appels";
import { ProfilUtilisateur } from "./ProfilUtilisateur";
import { Aide } from "./Aide";
import { MentionsLegales } from "./MentionsLegales";
import { PolitiqueConfidentialite } from "./PolitiqueConfidentialite";
import {
  DollarSign, BarChart3, MessageCircle, Phone, HelpCircle,
  FileText, Shield, User, Calendar, TrendingUp, AlertCircle,
  Download, Search, Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export function ComptableApp({
  user,
  ecoleId,
  eleves,
  anneeId,
  anneeActive,
  dark,
  toggle,
  handleLogout,
}) {
  const { S } = useStyles();
  const [tab, setTab] = useState("dashboard");
  const [messagingContactId, setMessagingContactId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatut, setFilterStatut] = useState("all"); // all, paye, impaye, partiel
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const handleNavigateToMessaging = (contactId) => {
    setMessagingContactId(contactId);
    setTab("messagerie");
  };

  const menu = [
    { id: "dashboard", label: "Tableau de bord", icon: <BarChart3 size={20} /> },
    { id: "frais", label: "Frais", icon: <DollarSign size={20} /> },
    { id: "messagerie", label: "Messages", icon: <MessageCircle size={20} /> },
    { id: "appels", label: "Appels", icon: <Phone size={20} /> },
    { id: "profil", label: "Profil", icon: <User size={20} /> },
    { id: "aide", label: "Aide", icon: <HelpCircle size={20} /> },
    { id: "mentions", label: "Mentions légales", icon: <FileText size={20} /> },
    { id: "confidentialite", label: "Confidentialité", icon: <Shield size={20} /> },
  ];

  // Query pour les frais (déjà disponible ?)
  const fraisQuery = useQuery(api.frais.listByEcole, {
    ecoleId,
    anneeId,
  });
  const frais = fraisQuery ?? [];

  // Statistiques financières
  const stats = useMemo(() => {
    const totalEleves = eleves?.length ?? 0;
    const totalFrais = frais.reduce((sum, f) => sum + (f.montantTotal || 0), 0);
    const totalPaye = frais.reduce((sum, f) => sum + (f.montantPaye || 0), 0);
    const totalRestant = totalFrais - totalPaye;
    const tauxRecouvrement = totalFrais > 0 ? ((totalPaye / totalFrais) * 100).toFixed(1) : 0;
    const elevesEnRetard = frais.filter(f => (f.montantRestant || 0) > 0).length;
    return { totalEleves, totalFrais, totalPaye, totalRestant, tauxRecouvrement, elevesEnRetard };
  }, [frais, eleves]);

  // Filtrage des frais pour la vue "frais"
  const filteredFrais = useMemo(() => {
    let result = frais;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(f =>
        (f.eleveNom && f.eleveNom.toLowerCase().includes(q)) ||
        (f.libelle && f.libelle.toLowerCase().includes(q))
      );
    }
    if (filterStatut === "paye") result = result.filter(f => (f.montantRestant || 0) === 0);
    else if (filterStatut === "impaye") result = result.filter(f => (f.montantRestant || 0) > 0);
    else if (filterStatut === "partiel") result = result.filter(f => (f.montantPaye || 0) > 0 && (f.montantRestant || 0) > 0);
    return result;
  }, [frais, searchTerm, filterStatut]);

  const totalPages = Math.ceil(filteredFrais.length / pageSize);
  const paginatedFrais = filteredFrais.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Export Excel
  const handleExportExcel = () => {
    const data = filteredFrais.map(f => ({
      "Élève": f.eleveNom || "",
      "Libellé": f.libelle || "",
      "Montant Total": f.montantTotal || 0,
      "Montant Payé": f.montantPaye || 0,
      "Reste": f.montantRestant || 0,
      "Statut": (f.montantRestant || 0) === 0 ? "Payé" : (f.montantPaye || 0) > 0 ? "Partiel" : "Impayé",
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Frais");
    XLSX.writeFile(workbook, "frais.xlsx");
    toast.success("Export Excel réussi");
  };

  const renderContent = () => {
    if ((tab === "dashboard" || tab === "frais") && !anneeId) {
      return (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
          <Calendar size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1E293B", margin: "0 0 8px" }}>
            Aucune année scolaire active
          </h2>
          <p style={{ color: "#64748B", fontSize: 14 }}>
            Veuillez demander à l'administrateur d'activer une année scolaire pour accéder aux données financières.
          </p>
        </div>
      );
    }

    switch (tab) {
      case "dashboard":
        return (
          <DashboardComptable
            ecoleId={ecoleId}
            eleves={eleves}
            anneeId={anneeId}
            anneeActive={anneeActive}
            stats={stats}
          />
        );
      case "frais":
        return (
          <div>
            {/* Barre d'outils frais */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16, padding: "0 24px" }}>
              <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }} />
                <input
                  placeholder="Rechercher un élève ou un frais..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  style={{ width: "100%", padding: "8px 12px 8px 34px", borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: dark ? "#1E293B" : "#FFFFFF", color: dark ? "#F1F5F9" : "#1E293B", fontSize: 14, outline: "none" }}
                />
              </div>
              <select
                value={filterStatut}
                onChange={(e) => { setFilterStatut(e.target.value); setCurrentPage(1); }}
                style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: dark ? "#1E293B" : "#FFFFFF", color: dark ? "#F1F5F9" : "#1E293B", cursor: "pointer" }}
              >
                <option value="all">Tous</option>
                <option value="paye">Payé</option>
                <option value="impaye">Impayé</option>
                <option value="partiel">Partiel</option>
              </select>
              <button onClick={handleExportExcel} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: dark ? "#334155" : "#F1F5F9", border: "none", borderRadius: 8, color: dark ? "#F1F5F9" : "#1E293B", cursor: "pointer", fontSize: 13 }}>
                <Download size={16} /> Exporter Excel
              </button>
            </div>

            <GestionFrais
              ecoleId={ecoleId}
              eleves={eleves}
              anneeId={anneeId}
              anneeActive={anneeActive}
              user={user}
              frais={paginatedFrais}
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        );
      case "messagerie":
        return <MessagerieApp user={user} ecoleId={ecoleId} initialSelectedUserId={messagingContactId} />;
      case "appels":
        return (
          <Appels
            user={user}
            ecoleId={ecoleId}
            anneeId={anneeId}
            onNavigateToMessaging={handleNavigateToMessaging}
          />
        );
      case "profil":
        return <ProfilUtilisateur user={user} />;
      case "aide":
        return <Aide user={user} />;
      case "mentions":
        return <MentionsLegales />;
      case "confidentialite":
        return <PolitiqueConfidentialite />;
      default:
        return null;
    }
  };

  return (
    <Layout
      menu={menu}
      activeTab={tab}
      onTabChange={setTab}
      user={user}
      dark={dark}
      onToggleTheme={toggle}
      onLogout={handleLogout}
    >
      {!anneeId && (
        <div style={{
          background: "#FEF3C7",
          color: "#92400E",
          padding: "10px 20px",
          fontSize: 13,
          fontWeight: 500,
          textAlign: "center",
          borderRadius: "0 0 12px 12px",
          margin: "0 24px 16px",
        }}>
          ⚠️ Aucune année scolaire active. Les données financières sont indisponibles.
        </div>
      )}

      {/* Cartes de résumé financier */}
      {anneeId && tab === "dashboard" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, padding: "0 24px", marginBottom: 24 }}>
          <div style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B" }}>Total élèves</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B" }}>{stats.totalEleves}</div>
          </div>
          <div style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B" }}>Total facturé</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#3B82F6" }}>{stats.totalFrais.toLocaleString()} FC</div>
          </div>
          <div style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B" }}>Total payé</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#10B981" }}>{stats.totalPaye.toLocaleString()} FC</div>
          </div>
          <div style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B" }}>Reste à payer</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#EF4444" }}>{stats.totalRestant.toLocaleString()} FC</div>
          </div>
        </div>
      )}

      {renderContent()}
    </Layout>
  );
}