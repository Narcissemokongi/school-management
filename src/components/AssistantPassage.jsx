import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useConfirm } from "../hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import {
  GraduationCap, ArrowRight, CheckCircle, Loader, ClipboardList,
  Calendar, Search, X, CheckCircle2, AlertTriangle, ListChecks,
} from "lucide-react";

export function AssistantPassage({ ecoleId, anneeActiveId, classes, user }) {
  const { S, dark } = useStyles();
  const { confirm, dialogProps } = useConfirm();

  // ----- Données -----
  const annees = useQuery(api.anneesScolaires.listByEcole, ecoleId ? { ecoleId } : "skip") ?? [];
  const inscriptions = useQuery(
    api.inscriptions.listByAnnee,
    ecoleId && anneeActiveId ? { ecoleId, anneeId: anneeActiveId } : "skip"
  ) ?? [];
  const propositions = useQuery(
    api.propositionsPassage.listPropositions,
    ecoleId && anneeActiveId ? { ecoleId, anneeId: anneeActiveId } : "skip"
  ) ?? [];

  // ----- Mutations -----
  const promouvoirEleves = useMutation(api.inscriptions.promouvoirEleves);
  const cloturerAnnee = useMutation(api.inscriptions.cloturerAnnee);

  // ----- État local -----
  const [nouvelleAnneeId, setNouvelleAnneeId] = useState("");
  const [decisions, setDecisions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("tous"); // "tous" | "a_decider" | "decides" | "avec_proposition" | "sans_proposition"
  const [sortBy, setSortBy] = useState("nom"); // "nom" | "decision"
  const [classeParDefaut, setClasseParDefaut] = useState("");

  // ----- Dérivations -----
  const classesTriees = useMemo(
    () => [...classes].sort((a, b) => a.nom.localeCompare(b.nom, undefined, { numeric: true })),
    [classes]
  );

  const anneesDestination = useMemo(
    () => annees.filter((a) => a._id !== anneeActiveId),
    [annees, anneeActiveId]
  );

  // Synchronisation initiale des décisions avec les propositions des enseignants
  useEffect(() => {
    if (propositions.length > 0) {
      setDecisions((prev) => {
        const updated = { ...prev };
        propositions.forEach((prop) => {
          if (!updated[prop.eleveId] || updated[prop.eleveId].isFromTeacher === false) {
            updated[prop.eleveId] = {
              statut: prop.statutPropose,
              classeDestination: prop.classeDestinationPropose || "",
              isFromTeacher: true,
            };
          }
        });
        return updated;
      });
    }
  }, [propositions]);

  // Regrouper par classe, trier les élèves alphabétiquement
  const parClasse = useMemo(() => {
    const map = new Map();
    inscriptions.forEach((insc) => {
      if (!map.has(insc.classe)) map.set(insc.classe, []);
      map.get(insc.classe).push(insc);
    });

    for (const [classe, eleves] of map.entries()) {
      eleves.sort((a, b) => {
        const nomA = `${a.nom} ${a.postnom} ${a.prenom || ''}`.toLowerCase();
        const nomB = `${b.nom} ${b.postnom} ${b.prenom || ''}`.toLowerCase();
        return nomA.localeCompare(nomB, 'fr', { sensitivity: 'base' });
      });
    }

    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], 'fr', { numeric: true, sensitivity: 'base' })
    );
  }, [inscriptions]);

  // Filtrage + tri
  const parClasseFiltre = useMemo(() => {
    let filtered = parClasse.map(([classe, eleves]) => {
      let filteredEleves = eleves;

      // Recherche
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        filteredEleves = filteredEleves.filter((insc) =>
          `${insc.nom} ${insc.postnom} ${insc.prenom || ''}`.toLowerCase().includes(q)
        );
      }

      // Filtres
      if (filter === "a_decider") {
        filteredEleves = filteredEleves.filter((insc) => !decisions[insc.eleveId]);
      } else if (filter === "decides") {
        filteredEleves = filteredEleves.filter((insc) => decisions[insc.eleveId]);
      } else if (filter === "avec_proposition") {
        filteredEleves = filteredEleves.filter((insc) => propositions.some((p) => p.eleveId === insc.eleveId));
      } else if (filter === "sans_proposition") {
        filteredEleves = filteredEleves.filter((insc) => !propositions.some((p) => p.eleveId === insc.eleveId));
      }

      // Tri
      if (sortBy === "decision") {
        filteredEleves = [...filteredEleves].sort((a, b) => {
          const statutA = decisions[a.eleveId]?.statut || "zzz";
          const statutB = decisions[b.eleveId]?.statut || "zzz";
          return statutA.localeCompare(statutB);
        });
      }

      return [classe, filteredEleves];
    }).filter(([_, eleves]) => eleves.length > 0);

    return filtered;
  }, [parClasse, searchTerm, filter, decisions, propositions, sortBy]);

  // Statistiques
  const nbTotal = inscriptions.length;
  const nbPropositions = propositions.length;
  const nbDecisions = Object.keys(decisions).length;
  const nbSansDecision = inscriptions.filter((insc) => !decisions[insc.eleveId]).length;
  const nbPassant = Object.values(decisions).filter((d) => d.statut === "passant").length;
  const nbRedoublant = Object.values(decisions).filter((d) => d.statut === "redoublant").length;

  // ----- Handlers -----
  const updateDecision = (eleveId, field, value) => {
    setDecisions((prev) => ({
      ...prev,
      [eleveId]: {
        ...prev[eleveId],
        [field]: value,
        isFromTeacher: false,
      },
    }));
  };

  const marquerTousPassants = () => {
    if (!classeParDefaut) {
      toast.error("Veuillez d'abord choisir la classe de destination par défaut.");
      return;
    }
    const newDecisions = { ...decisions };
    inscriptions.forEach((insc) => {
      if (!decisions[insc.eleveId]) {
        newDecisions[insc.eleveId] = {
          statut: "passant",
          classeDestination: classeParDefaut,
          isFromTeacher: false,
        };
      }
    });
    setDecisions(newDecisions);
    toast.success(`Tous les élèves sans décision sont marqués passants vers ${classeParDefaut}.`);
  };

  const handlePromotion = async () => {
    const elevesSansDecision = inscriptions.filter((insc) => !decisions[insc.eleveId]);
    if (elevesSansDecision.length > 0) {
      toast.error(`Il reste ${elevesSansDecision.length} élève(s) sans décision.`);
      return;
    }
    if (!nouvelleAnneeId) {
      toast.error("Veuillez sélectionner l'année de destination.");
      return;
    }

    const ok = await confirm(
      "Promouvoir les élèves",
      `Voulez-vous vraiment appliquer les décisions pour ${inscriptions.length} élève(s) ?`
    );
    if (!ok) return;

    const decisionsArray = inscriptions.map((insc) => ({
      eleveId: insc.eleveId,
      statut: decisions[insc.eleveId].statut,
      classeDestination: decisions[insc.eleveId].classeDestination,
    }));

    setSubmitting(true);
    try {
      await promouvoirEleves({
        ecoleId,
        anneeActuelleId: anneeActiveId,
        nouvelleAnneeId,
        decisions: decisionsArray,
        userId: user._id,
      });
      toast.success("Promotion effectuée avec succès !");
      setDecisions({});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloture = async () => {
    const ok = await confirm(
      "Clôturer l'année",
      "Voulez-vous clôturer l'année active ? Cette action est irréversible."
    );
    if (!ok) return;
    setSubmitting(true);
    try {
      await cloturerAnnee({
        ecoleId,
        anneeId: anneeActiveId,
        nouvelleAnneeId: nouvelleAnneeId || undefined,
        userId: user._id,
      });
      toast.success("Année clôturée.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Couleurs adaptatives
  const colors = {
    textPrimary: dark ? "#F1F5F9" : "#1E293B",
    textSecondary: dark ? "#94A3B8" : "#64748B",
    cardBg: dark ? "#1E293B" : "#FFFFFF",
    cardBorder: dark ? "#334155" : "#E2E8F0",
    selectBg: dark ? "#0F172A" : "#F9FAFB",
    selectText: dark ? "#F1F5F9" : "#1E293B",
    accent: dark ? "#818CF8" : "#4F46E5",
    danger: dark ? "#F87171" : "#EF4444",
    success: dark ? "#34D399" : "#10B981",
    warning: dark ? "#FBBF24" : "#F59E0B",
    badgePassant: dark ? "#064E3B" : "#D1FAE5",
    badgePassantText: dark ? "#34D399" : "#065F46",
    badgeRedoublant: dark ? "#78350F" : "#FEF3C7",
    badgeRedoublantText: dark ? "#FBBF24" : "#92400E",
    propBadgeBg: dark ? "#064E3B" : "#D1FAE5",
    propBadgeText: dark ? "#34D399" : "#065F46",
  };

  const isLoading = inscriptions === undefined || propositions === undefined || annees === undefined;

  if (!anneeActiveId) {
    return <div style={{ textAlign: "center", padding: 40, color: colors.textSecondary }}>Aucune année active.</div>;
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <Loader size={32} className="animate-spin" style={{ color: colors.accent }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* En-tête */}
      <h2 style={{ fontSize: 28, fontWeight: 700, color: colors.textPrimary, marginBottom: 8 }}>
        Assistant de passage
      </h2>
      <p style={{ color: colors.textSecondary, marginBottom: 24 }}>
        Validez ou ajustez les décisions pour chaque élève. Les propositions des enseignants sont affichées.
      </p>

      {/* Statistiques rapides */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <Badge text={`Élèves : ${nbTotal}`} bg={colors.cardBg} color={colors.textPrimary} border={colors.cardBorder} />
        <Badge text={`Propositions : ${nbPropositions}`} bg={colors.propBadgeBg} color={colors.propBadgeText} />
        <Badge text={`Décisions : ${nbDecisions}`} bg={colors.badgePassant} color={colors.badgePassantText} />
        <Badge text={`Sans décision : ${nbSansDecision}`} bg={colors.cardBg} color={colors.danger} border={colors.danger} />
        <Badge text={`Passant : ${nbPassant}`} bg={colors.badgePassant} color={colors.badgePassantText} />
        <Badge text={`Redoublant : ${nbRedoublant}`} bg={colors.badgeRedoublant} color={colors.badgeRedoublantText} />
      </div>

      {/* Sélecteur année + recherche + filtre + tri */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200 }}>
          <Calendar size={18} color={colors.textSecondary} />
          <select
            value={nouvelleAnneeId}
            onChange={(e) => setNouvelleAnneeId(e.target.value)}
            style={{
              padding: "8px 12px", border: `1px solid ${colors.cardBorder}`, borderRadius: 8,
              fontSize: 14, background: colors.selectBg, color: colors.selectText, outline: "none", flex: 1,
            }}
          >
            <option value="">-- Année de destination --</option>
            {anneesDestination.map((annee) => (
              <option key={annee._id} value={annee._id} style={{ background: colors.cardBg }}>
                {annee.nom}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: 8, padding: "8px 12px", flex: 2, minWidth: 200 }}>
          <Search size={16} color={colors.textSecondary} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un élève..."
            style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14, color: colors.textPrimary, marginLeft: 8 }}
          />
          {searchTerm && <button onClick={() => setSearchTerm("")} style={{ background: "none", border: "none", cursor: "pointer", color: colors.textSecondary }}><X size={16} /></button>}
        </div>

        {/* Boutons de filtre */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <FilterButton label="Tous" active={filter === "tous"} onClick={() => setFilter("tous")} colors={colors} />
          <FilterButton label="À décider" active={filter === "a_decider"} onClick={() => setFilter("a_decider")} colors={colors} />
          <FilterButton label="Décidés" active={filter === "decides"} onClick={() => setFilter("decides")} colors={colors} />
          <FilterButton label="Avec proposition" active={filter === "avec_proposition"} onClick={() => setFilter("avec_proposition")} colors={colors} />
          <FilterButton label="Sans proposition" active={filter === "sans_proposition"} onClick={() => setFilter("sans_proposition")} colors={colors} />
        </div>

        {/* Tri */}
        <div style={{ display: "flex", gap: 4 }}>
          <FilterButton label="Tri nom" active={sortBy === "nom"} onClick={() => setSortBy("nom")} colors={colors} />
          <FilterButton label="Tri décision" active={sortBy === "decision"} onClick={() => setSortBy("decision")} colors={colors} />
        </div>
      </div>

      {/* Action groupée */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <select
          value={classeParDefaut}
          onChange={(e) => setClasseParDefaut(e.target.value)}
          style={{ padding: "8px 12px", border: `1px solid ${colors.cardBorder}`, borderRadius: 8, fontSize: 14, background: colors.selectBg, color: colors.selectText }}
        >
          <option value="">-- Classe par défaut --</option>
          {classesTriees.map((c) => <option key={c._id} value={c.nom} style={{ background: colors.cardBg }}>{c.nom}</option>)}
        </select>
        <button
          onClick={marquerTousPassants}
          disabled={!classeParDefaut || nbSansDecision === 0}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
            background: colors.accent, color: "white", border: "none", borderRadius: 8,
            cursor: "pointer", fontSize: 13, fontWeight: 500,
            opacity: !classeParDefaut || nbSansDecision === 0 ? 0.6 : 1,
          }}
        >
          <ListChecks size={16} /> Marquer tous les sans-décision comme passants
        </button>
      </div>

      {/* Liste par classe */}
      {parClasseFiltre.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: colors.textSecondary }}>
          Aucun élève trouvé.
        </div>
      ) : (
        parClasseFiltre.map(([classe, eleves]) => (
          <div key={classe} style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: colors.textPrimary, marginBottom: 12 }}>
              {classe}
            </h3>
            <div style={{ display: "grid", gap: 12 }}>
              {eleves.map((insc) => {
                const decision = decisions[insc.eleveId] || {};
                const hasProposition = propositions.some((p) => p.eleveId === insc.eleveId);
                const prop = propositions.find((p) => p.eleveId === insc.eleveId);
                const isSansDecision = !decision.statut;
                return (
                  <div
                    key={insc._id}
                    style={{
                      background: colors.cardBg,
                      borderRadius: 12,
                      padding: "14px 16px",
                      border: `1px solid ${isSansDecision ? colors.warning : hasProposition ? colors.success : colors.cardBorder}`,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      transition: "background-color 0.3s",
                    }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontWeight: 600, color: colors.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {insc.nom} {insc.postnom} {insc.prenom}
                        </div>
                        <div style={{ fontSize: 13, color: colors.textSecondary }}>
                          Matricule : {insc.code || "—"}
                        </div>
                        {hasProposition && (
                          <span style={{
                            display: "inline-block",
                            marginTop: 4,
                            background: colors.propBadgeBg,
                            color: colors.propBadgeText,
                            padding: "2px 8px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                          }}>
                            Proposition reçue
                          </span>
                        )}
                      </div>

                      {/* Sélecteur de décision */}
                      <div style={{ minWidth: 150 }}>
                        <select
                          value={decision.statut || ""}
                          onChange={(e) => updateDecision(insc.eleveId, "statut", e.target.value)}
                          style={{
                            width: "100%", padding: "8px 12px", border: `1px solid ${colors.cardBorder}`,
                            borderRadius: 8, fontSize: 14, background: colors.selectBg, color: colors.selectText, outline: "none",
                          }}
                        >
                          <option value="">-- Choisir --</option>
                          <option value="passant">Passant</option>
                          <option value="redoublant">Redoublant</option>
                          <option value="transfere">Transféré</option>
                          <option value="exclu">Exclu</option>
                          <option value="diplome">Diplômé</option>
                        </select>
                      </div>

                      {decision.statut === "passant" && (
                        <div style={{ minWidth: 150 }}>
                          <select
                            value={decision.classeDestination || ""}
                            onChange={(e) => updateDecision(insc.eleveId, "classeDestination", e.target.value)}
                            style={{
                              width: "100%", padding: "8px 12px", border: `1px solid ${colors.cardBorder}`,
                              borderRadius: 8, fontSize: 14, background: colors.selectBg, color: colors.selectText, outline: "none",
                            }}
                          >
                            <option value="">-- Classe --</option>
                            {classesTriees.map((c) => (
                              <option key={c._id} value={c.nom} style={{ background: colors.cardBg }}>
                                {c.nom}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Badge de décision */}
                      {decision.statut ? (
                        <div style={{ minWidth: 80, textAlign: "center" }}>
                          {decision.statut === "passant" ? (
                            <span style={{ background: colors.badgePassant, color: colors.badgePassantText, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                              Passant
                            </span>
                          ) : decision.statut === "redoublant" ? (
                            <span style={{ background: colors.badgeRedoublant, color: colors.badgeRedoublantText, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                              Redoublant
                            </span>
                          ) : (
                            <span style={{ background: colors.cardBorder, color: colors.textSecondary, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                              {decision.statut}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: colors.danger, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
                          <AlertTriangle size={14} /> À décider
                        </span>
                      )}
                    </div>

                    {/* Proposition détaillée de l'enseignant */}
                    {prop && (
                      <div style={{ marginTop: 8, fontSize: 12, color: colors.textSecondary, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span>📝 Proposition : {prop.statutPropose}</span>
                        {prop.classeDestinationPropose && <span>→ {prop.classeDestinationPropose}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Boutons d'action */}
      {parClasse.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
          <button
            onClick={handlePromotion}
            disabled={submitting || !nouvelleAnneeId || nbSansDecision > 0}
            style={{
              padding: "12px 24px",
              background: colors.accent,
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: submitting || !nouvelleAnneeId || nbSansDecision > 0 ? 0.7 : 1,
            }}
          >
            {submitting ? <Loader size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            Promouvoir les élèves
          </button>
          <button
            onClick={handleCloture}
            disabled={submitting}
            style={{
              padding: "12px 24px",
              background: colors.danger,
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ClipboardList size={18} /> Clôturer l'année
          </button>
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ==================== SOUS-COMPOSANTS ====================

function Badge({ text, bg, color, border }) {
  return (
    <span style={{
      padding: "4px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: bg,
      color,
      border: border ? `1px solid ${border}` : undefined,
    }}>
      {text}
    </span>
  );
}

function FilterButton({ label, active, onClick, colors }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 10px",
        background: active ? colors.accent : "transparent",
        color: active ? "#FFF" : colors.textSecondary,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}