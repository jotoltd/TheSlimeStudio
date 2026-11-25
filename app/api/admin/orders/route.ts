import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

function checkAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  return !!token && !!verifyToken(token);
}

const PAY_STATUSES = ["pending", "paid", "unpaid", "refunded", "expired", "cancelled"];
const FULFILMENT_STATUSES = ["new", "processing", "ready", "completed"];

// GET — all shop orders for the admin dashboard
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("shop_orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data || [] });
}

// PATCH — update payment_status or fulfillment_status only
export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { id?: string; payment_status?: string; fulfillment_status?: string };
  const { id } = body;
  if (!id) return NextResponse.json({ error: "Missing order id" }, { status: 400 });

  const patch: Record<string, string> = {};
  if (body.payment_status !== undefined) {
    if (!PAY_STATUSES.includes(body.payment_status)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }
    patch.payment_status = body.payment_status;
  }
  if (body.fulfillment_status !== undefined) {
    if (!FULFILMENT_STATUSES.includes(body.fulfillment_status)) {
      return NextResponse.json({ error: "Invalid fulfilment status" }, { status: 400 });
    }
    patch.fulfillment_status = body.fulfillment_status;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("shop_orders").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
