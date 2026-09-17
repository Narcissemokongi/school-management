import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useExportPDF } from "@/hooks/useExportPDF";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Search, Download, Check, ArrowLeft, User, X, Printer, Copy, Award,
} from "lucide-react";
import toast from "react-hot-toast";

// ============================================================
// UTILITAIRES
// ============================================================
function generateFicheNumber(eleveId, anneeActive) {
  if (!eleveId) return "FDC-XXXX-000";
  const shortId = eleveId.slice(-6).toUpperCase();
  const year = anneeActive?.nom?.match(/\d{4}/)?.[0] || new Date().getFullYear();
  return `FDC-${year}-${shortId}`;
}

function formatDateFR(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function extractErrMsg(err, fallback = "Erreur inconnue") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err.message) return err.message;
  return fallback;
}

// ============================================================
// CARTE RÉSULTAT ÉLÈVE
// ============================================================
function EleveResultItem({ eleve, nbPunitions, dark, isMobile, onClick }) {
  const [hover, setHover] = useState(false);
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const hoverBg = dark ? "#26334D" : "#F8FAFC";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: isMobile ? "10px 12px" : "10px 14px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: hover ? hoverBg : "transparent",
        transition: "background 0.1s",
        borderBottom: `1px solid ${dark ? "#334155" : "#F1F5F9"}`,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: dark ? "#312E81" : "#EEF2FF",
          color: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        {eleve.nom?.[0]}
        {eleve.postnom?.[0]}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: isMobile ? 13.5 : 14,
            color: textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {eleve.nom} {eleve.postnom}
        </div>
        <div style={{ fontSize: 11, color: textSecondary }}>
          {eleve.classe}
          {eleve.code ? ` · ${eleve.code}` : ""}
        </div>
      </div>
      {nbPunitions > 0 && (
        <span
          style={{
            background: dark ? "#7F1D1D" : "#FEE2E2",
            color: dark ? "#F87171" : "#B91C1C",
            padding: "2px 8px",
            borderRadius: 10,
            fontSize: 10.5,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {nbPunitions}
        </span>
      )}
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function RechercheEleve({ punitions, eleves, fautes, ecoleId, user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [classeFilter, setClasseFilter] = useState("");
  const [graviteFilter, setGraviteFilter] = useState("toutes");
  const [copied, setCopied] = useState(false);
  const ficheRef = useRef(null);
  const { exportPDF, isExporting } = useExportPDF();

  const userId = user?._id;

  // ✅ userId ajouté aux 2 queries + garde
  const effectiveEcoleId = ecoleId || selected?.ecoleId;

  const ecole = useQuery(
    api.ecoles.get,
    effectiveEcoleId && userId
      ? { ecoleId: effectiveEcoleId, userId }
      : "skip"
  );

  const anneeActive = useQuery(
    api.anneesScolaires.getActive,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );

  // ============================================================
  // ÉTATS DE LA FICHE (éditables)
  // ============================================================
  const [appreciation, setAppreciation] = useState("");
  const [recommandation, setRecommandation] = useState({
    conseil: false,
    surveillance: false,
    amelioration: false,
    exemplaire: false,
  });
  const [lieuEmission, setLieuEmission] = useState("");

  // ✅ Reset à chaque changement d'élève
  useEffect(() => {
    if (!selected) return;
    setAppreciation("");
    setRecommandation({
      conseil: false,
      surveillance: false,
      amelioration: false,
      exemplaire: false,
    });
  }, [selected?._id]);

  // ✅ Pré-remplir le lieu dès que l'école est chargée (indépendant du selected)
  useEffect(() => {
    if (!selected) return;
    if (!lieuEmission && ecole?.province) {
      setLieuEmission(ecole.province);
    }
  }, [selected?._id, ecole?.province]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce
  const timeoutRef = useRef(null);
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timeoutRef.current);
  }, [search]);

  // ============================================================
  // COULEURS
  // ============================================================
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const success = dark ? "#34D399" : "#10B981";
  const shadow = dark
    ? "0 1px 3px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.05)";
  const borderLight = dark ? "#334155" : "#F1F5F9";
  const buttonSecondaryBg = dark ? "#334155" : "#F1F5F9";
  const buttonSecondaryText = dark ? "#F1F5F9" : "#1E293B";

  // ============================================================
  // MAPS MÉMOÏSÉS (perf O(1))
  // ============================================================
  const fautesById = useMemo(
    () => new Map((fautes ?? []).map((f) => [f._id, f])),
    [fautes]
  );

  const punitionsParEleve = useMemo(() => {
    const acc = new Map();
    for (const p of punitions ?? []) {
      acc.set(p.idEleve, (acc.get(p.idEleve) ?? 0) + 1);
    }
    return acc;
  }, [punitions]);

  // ============================================================
  // CALCULS
  // ============================================================
  const classes = useMemo(
    () => [...new Set((eleves ?? []).map((e) => e.classe))].sort(),
    [eleves]
  );

  const filtered = useMemo(() => {
    return (eleves ?? []).filter((e) => {
      const matchSearch =
        debouncedSearch.trim().length > 1
          ? `${e.nom} ${e.postnom}`.toLowerCase().includes(
              debouncedSearch.toLowerCase()
            )
          : !classeFilter;
      const matchClasse = classeFilter ? e.classe === classeFilter : true;
      return matchSearch && matchClasse;
    });
  }, [eleves, debouncedSearch, classeFilter]);

  const toutesPunitions = useMemo(() => {
    if (!selected) return [];
    return (punitions ?? [])
      .filter((p) => p.idEleve === selected._id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [selected, punitions]);

  // ✅ Enrichissement une seule fois : punition + faute
  const punitionsEnrichies = useMemo(
    () =>
      toutesPunitions.map((p) => ({
        ...p,
        _faute: fautesById.get(p.idFaute) ?? null,
      })),
    [toutesPunitions, fautesById]
  );

  // ✅ Utilisé pour filtrer par gravité (optionnel)
  const eleveP = useMemo(() => {
    if (graviteFilter === "toutes") return punitionsEnrichies;
    return punitionsEnrichies.filter(
      (p) => p._faute?.gravite === graviteFilter
    );
  }, [punitionsEnrichies, graviteFilter]); // eslint-disable-line no-unused-vars

  const counts = useMemo(() => {
    if (!selected) return { Légère: 0, Moyenne: 0, Grave: 0 };
    const c = { Légère: 0, Moyenne: 0, Grave: 0 };
    punitionsEnrichies.forEach((p) => {
      const g = p._faute?.gravite;
      if (g) c[g] = (c[g] || 0) + 1;
    });
    return c;
  }, [selected, punitionsEnrichies]);

  const totalPunitions = toutesPunitions.length;
  const hasGrave = counts.Grave > 0; // eslint-disable-line no-unused-vars
  const noFaute = totalPunitions === 0;

  // Numéro de fiche
  const ficheNumber = useMemo(
    () => generateFicheNumber(selected?._id, anneeActive),
    [selected?._id, anneeActive]
  );

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleGeneratePDF = useCallback(async () => {
    if (!selected) return;
    try {
      await exportPDF(
        ficheRef,
        `Fiche_Conduite_${selected.nom}_${selected.postnom}.pdf`
      );
      toast.success("PDF généré");
    } catch (err) {
      toast.error(extractErrMsg(err, "Erreur lors de la génération du PDF"));
    }
  }, [selected, exportPDF]);

  const handleCopyFiche = useCallback(async () => {
    if (!selected) return;
    const recommandations = [];
    if (noFaute) recommandations.push("✓ Élève exemplaire");
    if (recommandation.conseil)
      recommandations.push("✓ Recommandé pour conseil de discipline");
    if (recommandation.surveillance) recommandations.push("✓ À surveiller");
    if (recommandation.amelioration)
      recommandations.push("✓ Situation en voie d'amélioration");

    const text = `FICHE DE CONDUITE ${ficheNumber}
${ecole?.nom || ""}${ecole?.code ? ` (${ecole.code})` : ""}

Élève: ${selected.nom} ${selected.postnom} ${selected.prenom || ""}
Matricule: ${selected.code || "—"}
Classe: ${selected.classe}
Sexe: ${selected.sexe || "—"}
Né(e) le: ${selected.dateNaissance || "—"}

Récapitulatif:
- Total fautes: ${totalPunitions}
- Fautes graves: ${counts.Grave}
- Légères: ${counts.Légère}
- Moyennes: ${counts.Moyenne}

Détail complet:
${punitionsEnrichies
  .map(
    (p, i) =>
      `${i + 1}. ${p.date} — ${p._faute?.libelle || "—"} (${p._faute?.gravite || "—"}) — Sanction: ${p.sanction}`
  )
  .join("\n")}

Appréciation: ${appreciation || "—"}

Recommandations:
${recommandations.join("\n") || "—"}

Fait à ${lieuEmission || "—"}, le ${new Date().toLocaleDateString("fr-FR")}

Le Directeur                    Le Parent/Tuteur
_________________              _________________`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Fiche copiée");
    } catch {
      toast.error("Impossible de copier");
    }
  }, [
    selected,
    noFaute,
    recommandation,
    ficheNumber,
    ecole,
    totalPunitions,
    counts,
    punitionsEnrichies,
    appreciation,
    lieuEmission,
  ]);

  const handleBack = useCallback(() => {
    setSelected(null);
    setGraviteFilter("toutes");
  }, []);

  // ============================================================
  // PHASE SÉLECTION
  // ============================================================
  const renderSelection = () => (
    <>
      <div style={{ marginBottom: isMobile ? 12 : 20 }}>
        <h2
          style={{
            fontSize: isMobile ? 17 : 22,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Dossier élève
        </h2>
        <p
          style={{
            color: textSecondary,
            marginTop: 2,
            marginBottom: 0,
            fontSize: isMobile ? 11.5 : 13,
          }}
        >
          Recherchez un élève pour consulter sa fiche de conduite
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          alignItems: "stretch",
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: textSecondary,
            }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un élève…"
            style={{
              width: "100%",
              padding: "12px 12px 12px 38px",
              border: `1px solid ${cardBorder}`,
              borderRadius: 12,
              fontSize: 16,
              outline: "none",
              background: cardBg,
              color: inputText,
              boxSizing: "border-box",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Effacer la recherche"
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: textSecondary,
                display: "flex",
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <select
          value={classeFilter}
          onChange={(e) => setClasseFilter(e.target.value)}
          style={{
            padding: "12px 14px",
            border: `1px solid ${cardBorder}`,
            borderRadius: 12,
            fontSize: 15,
            outline: "none",
            background: cardBg,
            color: inputText,
            cursor: "pointer",
            maxWidth: isMobile ? 120 : 180,
          }}
        >
          <option value="">Classes</option>
          {classes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {(debouncedSearch.length > 1 || classeFilter) && (
        <div
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 12,
            boxShadow: shadow,
            overflow: "hidden",
          }}
        >
          {filtered.length > 0 ? (
            <>
              <div
                style={{
                  padding: "8px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  borderBottom: `1px solid ${borderLight}`,
                }}
              >
                {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
              </div>
              {filtered.map((e) => (
                <EleveResultItem
                  key={e._id}
                  eleve={e}
                  nbPunitions={punitionsParEleve.get(e._id) ?? 0}
                  dark={dark}
                  isMobile={isMobile}
                  onClick={() => {
                    setSelected(e);
                    setSearch(`${e.nom} ${e.postnom}`);
                  }}
                />
              ))}
            </>
          ) : (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: textSecondary,
              }}
            >
              <User size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: 13.5 }}>Aucun élève trouvé</p>
            </div>
          )}
        </div>
      )}

      {debouncedSearch.length <= 1 && !classeFilter && (
        <div
          style={{
            background: cardBg,
            borderRadius: 12,
            border: `1px solid ${cardBorder}`,
            padding: isMobile ? 32 : 48,
            textAlign: "center",
            color: textSecondary,
            boxShadow: shadow,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: dark ? "#334155" : "#F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <Search size={26} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: textPrimary,
            }}
          >
            Recherchez un élève
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12.5 }}>
            Saisissez son nom ou sélectionnez une classe
          </p>
        </div>
      )}
    </>
  );

  // ============================================================
  // PHASE DÉTAIL / FICHE A4
  // ============================================================
  const renderDetail = () => (
    <>
      {/* Header navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: isMobile ? 12 : 16,
        }}
      >
        <button
          onClick={handleBack}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 10,
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            cursor: "pointer",
            color: textPrimary,
            flexShrink: 0,
          }}
          aria-label="Retour"
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            style={{
              fontSize: isMobile ? 15 : 17,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {selected.nom} {selected.postnom}
          </h2>
          <p
            style={{
              color: textSecondary,
              marginTop: 2,
              marginBottom: 0,
              fontSize: isMobile ? 11 : 12.5,
            }}
          >
            {ficheNumber} · Classe {selected.classe}
          </p>
        </div>
      </div>

      {/* ============================================================
          FICHE A4 — C'est ce bloc qui sera capturé en PDF
          ============================================================ */}
      <div
        ref={ficheRef}
        style={{
          background: "#FFFFFF",
          color: "#1E293B",
          borderRadius: isMobile ? 10 : 14,
          padding: isMobile ? 20 : 28,
          border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          maxWidth: 794,
          margin: "0 auto 14px",
          boxSizing: "border-box",
        }}
      >
        {/* ==================== EN-TÊTE ÉCOLE ==================== */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            paddingBottom: 14,
            marginBottom: 16,
            borderBottom: "2px solid #1E293B",
            gap: 12,
            flexWrap: isMobile ? "wrap" : "nowrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: isMobile ? 44 : 52,
                height: isMobile ? 44 : 52,
                borderRadius: 10,
                background: "#4F46E5",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: isMobile ? 16 : 20,
                flexShrink: 0,
                letterSpacing: 0.5,
              }}
            >
              {getInitials(ecole?.nom || "École")}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: isMobile ? 13 : 15,
                  fontWeight: 800,
                  color: "#1E293B",
                  lineHeight: 1.2,
                  marginBottom: 2,
                }}
              >
                {ecole?.nom || "Établissement scolaire"}
              </div>
              {ecole?.code && (
                <div
                  style={{
                    fontSize: isMobile ? 10 : 11,
                    color: "#64748B",
                    fontWeight: 600,
                    marginBottom: 1,
                  }}
                >
                  Code : {ecole.code}
                </div>
              )}
              {ecole?.adresse && (
                <div
                  style={{
                    fontSize: isMobile ? 10 : 11,
                    color: "#64748B",
                    lineHeight: 1.3,
                  }}
                >
                  {ecole.adresse}
                </div>
              )}
              {ecole?.devise && (
                <div
                  style={{
                    fontSize: isMobile ? 10 : 11,
                    color: "#64748B",
                    marginTop: 1,
                  }}
                >
                  Devise : {ecole.devise}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              textAlign: "right",
              flexShrink: 0,
              minWidth: isMobile ? "100%" : "auto",
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: "#64748B",
                textTransform: "uppercase",
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              N° de fiche
            </div>
            <div
              style={{
                fontSize: isMobile ? 12 : 13,
                fontWeight: 800,
                color: "#1E293B",
                letterSpacing: 0.3,
              }}
            >
              {ficheNumber}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "#64748B",
                marginTop: 2,
              }}
            >
              {anneeActive?.nom || new Date().getFullYear()}
            </div>
          </div>
        </div>

        {/* ==================== TITRE DOCUMENT ==================== */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div
            style={{
              fontSize: isMobile ? 14 : 17,
              fontWeight: 800,
              color: "#1E293B",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Fiche de conduite disciplinaire
          </div>
          <div
            style={{
              fontSize: isMobile ? 10 : 11,
              color: "#64748B",
              marginTop: 3,
              fontStyle: "italic",
            }}
          >
            Document interne — Conseil de discipline
          </div>
        </div>

        {/* ==================== IDENTITÉ ÉLÈVE ==================== */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#4F46E5",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              paddingBottom: 4,
              marginBottom: 8,
              borderBottom: "1px solid #E2E8F0",
            }}
          >
            Identité de l'élève
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: isMobile ? 6 : 8,
              fontSize: isMobile ? 11 : 12,
            }}
          >
            <InfoRow
              label="Nom complet"
              value={`${selected.nom} ${selected.postnom} ${selected.prenom || ""}`}
            />
            <InfoRow label="Matricule" value={selected.code || "—"} mono />
            <InfoRow label="Classe" value={selected.classe || "—"} />
            <InfoRow
              label="Sexe"
              value={
                selected.sexe === "M"
                  ? "Masculin"
                  : selected.sexe === "F"
                  ? "Féminin"
                  : "—"
              }
            />
            <InfoRow
              label="Né(e) le"
              value={formatDateFR(selected.dateNaissance)}
            />
            <InfoRow
              label="Lieu de naissance"
              value={selected.lieuNaissance || "—"}
            />
            <InfoRow
              label="Tuteur"
              value={
                selected.tuteurNom ||
                selected.nomPere ||
                selected.nomMere ||
                "—"
              }
            />
            <InfoRow
              label="Téléphone tuteur"
              value={selected.tuteurTelephone || selected.telephone || "—"}
              mono
            />
          </div>
        </div>

        {/* ==================== SYNTHÈSE ==================== */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#4F46E5",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              paddingBottom: 4,
              marginBottom: 8,
              borderBottom: "1px solid #E2E8F0",
            }}
          >
            Synthèse disciplinaire
          </div>

          {noFaute ? (
            <div
              style={{
                padding: "14px 16px",
                background: "#D1FAE5",
                border: "1px solid #10B981",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Award size={20} color="#065F46" />
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#065F46",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Élève exemplaire
                </div>
                <div style={{ fontSize: 11, color: "#047857", marginTop: 2 }}>
                  Aucun antécédent disciplinaire enregistré pour l'année{" "}
                  {anneeActive?.nom || "en cours"}.
                </div>
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: isMobile ? 6 : 8,
                  marginBottom: 10,
                }}
              >
                <CountBox
                  label="Total fautes"
                  value={totalPunitions}
                  color="#4F46E5"
                />
                <CountBox
                  label="Légères"
                  value={counts.Légère}
                  color="#10B981"
                />
                <CountBox
                  label="Moyennes"
                  value={counts.Moyenne}
                  color="#F59E0B"
                />
                <CountBox
                  label="Graves"
                  value={counts.Grave}
                  color="#EF4444"
                />
              </div>

              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: 6,
                  padding: "10px 12px",
                  border: "1px solid #E2E8F0",
                }}
              >
                {Object.entries(counts).map(([gravite, count]) => {
                  if (count === 0) return null;
                  const total = totalPunitions || 1;
                  const width = (count / total) * 100;
                  const color =
                    gravite === "Grave"
                      ? "#EF4444"
                      : gravite === "Moyenne"
                      ? "#F59E0B"
                      : "#10B981";
                  return (
                    <div key={gravite} style={{ marginBottom: 4 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 10,
                          color: "#64748B",
                          marginBottom: 3,
                          fontWeight: 600,
                        }}
                      >
                        <span>{gravite}</span>
                        <span>
                          {count} / {totalPunitions} ({Math.round(width)}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: "#E2E8F0",
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${width}%`,
                            background: color,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ==================== DÉTAIL DES FAUTES ==================== */}
        {!noFaute && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#4F46E5",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                paddingBottom: 4,
                marginBottom: 8,
                borderBottom: "1px solid #E2E8F0",
              }}
            >
              Détail des faits ({totalPunitions})
            </div>

            <div
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: isMobile ? 10 : 11,
                }}
              >
                <thead>
                  <tr style={{ background: "#F1F5F9" }}>
                    <th
                      style={{
                        padding: "6px 8px",
                        textAlign: "center",
                        fontWeight: 700,
                        color: "#475569",
                        fontSize: 9.5,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                        width: 30,
                        borderRight: "1px solid #E2E8F0",
                      }}
                    >
                      N°
                    </th>
                    <th
                      style={{
                        padding: "6px 8px",
                        textAlign: "left",
                        fontWeight: 700,
                        color: "#475569",
                        fontSize: 9.5,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                        borderRight: "1px solid #E2E8F0",
                        width: 70,
                      }}
                    >
                      Date
                    </th>
                    <th
                      style={{
                        padding: "6px 8px",
                        textAlign: "left",
                        fontWeight: 700,
                        color: "#475569",
                        fontSize: 9.5,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                        borderRight: "1px solid #E2E8F0",
                      }}
                    >
                      Faute
                    </th>
                    <th
                      style={{
                        padding: "6px 8px",
                        textAlign: "center",
                        fontWeight: 700,
                        color: "#475569",
                        fontSize: 9.5,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                        width: 65,
                        borderRight: "1px solid #E2E8F0",
                      }}
                    >
                      Gravité
                    </th>
                    <th
                      style={{
                        padding: "6px 8px",
                        textAlign: "left",
                        fontWeight: 700,
                        color: "#475569",
                        fontSize: 9.5,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                        width: 90,
                      }}
                    >
                      Sanction
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {punitionsEnrichies.map((p, i) => {
                    const faute = p._faute;
                    const gravite = faute?.gravite || "—";
                    const graviteColor =
                      gravite === "Grave"
                        ? { bg: "#FEE2E2", text: "#B91C1C" }
                        : gravite === "Moyenne"
                        ? { bg: "#FEF3C7", text: "#92400E" }
                        : { bg: "#D1FAE5", text: "#065F46" };
                    return (
                      <tr
                        key={p._id}
                        style={{
                          borderTop: "1px solid #E2E8F0",
                          background: i % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                        }}
                      >
                        <td
                          style={{
                            padding: "6px 8px",
                            textAlign: "center",
                            color: "#64748B",
                            fontWeight: 600,
                            borderRight: "1px solid #E2E8F0",
                          }}
                        >
                          {i + 1}
                        </td>
                        <td
                          style={{
                            padding: "6px 8px",
                            color: "#1E293B",
                            borderRight: "1px solid #E2E8F0",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatDateFR(p.date)}
                        </td>
                        <td
                          style={{
                            padding: "6px 8px",
                            color: "#1E293B",
                            borderRight: "1px solid #E2E8F0",
                          }}
                        >
                          {faute?.libelle || "—"}
                        </td>
                        <td
                          style={{
                            padding: "6px 8px",
                            textAlign: "center",
                            borderRight: "1px solid #E2E8F0",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 7px",
                              borderRadius: 8,
                              fontSize: 9.5,
                              fontWeight: 700,
                              background: graviteColor.bg,
                              color: graviteColor.text,
                            }}
                          >
                            {gravite}
                          </span>
                        </td>
                        <td style={{ padding: "6px 8px", color: "#1E293B" }}>
                          {p.sanction || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== APPRÉCIATION ÉDITABLE ==================== */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#4F46E5",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              paddingBottom: 4,
              marginBottom: 8,
              borderBottom: "1px solid #E2E8F0",
            }}
          >
            Appréciation de la direction
          </div>

          <textarea
            value={appreciation}
            onChange={(e) => setAppreciation(e.target.value)}
            placeholder={
              noFaute
                ? "Élève sérieux et respectueux. Aucun incident à signaler."
                : "Décrivez le comportement global, l'évolution, le contexte…"
            }
            rows={3}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #E2E8F0",
              borderRadius: 6,
              fontSize: isMobile ? 11 : 12,
              fontFamily: "inherit",
              color: "#1E293B",
              outline: "none",
              resize: "vertical",
              lineHeight: 1.4,
              boxSizing: "border-box",
              background: "#F8FAFC",
              minHeight: 70,
            }}
            data-html2canvas-ignore="true"
          />
        </div>

        {/* ==================== RECOMMANDATIONS ==================== */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#4F46E5",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              paddingBottom: 4,
              marginBottom: 8,
              borderBottom: "1px solid #E2E8F0",
            }}
          >
            Recommandations
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontSize: isMobile ? 11 : 12,
            }}
          >
            <CheckboxRow
              checked={noFaute ? true : recommandation.exemplaire}
              disabled={noFaute}
              onChange={() =>
                setRecommandation((r) => ({
                  ...r,
                  exemplaire: !r.exemplaire,
                }))
              }
              label="Élève exemplaire"
              color="#10B981"
            />
            <CheckboxRow
              checked={recommandation.conseil}
              onChange={() =>
                setRecommandation((r) => ({ ...r, conseil: !r.conseil }))
              }
              label="Recommandé pour conseil de discipline"
              color="#EF4444"
            />
            <CheckboxRow
              checked={recommandation.surveillance}
              onChange={() =>
                setRecommandation((r) => ({
                  ...r,
                  surveillance: !r.surveillance,
                }))
              }
              label="À surveiller"
              color="#F59E0B"
            />
            <CheckboxRow
              checked={recommandation.amelioration}
              onChange={() =>
                setRecommandation((r) => ({
                  ...r,
                  amelioration: !r.amelioration,
                }))
              }
              label="Situation en voie d'amélioration"
              color="#4F46E5"
            />
          </div>
        </div>

        {/* ==================== BLOC SIGNATURE ==================== */}
        <div
          style={{
            marginTop: 22,
            paddingTop: 16,
            borderTop: "2px solid #1E293B",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: isMobile ? 11 : 12, color: "#475569" }}>
              Fait à
            </span>
            <input
              value={lieuEmission}
              onChange={(e) => setLieuEmission(e.target.value)}
              placeholder="Ville"
              style={{
                padding: "4px 8px",
                border: "1px solid #E2E8F0",
                borderRadius: 4,
                fontSize: isMobile ? 11 : 12,
                fontFamily: "inherit",
                color: "#1E293B",
                outline: "none",
                background: "#F8FAFC",
                minWidth: 100,
                flex: isMobile ? 1 : "none",
              }}
              data-html2canvas-ignore="true"
            />
            <span style={{ fontSize: isMobile ? 11 : 12, color: "#475569" }}>
              , le{" "}
              {new Date().toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: isMobile ? 16 : 40,
              marginTop: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 700,
                  color: "#1E293B",
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  marginBottom: 30,
                }}
              >
                Le Directeur
              </div>
              <div
                style={{
                  borderTop: "1px solid #1E293B",
                  paddingTop: 4,
                  fontSize: isMobile ? 9 : 10,
                  color: "#64748B",
                  fontStyle: "italic",
                }}
              >
                Signature + cachet
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 700,
                  color: "#1E293B",
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  marginBottom: 30,
                }}
              >
                Le Parent / Tuteur
              </div>
              <div
                style={{
                  borderTop: "1px solid #1E293B",
                  paddingTop: 4,
                  fontSize: isMobile ? 9 : 10,
                  color: "#64748B",
                  fontStyle: "italic",
                }}
              >
                Signature
              </div>
            </div>
          </div>
        </div>

        {/* ==================== FOOTER ==================== */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 10,
            borderTop: "1px solid #E2E8F0",
            textAlign: "center",
            fontSize: 9,
            color: "#94A3B8",
            fontStyle: "italic",
          }}
        >
          Document généré le {new Date().toLocaleDateString("fr-FR")} —{" "}
          {ficheNumber}
        </div>
      </div>

      {/* ============================================================
          ACTIONS (hors fiche PDF)
          ============================================================ */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <button
          onClick={handleGeneratePDF}
          disabled={isExporting}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "12px 16px",
            background: isExporting ? "#A5B4FC" : accent,
            color: "white",
            border: "none",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 13.5,
            cursor: isExporting ? "not-allowed" : "pointer",
            flex: isMobile ? "none" : 1,
          }}
        >
          <Download size={16} />
          {isExporting ? "Génération…" : "Exporter la fiche"}
        </button>
        <button
          onClick={handleCopyFiche}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "12px 16px",
            background: buttonSecondaryBg,
            color: buttonSecondaryText,
            border: "none",
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 13.5,
            cursor: "pointer",
            flex: isMobile ? "none" : 1,
          }}
        >
          {copied ? <Check size={16} color={success} /> : <Copy size={16} />}
          {copied ? "Copié !" : "Copier le texte"}
        </button>
        <button
          onClick={() => window.print()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "12px 16px",
            background: buttonSecondaryBg,
            color: buttonSecondaryText,
            border: "none",
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 13.5,
            cursor: "pointer",
            flex: isMobile ? "none" : 1,
          }}
        >
          <Printer size={16} />
          Imprimer
        </button>
      </div>

      {/* Historique complet (hors PDF) */}
      <div data-html2canvas-ignore="true">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <h3
            style={{
              fontSize: isMobile ? 14 : 15,
              fontWeight: 700,
              margin: 0,
              color: textPrimary,
            }}
          >
            Historique détaillé
          </h3>
          {toutesPunitions.length > 0 && (
            <span
              style={{
                background: dark ? "#334155" : "#F1F5F9",
                color: textSecondary,
                padding: "1px 8px",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {toutesPunitions.length}
            </span>
          )}
        </div>

        {toutesPunitions.length === 0 ? (
          <div
            style={{
              background: cardBg,
              borderRadius: 12,
              border: `1px solid ${cardBorder}`,
              padding: isMobile ? 24 : 32,
              textAlign: "center",
              color: textSecondary,
              boxShadow: shadow,
            }}
          >
            <Check size={28} color={success} style={{ marginBottom: 8 }} />
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: textPrimary,
              }}
            >
              Aucun antécédent
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {punitionsEnrichies.slice(0, 5).map((p) => {
              const faute = p._faute;
              const isGrave = faute?.gravite === "Grave";
              const isMoyenne = faute?.gravite === "Moyenne";
              return (
                <div
                  key={p._id}
                  style={{
                    background: cardBg,
                    borderRadius: 12,
                    padding: isMobile ? "10px 12px" : "12px 14px",
                    boxShadow: shadow,
                    border: `1px solid ${cardBorder}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: isMobile ? 13 : 13.5,
                        color: textPrimary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {faute?.libelle}
                    </div>
                    <span
                      style={{
                        background: isGrave
                          ? dark
                            ? "#7F1D1D"
                            : "#FEE2E2"
                          : isMoyenne
                          ? dark
                            ? "#78350F"
                            : "#FEF3C7"
                          : dark
                          ? "#064E3B"
                          : "#D1FAE5",
                        color: isGrave
                          ? dark
                            ? "#F87171"
                            : "#B91C1C"
                          : isMoyenne
                          ? dark
                            ? "#FBBF24"
                            : "#92400E"
                          : dark
                          ? "#34D399"
                          : "#065F46",
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: 10.5,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {faute?.gravite}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: textSecondary,
                      marginBottom: 4,
                    }}
                  >
                    {formatDateFR(p.date)} · {p.disciplinaire}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: textPrimary,
                      fontWeight: 500,
                    }}
                  >
                    Sanction : {p.sanction}
                  </div>
                </div>
              );
            })}
            {toutesPunitions.length > 5 && (
              <p
                style={{
                  fontSize: 12,
                  color: textSecondary,
                  textAlign: "center",
                  margin: "4px 0 0",
                }}
              >
                + {toutesPunitions.length - 5} autres fautes (voir la fiche PDF)
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "20px 16px 32px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {selected ? renderDetail() : renderSelection()}
    </div>
  );
}

// ============================================================
// SOUS-COMPOSANTS
// ============================================================
function InfoRow({ label, value, mono = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontSize: 9.5,
          color: "#64748B",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.3,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 11.5,
          color: "#1E293B",
          fontWeight: 600,
          fontFamily: mono ? "ui-monospace, monospace" : "inherit",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function CountBox({ label, value, color }) {
  return (
    <div
      style={{
        background: "#F8FAFC",
        border: `1px solid ${color}30`,
        borderTop: `3px solid ${color}`,
        borderRadius: 6,
        padding: "8px 6px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color,
          lineHeight: 1,
          marginBottom: 2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 9,
          color: "#64748B",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.2,
          lineHeight: 1.2,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function CheckboxRow({ checked, onChange, label, color, disabled }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: disabled ? "default" : "pointer",
        padding: "4px 0",
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          border: `2px solid ${checked ? color : "#94A3B8"}`,
          borderRadius: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: checked ? color : "transparent",
          flexShrink: 0,
        }}
      >
        {checked && (
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 4L3 6L7 2"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span
        style={{
          fontSize: "inherit",
          color: checked ? color : "#1E293B",
          fontWeight: checked ? 700 : 500,
        }}
      >
        {label}
      </span>
    </label>
  );
}