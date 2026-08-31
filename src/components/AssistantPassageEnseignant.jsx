import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import {
  Calendar, ArrowRight, Loader, ClipboardList, Search, X,
  CheckCircle2, AlertTriangle, Send, ListChecks, Eye,
} from "lucide-react";

// ==================== CONSTANTES ====================
const STATUS_OPTIONS = [
  { value: "passant", label: "Passant", badgeClass: "passant" },
  { value: "redoublant", label: "Redoublant", badgeClass: "redoublant" },
  { value: "transfere", label: "Transféré", badgeClass: "autre" },
  { value: "exclu", label: "Exclu", badgeClass: "autre" },
  { value: "diplome", label: "Diplômé", badgeClass: "autre" },
];

// ==================== COMPOSANT PRINCIPAL ====================
export function AssistantPassageEnseignant({ ecoleId, anneeActiveId, user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // <-- Hook mobile
  const { confirm, dialogProps } = useConfirm();

  // ----- État local -----
  const [nouvelleAnneeId, setNouvelleAnneeId] = useState("");
  const [decisions, setDecisions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("sans_decision");
  const [classeParDefaut, setClasseParDefaut] = useState("");
  const [activeTab, setActiveTab] = useState("a_traiter");

  // ----- Requêtes Convex -----
  const inscriptions = useQuery(
    api.inscriptions.listByAnnee,
    ecoleId && anneeActiveId ? { ecoleId, anneeId: anneeActiveId } : "skip"
  ) ?? [];

  const annees = useQuery(api.anneesScolaires.listByEcole, ecoleId ? { ecoleId } : "skip") ?? [];

  const classesDisponibles = useQuery(
    api.classes.list,
    ecoleId ? { ecoleId, anneeId: anneeActiveId } : "skip"
  ) ?? [];

  const propositionsExistantes = useQuery(
    api.propositionsPassage.listByEnseignantAndAnnee,
    ecoleId && anneeActiveId ? { ecoleId, anneeId: anneeActiveId, enseignantId: user._id } : "skip"
  ) ?? [];

  // ----- Mutations -----
  const soumettrePropositions = useMutation(api.propositionsPassage.soumettrePropositions);

  // ----- Dérivations -----
  const classeEnseignant = user.classe;

  const inscriptionsDeMaClasse = useMemo(() => {
    return inscriptions
      .filter((insc) => insc.classe === classeEnseignant)
      .sort((a, b) => {
        const nomA = `${a.nom} ${a.postnom} ${a.prenom || ''}`.toLowerCase().trim();
        const nomB = `${b.nom} ${b.postnom} ${b.prenom || ''}`.toLowerCase().trim();
        return nomA.localeCompare(nomB, 'fr', { sensitivity: 'base' });
      });
  }, [inscriptions, classeEnseignant]);

  const elevesDejaSoumis = useMemo(() => {
    return new Set(propositionsExistantes.map((p) => p.eleveId));
  }, [propositionsExistantes]);

  const elevesATraiter = useMemo(() => {
    return inscriptionsDeMaClasse.filter((insc) => !elevesDejaSoumis.has(insc.eleveId));
  }, [inscriptionsDeMaClasse, elevesDejaSoumis]);

  const elevesSoumis = useMemo(() => {
    return propositionsExistantes.map((prop) => {
      const inscription = inscriptionsDeMaClasse.find((i) => i.eleveId === prop.eleveId);
      return {
        ...prop,
        nom: inscription?.nom || "—",
        postnom: inscription?.postnom || "",
        prenom: inscription?.prenom || "",
        code: inscription?.code || "",
      };
    });
  }, [propositionsExistantes, inscriptionsDeMaClasse]);

  const filteredATraiter = useMemo(() => {
    let list = elevesATraiter;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((insc) =>
        `${insc.nom} ${insc.postnom} ${insc.prenom || ''}`.toLowerCase().includes(q)
      );
    }
    if (filter === "sans_decision") {
      list = list.filter((insc) => !decisions[insc.eleveId]);
    } else if (filter === "avec_decision") {
      list = list.filter((insc) => decisions[insc.eleveId]);
    }
    return list;
  }, [elevesATraiter, searchTerm, filter, decisions]);

  const classesTriees = useMemo(
    () => [...classesDisponibles].sort((a, b) => a.nom.localeCompare(b.nom, undefined, { numeric: true })),
    [classesDisponibles]
  );

  // Statistiques
  const nbTotal = inscriptionsDeMaClasse.length;
  const nbSoumis = elevesDejaSoumis.size;
  const nbATraiter = nbTotal - nbSoumis;
  const nbSansDecision = elevesATraiter.filter((insc) => !decisions[insc.eleveId]).length;
  const nbAvecDecision = elevesATraiter.filter((insc) => decisions[insc.eleveId]).length;

  const elevesASoumettre = elevesATraiter.filter((insc) => decisions[insc.eleveId]);
  const nbASoumettre = elevesASoumettre.length;

  const isLoading =
    inscriptions === undefined ||
    classesDisponibles === undefined ||
    annees === undefined ||
    propositionsExistantes === undefined;

  // ----- Handlers -----
  const updateDecision = (eleveId, field, value) => {
    if (elevesDejaSoumis.has(eleveId)) return;
    setDecisions((prev) => ({
      ...prev,
      [eleveId]: { ...prev[eleveId], [field]: value },
    }));
  };

  const marquerTousPassants = () => {
    if (!classeParDefaut) {
      toast.error("Veuillez d'abord choisir la classe de destination par défaut.");
      return;
    }
    const newDecisions = { ...decisions };
    elevesATraiter.forEach((insc) => {
      if (!decisions[insc.eleveId]) {
        newDecisions[insc.eleveId] = { statut: "passant", classeDestination: classeParDefaut };
      }
    });
    setDecisions(newDecisions);
    toast.success(`Élèves non soumis marqués passants vers ${classeParDefaut}.`);
  };

  const handleSoumettre = async () => {
    if (!nouvelleAnneeId) {
      toast.error("Veuillez sélectionner l'année de destination.");
      return;
    }
    if (elevesASoumettre.length === 0) {
      toast.error("Aucun élève traité à soumettre.");
      return;
    }

    const ok = await confirm(
      "Soumettre les propositions traitées",
      `Vous allez soumettre ${elevesASoumettre.length} proposition(s). Les élèves déjà soumis ne seront pas affectés. Confirmer ?`
    );
    if (!ok) return;

    const decisionsArray = elevesASoumettre.map((insc) => ({
      eleveId: insc.eleveId,
      statut: decisions[insc.eleveId].statut,
      classeDestination: decisions[insc.eleveId].classeDestination,
    }));

    setSubmitting(true);
    try {
      await soumettrePropositions({
        ecoleId,
        anneeId: anneeActiveId,
        decisions: decisionsArray,
        userId: user._id,
      });
      const newDecisions = { ...decisions };
      elevesASoumettre.forEach((insc) => delete newDecisions[insc.eleveId]);
      setDecisions(newDecisions);
      toast.success(`${elevesASoumettre.length} proposition(s) soumise(s).`);
      setActiveTab("soumis");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Rendu conditionnel -----
  if (!classeEnseignant) {
    return <Message text="Aucune classe assignée." dark={dark} />;
  }

  if (isLoading) {
    return <LoaderSpinner dark={dark} />;
  }

  // Couleurs adaptatives
  const colors = {
    textPrimary: dark ? "#F1F5F9" : "#1E293B",
    textSecondary: dark ? "#94A3B8" : "#64748B",
    cardBg: dark ? "#1E293B" : "#FFFFFF",
    cardBorder: dark ? "#334155" : "#E2E8F0",
    selectBg: dark ? "#0F172A" : "#F9FAFB",
    selectText: dark ? "#F1F5F9" : "#1E293B",
    accent: dark ? "#818CF8" : "#4F46E5",
    badgePassant: dark ? "#064E3B" : "#D1FAE5",
    badgePassantText: dark ? "#34D399" : "#065F46",
    badgeRedoublant: dark ? "#78350F" : "#FEF3C7",
    badgeRedoublantText: dark ? "#FBBF24" : "#92400E",
    badgeDefault: dark ? "#334155" : "#E2E8F0",
    badgeSoumis: dark ? "#312E81" : "#EEF2FF",
    badgeSoumisText: dark ? "#A5B4FC" : "#4F46E5",
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 16px" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* En-tête */}
      <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: colors.textPrimary, marginBottom: 8 }}>
        Assistant de passage — {classeEnseignant}
      </h2>
      <p style={{ color: colors.textSecondary, marginBottom: isMobile ? 16 : 24, fontSize: isMobile ? 14 : 16 }}>
        Traitez les élèves progressivement. Soumettez d'abord ceux déjà décidés, puis revenez pour les autres.
      </p>

      {/* Onglets principaux */}
      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${colors.cardBorder}`, marginBottom: isMobile ? 16 : 24 }}>
        <TabButton
          label={`À traiter (${nbATraiter})`}
          active={activeTab === "a_traiter"}
          onClick={() => setActiveTab("a_traiter")}
          colors={colors}
          isMobile={isMobile}
        />
        <TabButton
          label={`Soumis (${nbSoumis})`}
          active={activeTab === "soumis"}
          onClick={() => setActiveTab("soumis")}
          colors={colors}
          isMobile={isMobile}
        />
      </div>

      {activeTab === "a_traiter" && (
        <>
          {/* Barre d'outils */}
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 16 : 24, alignItems: "stretch" }}>
            {/* Sélection année */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: isMobile ? "none" : 1, minWidth: isMobile ? "100%" : 200 }}>
              <Calendar size={isMobile ? 16 : 18} color={colors.textSecondary} />
              <select
                value={nouvelleAnneeId}
                onChange={(e) => setNouvelleAnneeId(e.target.value)}
                style={{
                  padding: isMobile ? "10px 12px" : "8px 12px",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 8,
                  fontSize: isMobile ? 16 : 14,
                  background: colors.selectBg,
                  color: colors.selectText,
                  outline: "none",
                  flex: 1,
                }}
              >
                <option value="">-- Année de destination --</option>
                {annees.filter((a) => a._id !== anneeActiveId).map((annee) => (
                  <option key={annee._id} value={annee._id} style={{ background: colors.cardBg }}>
                    {annee.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Recherche */}
            <div style={{ display: "flex", alignItems: "center", background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: 8, padding: isMobile ? "10px 12px" : "8px 12px", flex: isMobile ? "none" : 2, minWidth: isMobile ? "100%" : 200 }}>
              <Search size={isMobile ? 14 : 16} color={colors.textSecondary} />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un élève..."
                style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: isMobile ? 16 : 14, color: colors.textPrimary, marginLeft: 8 }}
              />
              {searchTerm && <button onClick={() => setSearchTerm("")} style={{ background: "none", border: "none", cursor: "pointer", color: colors.textSecondary }}><X size={isMobile ? 14 : 16} /></button>}
            </div>

            {/* Filtres secondaires */}
            <div style={{ display: "flex", gap: 4, flexDirection: isMobile ? "column" : "row" }}>
              <FilterButton
                label={`Sans décision (${nbSansDecision})`}
                active={filter === "sans_decision"}
                onClick={() => setFilter("sans_decision")}
                colors={colors}
                isMobile={isMobile}
              />
              <FilterButton
                label={`Avec décision (${nbAvecDecision})`}
                active={filter === "avec_decision"}
                onClick={() => setFilter("avec_decision")}
                colors={colors}
                isMobile={isMobile}
              />
            </div>
          </div>

          {/* Résumé et action groupée */}
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", gap: isMobile ? 8 : 16, marginBottom: 16, alignItems: "stretch" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge text={`Passant : ${Object.values(decisions).filter(d => d.statut === "passant").length}`} bg={colors.badgePassant} color={colors.badgePassantText} />
              <Badge text={`Redoublant : ${Object.values(decisions).filter(d => d.statut === "redoublant").length}`} bg={colors.badgeRedoublant} color={colors.badgeRedoublantText} />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexDirection: isMobile ? "column" : "row", marginLeft: isMobile ? "0" : "auto" }}>
              <select
                value={classeParDefaut}
                onChange={(e) => setClasseParDefaut(e.target.value)}
                style={{ padding: isMobile ? "10px 12px" : "6px 10px", border: `1px solid ${colors.cardBorder}`, borderRadius: 8, fontSize: isMobile ? 16 : 13, background: colors.selectBg, color: colors.selectText, width: isMobile ? "100%" : "auto" }}
              >
                <option value="">-- Classe par défaut --</option>
                {classesTriees.map((c) => <option key={c._id} value={c.nom} style={{ background: colors.cardBg }}>{c.nom}</option>)}
              </select>
              <button
                onClick={marquerTousPassants}
                disabled={!classeParDefaut || nbSansDecision === 0}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: isMobile ? "10px 12px" : "6px 12px", background: colors.accent, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: isMobile ? 14 : 13, fontWeight: 500, opacity: !classeParDefaut || nbSansDecision === 0 ? 0.6 : 1, width: isMobile ? "100%" : "auto" }}
              >
                <ListChecks size={isMobile ? 16 : 16} /> Marquer tous passants
              </button>
            </div>
          </div>

          {/* Liste des élèves à traiter */}
          <StudentListToTreat
            inscriptions={filteredATraiter}
            decisions={decisions}
            elevesDejaSoumis={elevesDejaSoumis}
            classesTriees={classesTriees}
            updateDecision={updateDecision}
            colors={colors}
            isMobile={isMobile}
          />

          {/* Bouton de soumission */}
          <div style={{ marginTop: isMobile ? 16 : 24, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
            <button
              onClick={handleSoumettre}
              disabled={submitting || !nouvelleAnneeId || elevesASoumettre.length === 0}
              style={{
                padding: isMobile ? "12px 16px" : "12px 24px",
                background: colors.accent,
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: submitting || elevesASoumettre.length === 0 ? 0.7 : 1,
                width: isMobile ? "100%" : "auto",
                fontSize: isMobile ? 16 : 14,
              }}
            >
              {submitting ? <Loader size={18} className="animate-spin" /> : <Send size={isMobile ? 16 : 18} />}
              Soumettre {elevesASoumettre.length > 0 ? `(${elevesASoumettre.length})` : ""}
            </button>
            <span style={{ color: colors.textSecondary, fontSize: isMobile ? 13 : 13, textAlign: isMobile ? "center" : "left" }}>
              📋 Vous pourrez soumettre le reste plus tard.
            </span>
          </div>
        </>
      )}

      {activeTab === "soumis" && (
        <StudentListSubmitted
          propositions={elevesSoumis}
          colors={colors}
          classesTriees={classesTriees}
          isMobile={isMobile}
        />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ==================== SOUS-COMPOSANTS ====================

function TabButton({ label, active, onClick, colors, isMobile }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: isMobile ? "10px 12px" : "12px 20px",
        border: "none",
        background: "transparent",
        color: active ? colors.accent : colors.textSecondary,
        fontWeight: active ? 600 : 400,
        borderBottom: active ? `3px solid ${colors.accent}` : "3px solid transparent",
        cursor: "pointer",
        transition: "all 0.2s",
        whiteSpace: "nowrap",
        fontSize: isMobile ? 14 : 16,
      }}
    >
      {label}
    </button>
  );
}

function FilterButton({ label, active, onClick, colors, isMobile }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: isMobile ? "10px 12px" : "6px 10px",
        background: active ? colors.accent : "transparent",
        color: active ? "#FFF" : colors.textSecondary,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 6,
        cursor: "pointer",
        fontSize: isMobile ? 14 : 12,
        whiteSpace: "nowrap",
        width: isMobile ? "100%" : "auto",
      }}
    >
      {label}
    </button>
  );
}

function StudentListToTreat({ inscriptions, decisions, elevesDejaSoumis, classesTriees, updateDecision, colors, isMobile }) {
  if (inscriptions.length === 0) {
    return <div style={{ textAlign: "center", padding: 40, color: colors.textSecondary }}>Aucun élève à traiter.</div>;
  }

  return (
    <div style={{ display: "grid", gap: isMobile ? 8 : 12 }}>
      {inscriptions.map((insc) => {
        const decision = decisions[insc.eleveId] || {};
        const hasDecision = !!decision.statut;
        return (
          <div
            key={insc._id}
            style={{
              background: colors.cardBg,
              borderRadius: 12,
              padding: isMobile ? "12px 14px" : "14px 16px",
              border: `1px solid ${hasDecision ? colors.cardBorder : "#F59E0B"}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              transition: "background-color 0.3s",
            }}
          >
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", gap: isMobile ? 8 : 12, alignItems: isMobile ? "stretch" : "center" }}>
              <div style={{ flex: 1, minWidth: isMobile ? "100%" : 200 }}>
                <div style={{ fontWeight: 600, color: colors.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: isMobile ? 15 : 16 }}>
                  {insc.nom} {insc.postnom} {insc.prenom}
                </div>
                <div style={{ fontSize: isMobile ? 13 : 13, color: colors.textSecondary }}>
                  Matricule : {insc.code || "—"}
                </div>
              </div>

              <select
                value={decision.statut || ""}
                onChange={(e) => updateDecision(insc.eleveId, "statut", e.target.value)}
                style={{ minWidth: isMobile ? "100%" : 150, padding: isMobile ? "10px 12px" : "8px 12px", border: `1px solid ${colors.cardBorder}`, borderRadius: 8, fontSize: isMobile ? 16 : 14, background: colors.selectBg, color: colors.selectText, outline: "none" }}
              >
                <option value="">-- Choisir --</option>
                <option value="passant">Passant</option>
                <option value="redoublant">Redoublant</option>
                <option value="transfere">Transféré</option>
                <option value="exclu">Exclu</option>
                <option value="diplome">Diplômé</option>
              </select>

              {decision.statut === "passant" && (
                <select
                  value={decision.classeDestination || ""}
                  onChange={(e) => updateDecision(insc.eleveId, "classeDestination", e.target.value)}
                  style={{ minWidth: isMobile ? "100%" : 150, padding: isMobile ? "10px 12px" : "8px 12px", border: `1px solid ${colors.cardBorder}`, borderRadius: 8, fontSize: isMobile ? 16 : 14, background: colors.selectBg, color: colors.selectText }}
                >
                  <option value="">-- Classe --</option>
                  {classesTriees.map((c) => <option key={c._id} value={c.nom} style={{ background: colors.cardBg }}>{c.nom}</option>)}
                </select>
              )}

              {hasDecision ? (
                <span style={{ background: colors.badgeDefault, color: colors.textSecondary, padding: "4px 10px", borderRadius: 20, fontSize: isMobile ? 12 : 12, fontWeight: 600, textAlign: "center" }}>
                  Prêt à soumettre
                </span>
              ) : (
                <span style={{ color: "#F59E0B", display: "inline-flex", alignItems: "center", gap: 4, fontSize: isMobile ? 12 : 12, fontWeight: 600 }}>
                  <AlertTriangle size={isMobile ? 14 : 14} /> À décider
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StudentListSubmitted({ propositions, colors, classesTriees, isMobile }) {
  if (propositions.length === 0) {
    return <div style={{ textAlign: "center", padding: 40, color: colors.textSecondary }}>Aucune proposition soumise.</div>;
  }

  return (
    <div style={{ display: "grid", gap: isMobile ? 8 : 12 }}>
      {propositions.map((prop) => (
        <div
          key={prop._id}
          style={{
            background: colors.cardBg,
            borderRadius: 12,
            padding: isMobile ? "12px 14px" : "14px 16px",
            border: `1px solid ${colors.cardBorder}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            opacity: 0.85,
          }}
        >
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", gap: isMobile ? 8 : 12, alignItems: isMobile ? "stretch" : "center" }}>
            <div style={{ flex: 1, minWidth: isMobile ? "100%" : 200 }}>
              <div style={{ fontWeight: 600, color: colors.textPrimary, fontSize: isMobile ? 15 : 16 }}>
                {prop.nom} {prop.postnom} {prop.prenom}
              </div>
              <div style={{ fontSize: isMobile ? 13 : 13, color: colors.textSecondary }}>
                Matricule : {prop.code || "—"}
              </div>
            </div>

            <Badge
              text={prop.statutPropose}
              bg={prop.statutPropose === "passant" ? colors.badgePassant : prop.statutPropose === "redoublant" ? colors.badgeRedoublant : colors.badgeDefault}
              color={prop.statutPropose === "passant" ? colors.badgePassantText : prop.statutPropose === "redoublant" ? colors.badgeRedoublantText : colors.textSecondary}
            />

            {prop.classeDestinationPropose && (
              <span style={{ fontSize: isMobile ? 13 : 13, color: colors.textSecondary }}>
                → {prop.classeDestinationPropose}
              </span>
            )}

            <span style={{ fontSize: isMobile ? 12 : 12, color: colors.textSecondary, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <CheckCircle2 size={isMobile ? 14 : 14} color={colors.badgeSoumisText} /> Soumis
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Badge({ text, bg, color }) {
  return (
    <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: bg, color }}>
      {text}
    </span>
  );
}

function Message({ text, dark }) {
  const color = dark ? "#94A3B8" : "#64748B";
  return <div style={{ textAlign: "center", padding: 40, color }}>{text}</div>;
}

function LoaderSpinner({ dark }) {
  const color = dark ? "#818CF8" : "#4F46E5";
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
      <Loader size={32} className="animate-spin" style={{ color }} />
    </div>
  );
}