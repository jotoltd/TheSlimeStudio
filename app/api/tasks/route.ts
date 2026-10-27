import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

const CARD_COLORS = ["pink", "yellow", "green", "blue", "purple", "orange"];

function isAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  return !!(token && verifyToken(token));
}

// GET /api/tasks — lists with their cards, board order
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: lists, error: lErr }, { data: cards, error: cErr }] = await Promise.all([
    supabaseAdmin.from("task_lists").select("*").order("position", { ascending: true }),
    supabaseAdmin.from("task_cards").select("*").order("position", { ascending: true }),
  ]);
  if (lErr || cErr) {
    return NextResponse.json({ error: (lErr || cErr)?.message || "Failed to load board" }, { status: 500 });
  }

  const byList: Record<string, typeof cards> = {};
  for (const c of cards || []) {
    (byList[c.list_id] ||= []).push(c);
  }
  return NextResponse.json({
    lists: (lists || []).map((l) => ({ ...l, cards: byList[l.id] || [] })),
  });
}

// POST /api/tasks — create a list or card
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  if (body.entity === "list") {
    const title = String(body.title || "").trim();
    if (!title || title.length > 80) return NextResponse.json({ error: "Invalid list title" }, { status: 400 });
    const { data: max } = await supabaseAdmin.from("task_lists").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabaseAdmin
      .from("task_lists")
      .insert({ title, position: (max?.position ?? -1) + 1 })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ list: { ...data, cards: [] } });
  }

  if (body.entity === "card") {
    const title = String(body.title || "").trim();
    const listId = String(body.list_id || "");
    if (!title || title.length > 200) return NextResponse.json({ error: "Invalid card title" }, { status: 400 });
    if (!listId) return NextResponse.json({ error: "Missing list" }, { status: 400 });
    const { data: max } = await supabaseAdmin.from("task_cards").select("position").eq("list_id", listId).order("position", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabaseAdmin
      .from("task_cards")
      .insert({
        list_id: listId,
        title,
        color: CARD_COLORS.includes(body.color) ? body.color : null,
        position: (max?.position ?? -1) + 1,
      })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ card: data });
  }

  return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
}

// PATCH /api/tasks — update a card, rename a list, or apply a batch card reorder
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  // Batch position update after a drag: [{ id, list_id, position }, ...]
  if (body.entity === "cards-order") {
    const updates = Array.isArray(body.cards) ? body.cards : [];
    for (const u of updates.slice(0, 200)) {
      if (!u.id || !u.list_id || typeof u.position !== "number") continue;
      await supabaseAdmin
        .from("task_cards")
        .update({ list_id: u.list_id, position: u.position, updated_at: new Date().toISOString() })
        .eq("id", u.id);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.entity === "list") {
    const title = String(body.title || "").trim();
    if (!body.id || !title || title.length > 80) return NextResponse.json({ error: "Invalid list" }, { status: 400 });
    const { error } = await supabaseAdmin.from("task_lists").update({ title }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.entity === "card") {
    if (!body.id) return NextResponse.json({ error: "Missing card id" }, { status: 400 });
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) {
      const t = String(body.title).trim();
      if (!t || t.length > 200) return NextResponse.json({ error: "Invalid title" }, { status: 400 });
      update.title = t;
    }
    if (body.description !== undefined) update.description = String(body.description || "").slice(0, 5000) || null;
    if (body.color !== undefined) update.color = CARD_COLORS.includes(body.color) ? body.color : null;
    if (body.due_date !== undefined) {
      update.due_date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.due_date || "")) ? body.due_date : null;
    }
    const { error } = await supabaseAdmin.from("task_cards").update(update).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
}

// DELETE /api/tasks?entity=list|card&id=...
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const entity = req.nextUrl.searchParams.get("entity");
  const id = req.nextUrl.searchParams.get("id");
  if (!id || (entity !== "list" && entity !== "card")) {
    return NextResponse.json({ error: "Missing entity or id" }, { status: 400 });
  }
  const { error } = await supabaseAdmin
    .from(entity === "list" ? "task_lists" : "task_cards")
    .delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
