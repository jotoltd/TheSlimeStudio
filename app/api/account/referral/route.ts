import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = getCustomerSession(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Switch lives in Settings → Loyalty. When off, the referral card
  // doesn't render (referralCode comes back null) and codes already
  // issued keep working as plain discount codes.
  let enabled = true;
  try {
    const { data: s } = await supabaseAdmin
      .from("site_settings").select("referrals_enabled").eq("id", 1).single();
    if (s && s.referrals_enabled === false) enabled = false;
  } catch { /* column missing → default to on */ }
  if (!enabled) {
    return NextResponse.json({ enabled: false, referralCode: null, uses: 0 });
  }

  const { data: code } = await supabaseAdmin
    .from("discount_codes")
    .select("code, used_count, discount_type, value, scope")
    .eq("referrer_customer_id", session.sub)
    .maybeSingle();

  return NextResponse.json({
    enabled: true,
    referralCode: code?.code || null,
    uses: code?.used_count || 0,
    discountType: code?.discount_type || "percentage",
    discountValue: code?.value || 10,
    scope: code?.scope || "both",
  });
}
