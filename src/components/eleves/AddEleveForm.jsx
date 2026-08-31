import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useStyles } from "../../styles/theme";
import { useIsMobile } from "../../hooks/useIsMobile"; // <-- Import du hook
import { Loader } from "lucide-react";
import toast from "react-hot-toast";
import { trierClasses } from "../../utils/sort";
import { provincesRDC } from "../../utils/rdcData";

export function AddEleveForm({ classes, parents, ecoleId, userId, anneeId, addEleve }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

  // États uniques pour chaque champ
  const [nom, setNom] = useState("");
  const [postnom, setPostnom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [sexe, setSexe] = useState("M");
  const [dateNaissance, setDateNaissance] = useState("");
  const [lieuNaissance, setLieuNaissance] = useState("");
  const [province, setProvince] = useState("");
  const [territoire, setTerritoire] = useState("");
  const [secteur, setSecteur] = useState("");
  const [village, setVillage] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telephone, setTelephone] = useState("");
  const [nomPere, setNomPere] = useState("");
  const [nomMere, setNomMere] = useState("");
  const [tuteurNom, setTuteurNom] = useState("");
  const [tuteurTelephone, setTuteurTelephone] = useState("");
  const [classe, setClasse] = useState("");
  const [parentId, setParentId] = useState("");
  const [createParent, setCreateParent] = useState(false);
  const [newParentNom, setNewParentNom] = useState("");
  const [newParentLogin, setNewParentLogin] = useState("");
  const [newParentPassword, setNewParentPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [adding, setAdding] = useState(false);
  const [createdMatricule, setCreatedMatricule] = useState(null);

  const addUser = useMutation(api.users.add);

  // Trier les classes croissant naturel
  const classesTriees = [...classes].sort((a, b) => trierClasses(a.nom, b.nom));

  useEffect(() => {
    if (classesTriees.length > 0 && !classesTriees.some(c => c.nom === classe)) {
      setClasse(classesTriees[0].nom);
    }
  }, [classesTriees, classe]);

  const validate = () => {
    const errs = {};
    if (!nom.trim()) errs.nom = "Requis";
    if (!postnom.trim()) errs.postnom = "Requis";
    if (!classe) errs.classe = "Sélectionnez une classe";
    if (createParent) {
      if (!newParentNom.trim()) errs.newParentNom = "Requis";
      if (!newParentLogin.trim()) errs.newParentLogin = "Requis";
      if (!newParentPassword || newParentPassword.length < 4) errs.newParentPassword = "4 caractères min.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setAdding(true);
    try {
      let finalParentId = parentId || undefined;
      if (createParent) {
        const newUser = await addUser({
          nom: newParentNom,
          login: newParentLogin,
          password: newParentPassword,
          role: "parent",
          ecoleId,
          userId,
        });
        finalParentId = newUser;
      }

      const eleve = await addEleve({
        nom: nom.trim(),
        postnom: postnom.trim(),
        prenom: prenom.trim(),
        sexe,
        dateNaissance,
        lieuNaissance,
        province,
        territoire,
        secteur,
        village,
        adresse,
        telephone,
        nomPere,
        nomMere,
        tuteurNom,
        tuteurTelephone,
        classe,
        ecoleId,
        parentId: finalParentId,
        anneeId,
        userId,
        actionUserId: userId,
      });

      if (eleve?.code) {
        setCreatedMatricule(eleve.code);
        toast.success(`Élève ajouté · Matricule : ${eleve.code}`);
      } else {
        toast.success("Élève ajouté avec succès");
      }

      // Réinitialiser
      setNom("");
      setPostnom("");
      setPrenom("");
      setSexe("M");
      setDateNaissance("");
      setLieuNaissance("");
      setProvince("");
      setTerritoire("");
      setSecteur("");
      setVillage("");
      setAdresse("");
      setTelephone("");
      setNomPere("");
      setNomMere("");
      setTuteurNom("");
      setTuteurTelephone("");
      setClasse(classesTriees[0]?.nom || "");
      setParentId("");
      setCreateParent(false);
      setNewParentNom("");
      setNewParentLogin("");
      setNewParentPassword("");
      setErrors({});
      setTimeout(() => setCreatedMatricule(null), 8000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  // Styles adaptatifs
  const inputStyle = (field) => ({
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${errors[field] ? "#EF4444" : dark ? "rgba(255,255,255,0.1)" : "#D1D5DB"}`,
    borderRadius: 8,
    fontSize: isMobile ? 16 : 14,
    marginBottom: 12,
    background: dark ? "#0F172A" : "#F9FAFB",
    color: dark ? "#F1F5F9" : "#1E293B",
    outline: "none",
    transition: "border-color 0.2s, background-color 0.3s, color 0.3s",
    boxSizing: "border-box",
  });

  const labelStyle = {
    display: "block",
    marginBottom: 4,
    fontWeight: 500,
    fontSize: isMobile ? 15 : 14,
    color: dark ? "#CBD5E1" : "#374151",
  };

  const sectionTitleStyle = {
    fontSize: isMobile ? 16 : 15,
    fontWeight: 600,
    marginBottom: 12,
    marginTop: 8,
    color: dark ? "#F1F5F9" : "#1E293B",
  };

  const territoiresDisponibles = province
    ? provincesRDC.find(p => p.nom === province)?.territoires || []
    : [];

  const gridColumns = isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))";
  const cardPadding = isMobile ? 16 : 24;
  const titleSize = isMobile ? 17 : 18;
  const buttonPadding = isMobile ? "12px 0" : "10px 0";
  const buttonFontSize = isMobile ? 16 : 14;
  const smallButtonPadding = isMobile ? "10px 16px" : "8px 16px";
  const smallButtonFontSize = isMobile ? 14 : 14;

  return (
    <div style={{
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: 16,
      padding: cardPadding,
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      marginBottom: 24,
      transition: "background-color 0.3s",
    }}>
      <h3 style={{ fontSize: titleSize, fontWeight: 600, marginBottom: 20, color: dark ? "#F1F5F9" : "#1E293B" }}>
        Ajouter un élève
      </h3>

      {/* Section Identité */}
      <div style={sectionTitleStyle}>Identité</div>
      <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12 }}>
        <div>
          <label style={labelStyle}>Nom *</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)} style={inputStyle("nom")} placeholder="Nom de famille" />
          {errors.nom && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -8, marginBottom: 8 }}>{errors.nom}</div>}
        </div>
        <div>
          <label style={labelStyle}>Post-nom *</label>
          <input value={postnom} onChange={(e) => setPostnom(e.target.value)} style={inputStyle("postnom")} placeholder="Post-nom" />
          {errors.postnom && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -8, marginBottom: 8 }}>{errors.postnom}</div>}
        </div>
        <div>
          <label style={labelStyle}>Prénom</label>
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} style={inputStyle("prenom")} placeholder="Prénom" />
        </div>
        <div>
          <label style={labelStyle}>Sexe</label>
          <select value={sexe} onChange={(e) => setSexe(e.target.value)} style={inputStyle("sexe")}>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Date de naissance</label>
          <input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} style={inputStyle("dateNaissance")} />
        </div>
        <div>
          <label style={labelStyle}>Lieu de naissance</label>
          <input value={lieuNaissance} onChange={(e) => setLieuNaissance(e.target.value)} style={inputStyle("lieuNaissance")} placeholder="Lieu" />
        </div>
      </div>

      {/* Section Origine RDC */}
      <div style={sectionTitleStyle}>Origine géographique</div>
      <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12 }}>
        <div>
          <label style={labelStyle}>Province</label>
          <select value={province} onChange={(e) => { setProvince(e.target.value); setTerritoire(""); }} style={inputStyle("province")}>
            <option value="">Sélectionner</option>
            {provincesRDC.map((p) => (
              <option key={p.nom} value={p.nom} style={{ background: dark ? "#1E293B" : "#FFF" }}>{p.nom}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Territoire</label>
          <select value={territoire} onChange={(e) => setTerritoire(e.target.value)} style={inputStyle("territoire")} disabled={!province}>
            <option value="">Sélectionner</option>
            {territoiresDisponibles.map((t) => (
              <option key={t} value={t} style={{ background: dark ? "#1E293B" : "#FFF" }}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Secteur</label>
          <input value={secteur} onChange={(e) => setSecteur(e.target.value)} style={inputStyle("secteur")} placeholder="Secteur" />
        </div>
        <div>
          <label style={labelStyle}>Village</label>
          <input value={village} onChange={(e) => setVillage(e.target.value)} style={inputStyle("village")} placeholder="Village" />
        </div>
      </div>

      {/* Section Contact */}
      <div style={sectionTitleStyle}>Contact</div>
      <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12 }}>
        <div>
          <label style={labelStyle}>Adresse</label>
          <input value={adresse} onChange={(e) => setAdresse(e.target.value)} style={inputStyle("adresse")} placeholder="Adresse complète" />
        </div>
        <div>
          <label style={labelStyle}>Téléphone</label>
          <input value={telephone} onChange={(e) => setTelephone(e.target.value)} style={inputStyle("telephone")} placeholder="Numéro" />
        </div>
      </div>

      {/* Section Parents / Tuteur */}
      <div style={sectionTitleStyle}>Parents / Tuteur</div>
      <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12 }}>
        <div>
          <label style={labelStyle}>Nom du père</label>
          <input value={nomPere} onChange={(e) => setNomPere(e.target.value)} style={inputStyle("nomPere")} placeholder="Père" />
        </div>
        <div>
          <label style={labelStyle}>Nom de la mère</label>
          <input value={nomMere} onChange={(e) => setNomMere(e.target.value)} style={inputStyle("nomMere")} placeholder="Mère" />
        </div>
        <div>
          <label style={labelStyle}>Tuteur</label>
          <input value={tuteurNom} onChange={(e) => setTuteurNom(e.target.value)} style={inputStyle("tuteurNom")} placeholder="Nom du tuteur" />
        </div>
        <div>
          <label style={labelStyle}>Téléphone tuteur</label>
          <input value={tuteurTelephone} onChange={(e) => setTuteurTelephone(e.target.value)} style={inputStyle("tuteurTelephone")} placeholder="Téléphone tuteur" />
        </div>
      </div>

      {/* Classe */}
      <div style={sectionTitleStyle}>Classe</div>
      <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12 }}>
        <div>
          <label style={labelStyle}>Classe *</label>
          <select value={classe} onChange={(e) => setClasse(e.target.value)} style={inputStyle("classe")}>
            {classesTriees.map((c) => (
              <option key={c._id} value={c.nom} style={{ background: dark ? "#1E293B" : "#FFF" }}>
                {c.nom}
              </option>
            ))}
          </select>
          {errors.classe && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -8, marginBottom: 8 }}>{errors.classe}</div>}
        </div>
      </div>

      {/* Parent existant ou création */}
      <div style={sectionTitleStyle}>Parent (compte utilisateur)</div>
      {!createParent ? (
        <div>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            style={{ ...inputStyle("parent"), marginBottom: 8 }}
          >
            <option value="">Aucun parent</option>
            {parents.map((p) => (
              <option key={p._id} value={p._id} style={{ background: dark ? "#1E293B" : "#FFF" }}>
                {p.nom} (@{p.login})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setCreateParent(true)}
            style={{
              background: "none",
              border: "none",
              color: dark ? "#818CF8" : "#4F46E5",
              fontWeight: 500,
              cursor: "pointer",
              padding: 0,
              marginBottom: 12,
              fontSize: smallButtonFontSize,
            }}
          >
            + Créer un nouveau parent
          </button>
        </div>
      ) : (
        <div style={{
          background: dark ? "#0F172A" : "#F8FAFC",
          padding: isMobile ? 10 : 12,
          borderRadius: 10,
          marginBottom: 12,
        }}>
          <input
            value={newParentNom}
            onChange={(e) => setNewParentNom(e.target.value)}
            style={inputStyle("newParentNom")}
            placeholder="Nom complet du parent"
          />
          {errors.newParentNom && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -8, marginBottom: 8 }}>{errors.newParentNom}</div>}
          <input
            value={newParentLogin}
            onChange={(e) => setNewParentLogin(e.target.value)}
            style={inputStyle("newParentLogin")}
            placeholder="Login"
          />
          {errors.newParentLogin && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -8, marginBottom: 8 }}>{errors.newParentLogin}</div>}
          <input
            type="password"
            value={newParentPassword}
            onChange={(e) => setNewParentPassword(e.target.value)}
            style={inputStyle("newParentPassword")}
            placeholder="Mot de passe"
          />
          {errors.newParentPassword && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -8, marginBottom: 8 }}>{errors.newParentPassword}</div>}
          <button
            type="button"
            onClick={() => setCreateParent(false)}
            style={{ background: "none", border: "none", color: dark ? "#94A3B8" : "#64748B", cursor: "pointer", padding: 0, fontSize: smallButtonFontSize }}
          >
            Annuler
          </button>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={adding}
        style={{
          width: "100%",
          padding: buttonPadding,
          background: adding ? "#A5B4FC" : dark ? "#818CF8" : "#4F46E5",
          color: "white",
          border: "none",
          borderRadius: 10,
          fontWeight: 600,
          fontSize: buttonFontSize,
          cursor: adding ? "not-allowed" : "pointer",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
          transition: "background 0.2s",
        }}
      >
        {adding ? <Loader size={16} className="animate-spin" /> : null}
        {adding ? "Ajout en cours..." : "Ajouter l'élève"}
      </button>

      {createdMatricule && (
        <div style={{
          marginTop: 12,
          background: dark ? "#064E3B" : "#D1FAE5",
          color: dark ? "#34D399" : "#065F46",
          padding: "10px 14px",
          borderRadius: 8,
          fontSize: isMobile ? 14 : 14,
          fontWeight: 600,
          textAlign: "center",
        }}>
          Matricule généré : {createdMatricule}
        </div>
      )}
    </div>
  );
}