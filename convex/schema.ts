import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ========== ÉCOLES ==========
  ecoles: defineTable({
    nom: v.string(),
    code: v.optional(v.string()),
    logo: v.optional(v.string()),
    devise: v.optional(v.union(v.literal("CDF"), v.literal("USD"))),
    typePeriode: v.optional(v.union(v.literal("trimestre"), v.literal("semestre"))),
    userCount: v.optional(v.number()),
    bareme: v.optional(v.number()),
    statut: v.optional(v.union(v.literal("active"), v.literal("suspendue"))),
    seuilFelicitations: v.optional(v.number()),
    seuilEncouragement: v.optional(v.number()),
    seuilAvertissement: v.optional(v.number()),
  }).index("by_code", ["code"]),

  // ========== ANNÉES SCOLAIRES ==========
  anneesScolaires: defineTable({
    nom: v.string(),
    ecoleId: v.id("ecoles"),
    estActive: v.boolean(),
  }).index("by_ecoleId", ["ecoleId"]),

  // ========== UTILISATEURS ==========
  users: defineTable({
    nom: v.string(),
    postnom: v.optional(v.string()),
    prenom: v.optional(v.string()),
    login: v.string(),
    password: v.string(),
    role: v.string(),
    ecoleId: v.optional(v.id("ecoles")),
    fcmToken: v.optional(v.string()),
    classe: v.optional(v.string()),
    loginAttempts: v.optional(v.number()),
    lockedUntil: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("active"), v.literal("rejected"))
    ),
    approvedBy: v.optional(v.id("users")),
    rejectionReason: v.optional(v.string()),
    email: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
  })
    .index("by_login", ["login"])
    .index("by_ecoleId", ["ecoleId"]),

  settings: defineTable({
    appName: v.string(),
    supportEmail: v.string(),
    supportPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    slogan: v.optional(v.string()),
    primaryColor: v.string(),
  }).index("by_appName", ["appName"]),

  // ========== ÉLÈVES ==========
  eleves: defineTable({
    nom: v.string(),
    postnom: v.string(),
    prenom: v.optional(v.string()),
    code: v.optional(v.string()),
    codeUtilise: v.optional(v.boolean()),
    ecoleId: v.id("ecoles"),
    parentId: v.optional(v.id("users")),
    userId: v.optional(v.id("users")),

    sexe: v.optional(v.union(v.literal("M"), v.literal("F"))),
    dateNaissance: v.optional(v.string()),
    lieuNaissance: v.optional(v.string()),
    province: v.optional(v.string()),
    territoire: v.optional(v.string()),
    secteur: v.optional(v.string()),
    village: v.optional(v.string()),
    adresse: v.optional(v.string()),
    telephone: v.optional(v.string()),
    nomPere: v.optional(v.string()),
    nomMere: v.optional(v.string()),
    tuteurNom: v.optional(v.string()),
    tuteurTelephone: v.optional(v.string()),
  })
    .index("by_ecoleId", ["ecoleId"])
    .index("by_parentId", ["parentId"])
    .index("by_userId", ["userId"])
    .index("by_code", ["code"]),

  // ========== INSCRIPTIONS ==========
  inscriptions: defineTable({
    eleveId: v.id("eleves"),
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
    statut: v.union(
      v.literal("inscrit"),
      v.literal("passant"),
      v.literal("redoublant"),
      v.literal("transfere"),
      v.literal("exclu"),
      v.literal("diplome")
    ),
    dateInscription: v.string(),
    dateSortie: v.optional(v.string()),
    decisionConseil: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  })
    .index("by_eleveId", ["eleveId"])
    .index("by_anneeId", ["anneeId"])
    .index("by_classe_annee", ["classe", "anneeId"])
    .index("by_ecole_annee", ["ecoleId", "anneeId"])
    .index("by_eleve_annee", ["eleveId", "anneeId"]),

  // ========== PROPOSITIONS DE PASSAGE ==========
  propositionsPassage: defineTable({
    eleveId: v.id("eleves"),
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    enseignantId: v.id("users"),
    statutPropose: v.union(
      v.literal("passant"),
      v.literal("redoublant"),
      v.literal("transfere"),
      v.literal("exclu"),
      v.literal("diplome")
    ),
    classeDestinationPropose: v.optional(v.string()),
    dateSoumission: v.string(),
  })
    .index("by_ecole_annee", ["ecoleId", "anneeId"])
    .index("by_enseignant", ["enseignantId"])
    .index("by_eleve_annee", ["eleveId", "anneeId"]),

  // ========== CLASSES ==========
  classes: defineTable({
    nom: v.string(),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
  })
    .index("by_ecoleId", ["ecoleId"])
    .index("by_nom_ecole", ["nom", "ecoleId"])
    .index("by_anneeId", ["anneeId"]),

  // ========== FAUTES ==========
  fautes: defineTable({
    libelle: v.string(),
    gravite: v.union(v.literal("Légère"), v.literal("Moyenne"), v.literal("Grave")),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
  }).index("by_ecoleId", ["ecoleId"]),

  // ========== SANCTIONS ==========
  sanctions: defineTable({
    libelle: v.string(),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
  }).index("by_ecoleId", ["ecoleId"]),

  // ========== PUNITIONS ==========
  punitions: defineTable({
    idEleve: v.id("eleves"),
    idFaute: v.id("fautes"),
    date: v.string(),
    commentaire: v.optional(v.string()),
    sanction: v.string(),
    disciplinaire: v.string(),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
  })
    .index("by_ecoleId", ["ecoleId"])
    .index("by_eleveId", ["idEleve"])
    .index("by_anneeId", ["anneeId"]),

  // ========== FRAIS ==========
  frais: defineTable({
    eleveId: v.id("eleves"),
    ecoleId: v.id("ecoles"),
    montantTotal: v.float64(),
    montantPaye: v.float64(),
    commentaire: v.optional(v.string()),
    anneeId: v.optional(v.id("anneesScolaires")),
  })
    .index("by_eleveId", ["eleveId"])
    .index("by_ecoleId", ["ecoleId"])
    .index("by_anneeId", ["anneeId"]),

  // ========== FRAIS PAR CLASSE (NOUVEAU) ==========
  fraisClasses: defineTable({
    classe: v.string(),
    montantTotal: v.float64(),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
  })
    .index("by_ecole_classe", ["ecoleId", "classe"]),

  // ========== NOTES ==========
  notes: defineTable({
    eleveId: v.id("eleves"),
    ecoleId: v.id("ecoles"),
    matiere: v.string(),
    note: v.float64(),
    coefficient: v.float64(),
    periode: v.string(),
    appreciation: v.optional(v.string()),
    categorie: v.optional(v.union(v.literal("devoir"), v.literal("examen"), v.literal("interrogation"), v.literal("exercice"))),
    anneeId: v.optional(v.id("anneesScolaires")),
  })
    .index("by_eleveId", ["eleveId"])
    .index("by_ecoleId", ["ecoleId"])
    .index("by_anneeId", ["anneeId"]),

  // ========== COURS ==========
  cours: defineTable({
    nom: v.string(),
    classe: v.string(),
    coefficient: v.optional(v.float64()),
    bareme: v.optional(v.float64()),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
  })
    .index("by_ecoleId", ["ecoleId"])
    .index("by_classe", ["classe", "ecoleId"])
    .index("by_anneeId", ["anneeId"]),

  // ========== EXAMENS ==========
  examens: defineTable({
    classe: v.string(),
    matiere: v.string(),
    date: v.string(),
    heure: v.optional(v.string()),
    salle: v.optional(v.string()),
    duree: v.optional(v.string()),
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    userId: v.optional(v.id("users")),
  })
    .index("by_ecoleId", ["ecoleId"])
    .index("by_classe", ["classe", "ecoleId"])
    .index("by_anneeId", ["anneeId"]),

  // ========== ABSENCES ==========
  absences: defineTable({
    eleveId: v.id("eleves"),
    ecoleId: v.id("ecoles"),
    type: v.union(v.literal("absence"), v.literal("retard")),
    date: v.string(),
    commentaire: v.optional(v.string()),
    signaleurId: v.id("users"),
    statutJustification: v.optional(v.union(v.literal("en_attente"), v.literal("justifiee"), v.literal("rejetee"))),
    justificatif: v.optional(v.string()),
    justifiePar: v.optional(v.id("users")),
    anneeId: v.optional(v.id("anneesScolaires")),
  })
    .index("by_eleveId", ["eleveId"])
    .index("by_ecoleId", ["ecoleId"])
    .index("by_anneeId", ["anneeId"]),

  // ========== APPELS ==========
  appels: defineTable({
    ecoleId: v.id("ecoles"),
    callerId: v.id("users"),
    calleeId: v.optional(v.id("users")),
    channelName: v.string(),
    status: v.union(
      v.literal("ringing"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("ended"),
      v.literal("missed")
    ),
    type: v.optional(v.union(v.literal("audio"), v.literal("video"))),
    isGroup: v.optional(v.boolean()),
    groupId: v.optional(v.string()),
    participants: v.optional(v.array(v.id("users"))),
    duration: v.optional(v.number()),
    callDirection: v.optional(v.union(v.literal("incoming"), v.literal("outgoing"))),
    missedReason: v.optional(v.string()),
    ipMasked: v.optional(v.boolean()),
    createdAt: v.string(),
    anneeId: v.optional(v.id("anneesScolaires")),
  })
    .index("by_caller", ["callerId"])
    .index("by_callee", ["calleeId"])
    .index("by_group", ["groupId"])
    .index("by_status", ["status"]),

  // ========== MESSAGES ==========
  messages: defineTable({
    ecoleId: v.id("ecoles"),
    expediteurId: v.id("users"),
    destinataireId: v.optional(v.id("users")),
    contenu: v.string(),
    date: v.string(),
    lu: v.boolean(),
    anneeId: v.optional(v.id("anneesScolaires")),
    piecesJointes: v.optional(v.array(v.object({
      nom: v.string(),
      type: v.string(),
      url: v.string(),
    }))),
    groupeId: v.optional(v.string()),
  })
    .index("by_destinataire", ["destinataireId"])
    .index("by_expediteur", ["expediteurId"])
    .index("by_ecoleId", ["ecoleId"])
    .index("by_groupeId", ["groupeId"]),

  // ========== EMPLOI DU TEMPS ==========
  emploiDuTemps: defineTable({
    classe: v.string(),
    ecoleId: v.id("ecoles"),
    contenu: v.string(),
    anneeId: v.id("anneesScolaires"),
  })
    .index("by_classe_ecole_annee", ["classe", "ecoleId", "anneeId"])
    .index("by_ecoleId", ["ecoleId"]),

  // ========== RATE LIMITING ==========
  rateLimits: defineTable({
    key: v.string(),
    timestamp: v.float64(),
    count: v.number(),
  }).index("by_key", ["key"]),

  // ========== TWO FACTOR EMAIL ==========
twoFactorEmail: defineTable({
  userId: v.id("users"),
  email: v.string(),
  enabled: v.boolean(),
  code: v.optional(v.string()),
  expiresAt: v.optional(v.number()),
  attempts: v.number(),
  createdAt: v.string(),
}).index("by_userId", ["userId"]),

  // ========== AUDIT ==========
  audit: defineTable({
    userId: v.id("users"),
    action: v.string(),
    table: v.string(),
    documentId: v.string(),
    details: v.optional(v.string()),
    date: v.string(),
    ecoleId: v.optional(v.id("ecoles")),
  })
    .index("by_ecoleId", ["ecoleId"])
    .index("by_date", ["date"]),

  // Dans schema.ts
parentLinkRequests: defineTable({
  parentId: v.id("users"),
  eleveId: v.id("eleves"),
  status: v.string(), // "pending", "approved", "rejected"
  createdAt: v.string(),
  reviewedBy: v.optional(v.id("users")),
})
.index("by_parentId", ["parentId"])
.index("by_eleveId", ["eleveId"]),
});

