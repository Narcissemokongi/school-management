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
    bareme: v.optional(v.number()), // note maximale, par défaut 20
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
  })
    .index("by_login", ["login"])
    .index("by_ecoleId", ["ecoleId"]),

  // ========== ÉLÈVES ==========
  eleves: defineTable({
    nom: v.string(),
    postnom: v.string(),
    classe: v.string(),
    ecoleId: v.id("ecoles"),
    parentId: v.optional(v.id("users")),
    userId: v.optional(v.id("users")),
    anneeId: v.optional(v.id("anneesScolaires")),
    decisionConseil: v.optional(v.string()), // ← ajouté
  })
    .index("by_ecoleId", ["ecoleId"])
    .index("by_parentId", ["parentId"])
    .index("by_userId", ["userId"])
    .index("by_anneeId", ["anneeId"]),

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

  // ========== NOTES ==========
  notes: defineTable({
    eleveId: v.id("eleves"),
    ecoleId: v.id("ecoles"),
    matiere: v.string(),
    note: v.float64(),
    coefficient: v.float64(),
    periode: v.string(),
    appreciation: v.optional(v.string()),
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
    bareme: v.optional(v.float64()),   // ← nouveau
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
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
    anneeId: v.optional(v.id("anneesScolaires")),
  })
    .index("by_eleveId", ["eleveId"])
    .index("by_ecoleId", ["ecoleId"])
    .index("by_anneeId", ["anneeId"]),

  // ========== APPELS ==========
  appels: defineTable({
    ecoleId: v.id("ecoles"),
    callerId: v.id("users"),
    calleeId: v.id("users"),
    channelName: v.string(),
    status: v.union(
      v.literal("ringing"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("ended"),
      v.literal("missed")
    ),
    createdAt: v.string(),
    anneeId: v.optional(v.id("anneesScolaires")),
  })
    .index("by_caller", ["callerId"])
    .index("by_callee", ["calleeId"]),

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
    semaine: v.string(),
    anneeId: v.optional(v.id("anneesScolaires")),
  })
    .index("by_classe", ["classe", "ecoleId"])
    .index("by_anneeId", ["anneeId"])
    .index("by_ecoleId", ["ecoleId"]),

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
});