import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { normalizeGiftCardExpirySetting, GIFT_CARD_EXPIRY_KEY } from "@/lib/gift-cards";

export const runtime = "nodejs";

function checkAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  return !!token && !!verifyToken(token);
}

// GET - List all gift cards with optional search
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("gift_cards")
    .select("*, customer:customers(id, name, email)", { count: "exact" })
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

  // Flatten the joined customer object for easier frontend use
  const giftCards = (data || []).map((card: Record<string, unknown> & { customer?: { name?: string; email?: string } | null }) => ({
    ...card,
    customer_name: card.customer?.name || null,
    customer_email: card.customer?.email || null,
    customer: undefined,
  }));

  const { data: expRow } = await supabaseAdmin
    .from("site_content")
    .select("value")
    .eq("key", "gift_card_expiry_date")
    .maybeSingle();

  return NextResponse.json({
    giftCards,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
    defaultExpiry: expRow?.value || null,
  });
}

// POST - Create, update, toggle, or delete gift cards
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  if (action === "set_expiry") {
    const { expiry_date } = giftCardData || {};
    const { error } = await supabaseAdmin
      .from("gift_cards")
      .update({ expiry_date: expiry_date || null, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "bulk_expiry") {
    const { expiry_date } = giftCardData || {};
    const value = expiry_date || null;
    // Every card with a remaining balance that isn't cancelled.
    const { data: updated, error } = await supabaseAdmin
      .from("gift_cards")
      .update({ expiry_date: value, updated_at: new Date().toISOString() })
      .gt("balance", 0)
      .neq("status", "cancelled")
      .select("id, status");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Cards manually marked "expired" need reactivating for the new date to count.
    const expiredIds = (updated || []).filter((c) => c.status === "expired").map((c) => c.id);
    if (expiredIds.length) {
      await supabaseAdmin
        .from("gift_cards")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .in("id", expiredIds);
    }
    return NextResponse.json({ success: true, count: updated?.length || 0, reactivated: expiredIds.length });
  }

  // Default expiry applied to NEW purchases: ISO date, or "none" for never.
  if (action === "set_default_expiry") {
    const value = normalizeGiftCardExpirySetting(giftCardData?.expiry_date);
    if (value === null) {
      return NextResponse.json({ error: "Expiry must be 'none' or a valid future date" }, { status: 400 });
    }
    // key is the primary key — upsert is atomic, no check-then-insert race.
    const { error } = await supabaseAdmin
      .from("site_content")
      .upsert(
        { key: GIFT_CARD_EXPIRY_KEY, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
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
