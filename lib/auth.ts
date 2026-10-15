import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "crypto";

// No fallback on purpose: a shared default secret lets anyone forge an admin
// session. If AUTH_SECRET is missing, every token function fails closed —
// creation throws, verification rejects.
const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  console.error("AUTH_SECRET env var is not set — admin token signing/verification is disabled");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const testBuf = scryptSync(password, salt, 64);
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf);
}

export function createToken(payload: Record<string, unknown>): string {
  if (!AUTH_SECRET) throw new Error("AUTH_SECRET is not configured");
  const data = Buffer.from(JSON.stringify({ ...payload, type: "admin", iat: Date.now() })).toString("base64url");
  const sig = createHmac("sha256", AUTH_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  if (!AUTH_SECRET) return null;
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expectedSig = createHmac("sha256", AUTH_SECRET).update(data).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (payload.type !== "admin") return null;
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Scoped, single-purpose tokens (e.g. OAuth `state`). The scope is bound into
// both the payload type and the HMAC input, so a token minted for one purpose
// can't be replayed for another — and since the type is `scope:...`, never
// "admin", verifyToken rejects it, so a leaked state value can never be used
// as an admin session cookie.
export function createScopedToken(scope: string, payload: Record<string, unknown>): string {
  if (!AUTH_SECRET) throw new Error("AUTH_SECRET is not configured");
  const data = Buffer.from(JSON.stringify({ ...payload, type: `scope:${scope}`, iat: Date.now() })).toString("base64url");
  const sig = createHmac("sha256", AUTH_SECRET).update(`${scope}:${data}`).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyScopedToken(scope: string, token: string): Record<string, unknown> | null {
  if (!AUTH_SECRET) return null;
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expectedSig = createHmac("sha256", AUTH_SECRET).update(`${scope}:${data}`).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (payload.type !== `scope:${scope}`) return null;
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
