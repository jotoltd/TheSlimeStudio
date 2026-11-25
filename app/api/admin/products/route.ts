import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

function checkAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  return !!token && !!verifyToken(token);
}

const PRODUCT_FIELDS = ["name", "description", "price", "category", "stock", "weight", "image_url"] as const;
const CATEGORIES = new Set(["handmade", "diy", "textures", "accessories"]);

function sanitizeProduct(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of PRODUCT_FIELDS) {
    if (input[key] === undefined) continue;
    if (key === "name") {
      const v = String(input[key]).trim();
      if (!v) return { error: "Product name is required" };
      out[key] = v.slice(0, 200);
    } else if (key === "price") {
      const n = Number(input[key]);
      if (!Number.isFinite(n) || n < 0 || n > 10000) return { error: "Invalid price" };
      out[key] = n;
    } else if (key === "stock" || key === "weight") {
      if (input[key] === null || input[key] === "") { out[key] = key === "stock" ? 0 : null; continue; }
      const n = Math.floor(Number(input[key]));
      if (!Number.isFinite(n) || n < 0 || n > 100000) return { error: `Invalid ${key}` };
      out[key] = n;
    } else if (key === "category") {
      const v = String(input[key]);
      if (!CATEGORIES.has(v)) return { error: "Invalid category" };
      out[key] = v;
    } else {
      out[key] = input[key] === null ? null : String(input[key]).slice(0, 2000);
    }
  }
  return { data: out };
}

// GET — all products for the admin dashboard
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .order("category")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data || [] });
}

// POST — create ({ product }) or update ({ id, ...fields })
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const { id, ...fields } = body;

  const { data: clean, error: invalid } = sanitizeProduct(fields as Record<string, unknown>);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  if (!clean || Object.keys(clean).length === 0) {
    return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
  }

  if (id) {
    const { error } = await supabaseAdmin.from("products").update(clean).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabaseAdmin.from("products").insert(clean);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH — quick stock update { id, stock }
export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, stock } = await req.json() as { id?: string; stock?: number };
  const n = Math.floor(Number(stock));
  if (!id || !Number.isFinite(n) || n < 0 || n > 100000) {
    return NextResponse.json({ error: "Invalid stock update" }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from("products").update({ stock: n }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE ?id=
export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing product id" }, { status: 400 });
  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
