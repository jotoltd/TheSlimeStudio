import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimited, clientIp } from "@/lib/rate-limit";
import { getCustomerSession } from "@/lib/customer-auth";

export const runtime = "nodejs";

// Upserts an APNs device token. Called by the iOS app on launch and whenever
// the signed-in customer changes.
export async function POST(req: NextRequest) {
  if (rateLimited(`push-register:${clientIp(req)}`, 30, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { token?: string; platform?: string; customerId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const token = String(body.token || "").trim();
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  // Binding a device to a customer requires that customer's session —
  // otherwise anyone could attach a device to a victim's account and receive
  // their booking notifications. A logged-in session binds automatically;
  // guests can still register an unbound token (used for test pushes).
  const session = getCustomerSession(req);
  const rawCustomerId = session?.sub || null;
  if (!session && typeof body.customerId === "string" && body.customerId) {
    return NextResponse.json({ error: "Sign in to link this device" }, { status: 401 });
  }

  let customerId: string | null = null;
  if (rawCustomerId) {
    const { data: cust } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("id", rawCustomerId)
      .maybeSingle();
    customerId = cust?.id || null;
  }

  const { error } = await supabaseAdmin.from("push_tokens").upsert(
    {
      token: token.toLowerCase(),
      customer_id: customerId,
      platform: body.platform === "ios" ? "ios" : "ios",
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  );

  if (error) {
    // If the FK rejected an unknown customer id, retry without it — the token
    // is still worth keeping for test pushes.
    if (String(error.message).includes("customer_id")) {
      const { error: retry } = await supabaseAdmin.from("push_tokens").upsert(
        { token: token.toLowerCase(), customer_id: null, platform: "ios", last_seen_at: new Date().toISOString() },
        { onConflict: "token" }
      );
      if (retry) {
        console.error("push token upsert failed:", retry);
        return NextResponse.json({ error: "Failed to register" }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }
    console.error("push token upsert failed:", error);
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Token unregister — app can call this on sign-out if desired.
export async function DELETE(req: NextRequest) {
  if (rateLimited(`push-unregister:${clientIp(req)}`, 30, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const token = String(body.token || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
  await supabaseAdmin.from("push_tokens").delete().eq("token", token);
  return NextResponse.json({ ok: true });
}
