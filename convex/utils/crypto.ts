// convex/utils/crypto.ts
const ENCODER = new TextEncoder();

// ────────────────────────────────────────────────
// Constantes
// ────────────────────────────────────────────────
const FORMAT_VERSION = "v1";
const KEY_LENGTH_BITS = 256;
const KEY_LENGTH_BYTES = KEY_LENGTH_BITS / 8;
const SALT_LENGTH_BYTES = 16;
const DEFAULT_ITERATIONS = 100_000;
const MIN_ITERATIONS = 10_000;
const MAX_ITERATIONS = 1_000_000;

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

function bufferToHex(input: Uint8Array | ArrayBuffer): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * Hex → Uint8Array avec validation stricte.
 * Retourne null si le format est invalide.
 */
function hexToBytes(hex: string): Uint8Array | null {
  if (typeof hex !== "string") return null;
  if (hex.length % 2 !== 0) return null;
  if (!/^[0-9a-f]+$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

/**
 * Comparaison en temps constant — JAMAIS de short-circuit.
 * Évite les timing attacks.
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Parse "v1:iterations:salt:hash" → null si invalide.
 */
function parseStoredHash(
  storedHash: string
): { iterations: number; salt: Uint8Array; hash: Uint8Array } | null {
  if (!storedHash || typeof storedHash !== "string") return null;

  const parts = storedHash.split(":");
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) return null;

  const [, iterationsStr, saltHex, hashHex] = parts;

  // Validation stricte : uniquement des chiffres
  if (!/^\d+$/.test(iterationsStr)) return null;
  const iterations = parseInt(iterationsStr, 10);
  if (!Number.isInteger(iterations)) return null;
  if (iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) return null;

  const salt = hexToBytes(saltHex);
  if (!salt || salt.length !== SALT_LENGTH_BYTES) return null;

  const hash = hexToBytes(hashHex);
  if (!hash || hash.length !== KEY_LENGTH_BYTES) return null;

  return { iterations, salt, hash };
}

/**
 * Dérive une clé PBKDF2.
 *
 * ✅ FIX TypeScript 5.7+ : `salt.slice().buffer` au lieu de `salt.buffer`
 * → `.slice()` renvoie un Uint8Array avec son propre ArrayBuffer (typé strict).
 */
async function derivePBKDF2(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    ENCODER.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt.slice().buffer,
      iterations,
      hash: "SHA-256",
    },
    key,
    KEY_LENGTH_BITS
  );
  return new Uint8Array(bits);
}

// ────────────────────────────────────────────────
// API publique
// ────────────────────────────────────────────────

/**
 * Hash un mot de passe avec PBKDF2.
 * Format retourné : "v1:100000:<salt_hex>:<hash_hex>"
 *
 * ⚠️ Doit être appelé depuis une ACTION Convex (pas mutation/query).
 */
export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("Mot de passe invalide");
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const hash = await derivePBKDF2(password, salt, DEFAULT_ITERATIONS);

  return `${FORMAT_VERSION}:${DEFAULT_ITERATIONS}:${bufferToHex(salt)}:${bufferToHex(hash)}`;
}

/**
 * Vérifie un mot de passe contre un hash stocké.
 * Retourne `false` (silencieux) si le format est invalide.
 *
 * Supporte le format legacy "iterations:salt:hash" (3 parts) en fallback.
 *
 * ⚠️ Doit être appelé depuis une ACTION Convex (pas mutation/query).
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (typeof password !== "string" || password.length === 0) return false;
  if (typeof storedHash !== "string" || storedHash.length === 0) return false;

  // ─── Nouveau format v1:iter:salt:hash ───
  const parsed = parseStoredHash(storedHash);
  if (parsed) {
    const computed = await derivePBKDF2(
      password,
      parsed.salt,
      parsed.iterations
    );
    return constantTimeEqual(computed, parsed.hash);
  }

  // ─── Fallback legacy : "iterations:salt:hash" ───
  const legacyParts = storedHash.split(":");
  if (legacyParts.length !== 3) return false;

  const [iterationsStr, saltHex, hashHex] = legacyParts;
  if (!/^\d+$/.test(iterationsStr)) return false;
  const iterations = parseInt(iterationsStr, 10);
  if (
    !Number.isInteger(iterations) ||
    iterations < MIN_ITERATIONS ||
    iterations > MAX_ITERATIONS
  ) {
    return false;
  }

  const salt = hexToBytes(saltHex);
  if (!salt || salt.length !== SALT_LENGTH_BYTES) return false;

  const expected = hexToBytes(hashHex);
  if (!expected || expected.length !== KEY_LENGTH_BYTES) return false;

  const computed = await derivePBKDF2(password, salt, iterations);
  return constantTimeEqual(computed, expected);
}