import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = getCustomerSession(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: code } = await supabaseAdmin
    .from("discount_codes")
    .select("code, used_count, discount_type, value, scope")
    .eq("referrer_customer_id", session.sub)
    .maybeSingle();

  return NextResponse.json({
    referralCode: code?.code || null,
    uses: code?.used_count || 0,
    discountType: code?.discount_type || "percentage",
    discountValue: code?.value || 10,
    scope: code?.scope || "both",
  });
}
