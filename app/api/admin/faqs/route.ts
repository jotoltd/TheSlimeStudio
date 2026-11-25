import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

function checkAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  return !!token && !!verifyToken(token);
}

// GET — all FAQs ordered for the admin dashboard
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("faqs")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ faqs: data || [] });
}

// POST — insert { question, answer, sort_order?, is_visible? }
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { question?: string; answer?: string; sort_order?: number; is_visible?: boolean };
  if (!body.question?.trim() || !body.answer?.trim()) {
    return NextResponse.json({ error: "Question and answer are required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("faqs").insert({
    question: body.question.trim().slice(0, 500),
    answer: body.answer.trim().slice(0, 5000),
    sort_order: Math.floor(Number(body.sort_order)) || 0,
    is_visible: body.is_visible !== false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH — update { id, question?, answer?, is_visible?, sort_order? }
export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { id?: string; question?: string; answer?: string; is_visible?: boolean; sort_order?: number };
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "Missing faq id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (fields.question !== undefined) patch.question = String(fields.question).trim().slice(0, 500);
  if (fields.answer !== undefined) patch.answer = String(fields.answer).trim().slice(0, 5000);
  if (fields.is_visible !== undefined) patch.is_visible = !!fields.is_visible;
  if (fields.sort_order !== undefined) {
    const n = Math.floor(Number(fields.sort_order));
    if (!Number.isFinite(n)) return NextResponse.json({ error: "Invalid sort_order" }, { status: 400 });
    patch.sort_order = n;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("faqs").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE ?id=
export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing faq id" }, { status: 400 });
  const { error } = await supabaseAdmin.from("faqs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
