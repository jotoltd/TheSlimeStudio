import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// GET - List all gift cards with optional search
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("gift_cards")
    .select("*", { count: "exact" })
    .order("purchased_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `code.ilike.%${search}%,purchaser_email.ilike.%${search}%,purchaser_name.ilike.%${search}%,recipient_email.ilike.%${search}%,recipient_name.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    giftCards: data || [],
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

// POST - Create, update, toggle, or delete gift cards
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, id, data: giftCardData } = body;

  if (action === "create") {
    const { error } = await supabaseAdmin.from("gift_cards").insert(giftCardData);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "update") {
    const { error } = await supabaseAdmin
      .from("gift_cards")
      .update({ ...giftCardData, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "toggle") {
    const { data: current } = await supabaseAdmin
      .from("gift_cards")
      .select("status")
      .eq("id", id)
      .single();
    if (!current) return NextResponse.json({ error: "Gift card not found" }, { status: 404 });

    const newStatus = current.status === "active" ? "cancelled" : "active";
    const { error } = await supabaseAdmin
      .from("gift_cards")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "delete") {
    const { error } = await supabaseAdmin.from("gift_cards").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
