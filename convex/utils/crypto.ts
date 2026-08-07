const ENCODER = new TextEncoder();
const KEY_LENGTH = 256;
const ITERATIONS = 100_000;

function bufferToHex(input: Uint8Array | ArrayBuffer): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    ENCODER.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new Uint8Array(salt).buffer,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    key,
    KEY_LENGTH
  );
  return `${ITERATIONS}:${bufferToHex(salt)}:${bufferToHex(hash)}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 3) return false;
  const [iterationsStr, saltHex, hashHex] = parts;

  const iterations = parseInt(iterationsStr, 10);
  if (isNaN(iterations)) return false;

  const saltMatch = saltHex.match(/.{1,2}/g);
  if (!saltMatch || saltMatch.length !== 16) return false;
  const salt = new Uint8Array(saltMatch.map((b) => parseInt(b, 16)));

  const hashMatch = hashHex.match(/.{1,2}/g);
  if (!hashMatch) return false;
  const storedHashBytes = new Uint8Array(hashMatch.map((b) => parseInt(b, 16)));

  const key = await crypto.subtle.importKey(
    "raw",
    ENCODER.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const newHash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new Uint8Array(salt).buffer,
      iterations,
      hash: "SHA-256",
    },
    key,
    KEY_LENGTH
  );
  const newHashBytes = new Uint8Array(newHash);

  if (newHashBytes.length !== storedHashBytes.length) return false;
  return newHashBytes.every((val, i) => val === storedHashBytes[i]);
}