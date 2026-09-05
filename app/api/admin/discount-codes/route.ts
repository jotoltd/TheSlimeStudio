import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("discount_codes")
    .select("*, referrer:customers!referrer_customer_id(name, email)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const codes = (data || []).map((c: Record<string, unknown>) => {
    const referrer = c.referrer as { name: string; email: string } | null;
    return {
      ...c,
      referrer_name: referrer?.name || null,
      referrer_email: referrer?.email || null,
      referrer: undefined,
    };
  });

  return NextResponse.json({ codes });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, id, data: updateData } = body as {
    action: "create" | "update" | "delete" | "toggle";
    id?: string;
    data?: Record<string, unknown>;
  };

  if (action === "create") {
    const { error } = await supabaseAdmin
      .from("discount_codes")
      .insert({ ...updateData, used_count: 0 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "update" && id) {
    const { error } = await supabaseAdmin
      .from("discount_codes")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "toggle" && id) {
    const { data: code } = await supabaseAdmin
      .from("discount_codes")
      .select("active")
      .eq("id", id)
      .single();
    if (!code) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { error } = await supabaseAdmin
      .from("discount_codes")
      .update({ active: !code.active, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "delete" && id) {
    const { error } = await supabaseAdmin
      .from("discount_codes")
      .delete()
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
