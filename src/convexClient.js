import { ConvexReactClient } from "convex/react";

// L'URL est automatiquement injectée par `npx convex dev` via VITE_CONVEX_URL
const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) throw new Error("VITE_CONVEX_URL est introuvable. Lancez 'npx convex dev' d'abord.");

export const convexClient = new ConvexReactClient(convexUrl);