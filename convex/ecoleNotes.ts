// convex/ecoleNotes.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireGranularPermission } from "./helpers/permissions";

const MAX_NOTE_LENGTH = 2000;

// ════════════════════════════════════════════════════════════════
// QUERIES
// ════════════════════════════════════════════════════════════════

/**
 * Liste les notes internes d'une école.
 * ✨ Permission : ecoles.read
 */
export const listNotes = query({
  args: { userId: v.id("users"), ecoleId: v.id("ecoles") },
  handler: async (ctx, args) => {
    await requireGranularPermission(ctx, args.userId, "ecoles.read");

    const notes = await ctx.db
      .query("ecoleNotes")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .order("desc")
      .take(200);

    return notes.map((n) => ({
      _id: n._id,
      contenu: n.contenu,
      auteurId: n.auteurId,
      auteurNom: n.auteurNom,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));
  },
});

// ════════════════════════════════════════════════════════════════
// MUTATIONS
// ════════════════════════════════════════════════════════════════

/**
 * Ajoute une note interne.
 * ✨ Permission : ecoles.write
 */
export const addNote = mutation({
  args: {
    userId: v.id("users"),
    ecoleId: v.id("ecoles"),
    contenu: v.string(),
  },
  handler: async (ctx, args) => {
    const caller = await requireGranularPermission(
      ctx,
      args.userId,
      "ecoles.write"
    );

    const contenu = args.contenu.trim();
    if (!contenu) throw new Error("Le contenu de la note est requis.");
    if (contenu.length > MAX_NOTE_LENGTH) {
      throw new Error(`Note trop longue (max ${MAX_NOTE_LENGTH} caractères).`);
    }

    const ecole = await ctx.db.get(args.ecoleId);
    if (!ecole) throw new Error("École introuvable");

    const now = new Date().toISOString();

    const noteId = await ctx.db.insert("ecoleNotes", {
      ecoleId: args.ecoleId,
      contenu,
      auteurId: args.userId,
      auteurNom: caller.nom ?? "Super Admin",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "add_ecole_note",
      table: "ecoleNotes",
      documentId: noteId,
      date: now,
      ecoleId: args.ecoleId,
      details: `Note interne ajoutée sur "${ecole.nom}"`,
    });

    return { success: true, noteId };
  },
});

/**
 * Modifie une note existante.
 * ✨ Permission : ecoles.write
 */
export const updateNote = mutation({
  args: {
    userId: v.id("users"),
    noteId: v.id("ecoleNotes"),
    contenu: v.string(),
  },
  handler: async (ctx, args) => {
    await requireGranularPermission(ctx, args.userId, "ecoles.write");

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note introuvable");

    const contenu = args.contenu.trim();
    if (!contenu) throw new Error("Le contenu de la note est requis.");
    if (contenu.length > MAX_NOTE_LENGTH) {
      throw new Error(`Note trop longue (max ${MAX_NOTE_LENGTH} caractères).`);
    }

    const now = new Date().toISOString();

    await ctx.db.patch(args.noteId, {
      contenu,
      updatedAt: now,
    });

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "update_ecole_note",
      table: "ecoleNotes",
      documentId: args.noteId,
      date: now,
      ecoleId: note.ecoleId,
      details: `Note interne modifiée`,
    });

    return { success: true };
  },
});

/**
 * Supprime une note.
 * ✨ Permission : ecoles.delete
 */
export const deleteNote = mutation({
  args: {
    userId: v.id("users"),
    noteId: v.id("ecoleNotes"),
  },
  handler: async (ctx, args) => {
    await requireGranularPermission(ctx, args.userId, "ecoles.delete");

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note introuvable");

    const now = new Date().toISOString();

    await ctx.db.delete(args.noteId);

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "delete_ecole_note",
      table: "ecoleNotes",
      documentId: args.noteId,
      date: now,
      ecoleId: note.ecoleId,
      details: `Note interne supprimée`,
    });

    return { success: true };
  },
});