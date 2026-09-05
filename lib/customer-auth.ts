import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const BASE_SECRET = process.env.AUTH_SECRET || "slime-studio-secret-key-change-me";

// Derive a distinct secret for customer sessions. This means a customer token can
// never be replayed as an admin token (and vice versa), even though both are HMACs.
const CUSTOMER_SECRET = createHmac("sha256", BASE_SECRET).update("customer-session-v1").digest("hex");

export const CUSTOMER_COOKIE = "customer_token";
export const CUSTOMER_SESSION_DAYS = 30;

export type CustomerSession = {
  sub: string;
  email: string;
  name: string;
  exp: number;
};

export function createCustomerToken(payload: { sub: string; email: string; name: string }): string {
  const body = {
    ...payload,
    type: "customer",
    iat: Date.now(),
    exp: Date.now() + 1000 * 60 * 60 * 24 * CUSTOMER_SESSION_DAYS,
  };
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", CUSTOMER_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyCustomerToken(token: string): CustomerSession | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expected = createHmac("sha256", CUSTOMER_SECRET).update(data).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (payload.type !== "customer") return null;
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload as CustomerSession;
  } catch {
    return null;
  }
}

export function getCustomerSession(req: NextRequest): CustomerSession | null {
  const token = req.cookies.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  return verifyCustomerToken(token);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
