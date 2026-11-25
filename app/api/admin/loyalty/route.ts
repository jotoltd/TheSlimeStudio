import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

function checkAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  return !!token && !!verifyToken(token);
}

const EDITABLE_FIELDS = ["stamps", "total_stamps", "rewards_earned", "rewards_redeemed", "reward_code", "name"] as const;

// GET — all loyalty cards for the admin dashboard
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("loyalty_cards")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cards: data || [] });
}

// PATCH — adjust stamps/rewards on a loyalty card
export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { id?: string } & Record<string, unknown>;
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "Missing card id" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of EDITABLE_FIELDS) {
    if (key in fields) patch[key] = fields[key];
  }
  for (const key of ["stamps", "total_stamps", "rewards_earned", "rewards_redeemed"] as const) {
    if (patch[key] !== undefined) {
      const n = Math.floor(Number(patch[key]));
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 });
      }
      patch[key] = n;
    }
  }

  const { error } = await supabaseAdmin.from("loyalty_cards").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
