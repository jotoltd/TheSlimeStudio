import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// Upserts an APNs device token. Called by the iOS app on launch and whenever
// the signed-in customer changes.
export async function POST(req: NextRequest) {
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

  const customerId = typeof body.customerId === "string" && body.customerId ? body.customerId : null;

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
