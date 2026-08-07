/** PIN hashing via Web Crypto PBKDF2 — never store plaintext PINs. */

const ITERATIONS = 120_000;
const HASH_BYTES = 32;
const SALT_BYTES = 16;

const WEAK_PINS = new Set([
  "0000",
  "1111",
  "2222",
  "3333",
  "4444",
  "5555",
  "6666",
  "7777",
  "8888",
  "9999",
  "1234",
  "4321",
  "1122",
  "1212",
  "1010",
  "2020",
  "2580",
]);

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (clean.length % 2 !== 0) throw new Error("ملح PIN غير صالح");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function isWeakPin(pin: string): boolean {
  return WEAK_PINS.has(pin.trim());
}

export function assertPinFormat(pin: string): void {
  if (!/^\d{4,6}$/.test(pin.trim())) {
    throw new Error("رمز PIN يجب أن يكون 4–6 أرقام");
  }
}

export function validateNewPin(pin: string): void {
  assertPinFormat(pin);
  if (isWeakPin(pin)) {
    throw new Error("رمز PIN ضعيف — اختر رمزاً أقل توقعًا");
  }
}

/** Low-level hash — does not enforce strength (needed for migration). */
export async function hashPinRaw(
  pin: string,
  saltHex?: string
): Promise<{ hash: string; salt: string }> {
  assertPinFormat(pin);
  const saltBytes = saltHex
    ? fromHex(saltHex)
    : crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  // Copy into a plain ArrayBuffer for Web Crypto BufferSource typing
  const salt = new Uint8Array(saltBytes);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin.trim()),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    HASH_BYTES * 8
  );
  return { hash: toHex(bits), salt: toHex(salt) };
}

export async function hashPin(
  pin: string,
  saltHex?: string
): Promise<{ hash: string; salt: string }> {
  validateNewPin(pin);
  return hashPinRaw(pin, saltHex);
}

export async function verifyPin(
  pin: string,
  hash: string,
  salt: string
): Promise<boolean> {
  try {
    const next = await hashPinRaw(pin, salt);
    if (next.hash.length !== hash.length) return false;
    let diff = 0;
    for (let i = 0; i < next.hash.length; i++) {
      diff |= next.hash.charCodeAt(i) ^ hash.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}
