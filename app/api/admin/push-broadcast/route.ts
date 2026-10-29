import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { sendPush } from "@/lib/apns";

export const runtime = "nodejs";

const HISTORY_KEY = "admin_push_broadcasts";

function authed(req: Request) {
  const token = (req.headers.get("cookie") || "").match(/admin_token=([^;]+)/)?.[1];
  return !!token && !!verifyToken(token);
}

// GET — device count + recent broadcast history for the composer.
export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [tokensRes, historyRes] = await Promise.all([
    supabaseAdmin.from("push_tokens").select("token", { count: "exact", head: true }),
    supabaseAdmin.from("site_content").select("value").eq("key", HISTORY_KEY).maybeSingle(),
  ]);

  let history: unknown[] = [];
  try {
    history = JSON.parse(historyRes.data?.value || "[]");
  } catch {}

  return NextResponse.json({ devices: tokensRes.count || 0, history });
}

// POST — send a custom push to every registered device.
export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string; body?: string; link?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const title = String(body.title || "").trim().slice(0, 60);
  const message = String(body.body || "").trim().slice(0, 180);
  if (!title || !message) {
    return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
  }

  const LINKS = ["book", "events", "giftcards", "account"] as const;
  const link = LINKS.includes(body.link as (typeof LINKS)[number]) ? body.link! : "book";

  const { data: tokens } = await supabaseAdmin.from("push_tokens").select("token");
  const list = (tokens || []).map((r: { token: string }) => r.token);
  if (!list.length) {
    return NextResponse.json({ error: "No devices registered yet" }, { status: 400 });
  }

  const results = await Promise.allSettled(
    list.map((t) => sendPush(t, { title, body: message, data: { kind: "broadcast", link } }))
  );
  const sent = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
  const failed = list.length - sent;

  // Keep the last 10 broadcasts for the composer history.
  const { data: existing } = await supabaseAdmin
    .from("site_content")
    .select("value")
    .eq("key", HISTORY_KEY)
    .maybeSingle();
  let history: { title: string; body: string; sent: number; at: string }[] = [];
  try {
    history = JSON.parse(existing?.value || "[]");
  } catch {}
  history.unshift({ title, body: message, sent, at: new Date().toISOString() });
  await supabaseAdmin
    .from("site_content")
    .upsert({ key: HISTORY_KEY, value: JSON.stringify(history.slice(0, 10)) }, { onConflict: "key" });

  return NextResponse.json({ ok: true, sent, failed, total: list.length });
}
