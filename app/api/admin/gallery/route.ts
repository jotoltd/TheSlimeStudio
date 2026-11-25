import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

function checkAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  return !!token && !!verifyToken(token);
}

// GET — all gallery images ordered for the admin dashboard
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("gallery_images")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ images: data || [] });
}

// POST — insert { image_url, caption?, sort_order?, is_visible? }
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { image_url?: string; caption?: string; sort_order?: number; is_visible?: boolean };
  if (!body.image_url || typeof body.image_url !== "string" || body.image_url.length > 1000) {
    return NextResponse.json({ error: "image_url is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("gallery_images").insert({
    image_url: body.image_url,
    caption: (body.caption || "").slice(0, 500),
    sort_order: Math.floor(Number(body.sort_order)) || 0,
    is_visible: body.is_visible !== false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH — update { id, caption?, is_visible?, sort_order? }
export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { id?: string; caption?: string; is_visible?: boolean; sort_order?: number };
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "Missing image id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (fields.caption !== undefined) patch.caption = String(fields.caption).slice(0, 500);
  if (fields.is_visible !== undefined) patch.is_visible = !!fields.is_visible;
  if (fields.sort_order !== undefined) {
    const n = Math.floor(Number(fields.sort_order));
    if (!Number.isFinite(n)) return NextResponse.json({ error: "Invalid sort_order" }, { status: 400 });
    patch.sort_order = n;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("gallery_images").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE ?id=
export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing image id" }, { status: 400 });
  const { error } = await supabaseAdmin.from("gallery_images").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
