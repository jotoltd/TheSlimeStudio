import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { code, scope, amount } = await req.json() as {
    code?: string;
    scope?: "booking" | "shop";
    amount?: number;
  };

  if (!code || !scope || amount === undefined) {
    return NextResponse.json({ error: "Code, scope, and amount are required." }, { status: 400 });
  }

  const cleanCode = code.trim().toUpperCase();

  const { data: discount, error } = await supabaseAdmin
    .from("discount_codes")
    .select("*")
    .eq("code", cleanCode)
    .maybeSingle();

  if (error || !discount) {
    return NextResponse.json({ valid: false, error: "Invalid discount code." });
  }

  if (!discount.active) {
    return NextResponse.json({ valid: false, error: "This code is no longer active." });
  }

  // Check scope
  if (discount.scope !== "both" && discount.scope !== scope) {
    return NextResponse.json({
      valid: false,
      error: `This code is only valid for ${discount.scope === "booking" ? "bookings" : "shop orders"}.`,
    });
  }

  // Check expiry
  if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: "This code has expired." });
  }

  // Check max uses
  if (discount.max_uses !== null && discount.used_count >= discount.max_uses) {
    return NextResponse.json({ valid: false, error: "This code has reached its usage limit." });
  }

  // Check minimum spend
  if (discount.min_spend > 0 && amount < Number(discount.min_spend)) {
    return NextResponse.json({
      valid: false,
      error: `Minimum spend of £${Number(discount.min_spend).toFixed(2)} required for this code.`,
    });
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (discount.discount_type === "percentage") {
    discountAmount = (amount * Number(discount.value)) / 100;
  } else {
    discountAmount = Number(discount.value);
  }

  // Don't allow discount to exceed the amount
  discountAmount = Math.min(discountAmount, amount);

  const finalAmount = Math.max(0, amount - discountAmount);

  return NextResponse.json({
    valid: true,
    code: discount.code,
    discountType: discount.discount_type,
    discountValue: Number(discount.value),
    discountAmount: Number(discountAmount.toFixed(2)),
    finalAmount: Number(finalAmount.toFixed(2)),
  });
}
