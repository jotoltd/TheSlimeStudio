import crypto from "crypto";
import http2 from "http2";
import { supabaseAdmin } from "@/lib/supabase";

// APNs provider config — set via env, never hardcoded:
//   APNS_KEY_ID      — 10-char Key ID of the .p8 key from Apple Developer
//   APNS_TEAM_ID     — Apple Developer Team ID (3B9B42HAF9)
//   APNS_AUTH_KEY    — full .p8 contents (PEM); \n escapes are accepted
//   APNS_BUNDLE_ID   — defaults to uk.co.theslimestudio
//   APNS_SANDBOX     — "true" to hit the sandbox host (dev-signed apps)
const PROD_HOST = "https://api.push.apple.com";
const SANDBOX_HOST = "https://api.sandbox.push.apple.com";
const TOKEN_TTL_MS = 20 * 60 * 1000;

let cachedJwt: { value: string; expiresAt: number } | null = null;

function apnsJwt(): string | null {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const rawKey = process.env.APNS_AUTH_KEY;
  if (!keyId || !teamId || !rawKey) return null;

  if (cachedJwt && cachedJwt.expiresAt > Date.now()) return cachedJwt.value;

  const key = rawKey.replace(/\\n/g, "\n");
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId })).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) })
  ).toString("base64url");
  const signature = crypto
    .sign("sha256", Buffer.from(`${header}.${claims}`), {
      key: crypto.createPrivateKey(key),
      dsaEncoding: "ieee-p1363",
    })
    .toString("base64url");

  const value = `${header}.${claims}.${signature}`;
  cachedJwt = { value, expiresAt: Date.now() + TOKEN_TTL_MS };
  return value;
}

export type PushPayload = {
  title: string;
  body: string;
  sound?: string;
  data?: Record<string, string>;
};

export type PushResult = {
  ok: boolean;
  status?: number;
  reason?: string;
  error?: string;
};

export async function sendPush(token: string, payload: PushPayload): Promise<PushResult> {
  const jwt = apnsJwt();
  if (!jwt) return { ok: false, error: "APNs not configured" };

  const bundleId = process.env.APNS_BUNDLE_ID || "uk.co.theslimestudio";
  const host = process.env.APNS_SANDBOX === "true" ? SANDBOX_HOST : PROD_HOST;
  const client = http2.connect(host);

  try {
    const result = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = client.request({
        ":method": "POST",
        ":path": `/3/device/${token}`,
        authorization: `bearer ${jwt}`,
        "apns-topic": bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
      });
      let status = 0;
      let body = "";
      req.setEncoding("utf8");
      req.on("response", (headers) => {
        status = Number(headers[":status"]) || 0;
      });
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => resolve({ status, body }));
      req.on("error", reject);
      req.end(
        JSON.stringify({
          aps: {
            alert: { title: payload.title, body: payload.body },
            sound: payload.sound ?? "default",
          },
          ...payload.data,
        })
      );
    });

    let reason: string | undefined;
    try {
      reason = JSON.parse(result.body)?.reason;
    } catch {
      // empty body on success
    }

    // Token is dead — prune it so we stop trying.
    if (result.status === 410 || reason === "BadDeviceToken" || reason === "Unregistered") {
      await supabaseAdmin.from("push_tokens").delete().eq("token", token);
    }

    return { ok: result.status === 200, status: result.status, reason };
  } finally {
    client.close();
  }
}

export async function sendPushToCustomer(customerId: string, payload: PushPayload): Promise<number> {
  const { data } = await supabaseAdmin
    .from("push_tokens")
    .select("token")
    .eq("customer_id", customerId);
  const tokens = (data || []).map((r: { token: string }) => r.token);
  const results = await Promise.all(tokens.map((t) => sendPush(t, payload)));
  return results.filter((r) => r.ok).length;
}

// APNs device tokens are 32 bytes rendered as 64 lowercase hex chars — the
// app posts them with bookings/purchases so pushes reach guests too.
export function sanitizePushToken(value: unknown): string | null {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value) ? value : null;
}

// Push to a registered customer's devices AND/OR a raw device token that came
// in with a booking/gift-card request — deduped so a linked device never
// gets the same push twice.
export async function sendPushToCustomerOrDevice(
  customerId: string | null | undefined,
  deviceToken: unknown,
  payload: PushPayload,
): Promise<number> {
  const tokens = new Set<string>();
  if (customerId) {
    const { data } = await supabaseAdmin
      .from("push_tokens")
      .select("token")
      .eq("customer_id", customerId);
    for (const r of data || []) tokens.add((r as { token: string }).token);
  }
  const dt = sanitizePushToken(deviceToken);
  if (dt) tokens.add(dt);
  const results = await Promise.all(Array.from(tokens).map((t) => sendPush(t, payload)));
  return results.filter((r) => r.ok).length;
}
