import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { amount, purchaserName, purchaserEmail, recipientName, recipientEmail, message, paymentMethod, customerId } = body as {
    amount: number;
    purchaserName: string;
    purchaserEmail: string;
    recipientName?: string;
    recipientEmail?: string;
    message?: string;
    paymentMethod: "stripe" | "sumup";
    customerId?: string;
  };

  if (!amount || amount < 10) {
    return NextResponse.json({ error: "Gift card amount must be at least £10" }, { status: 400 });
  }
  if (amount > 500) {
    return NextResponse.json({ error: "Gift card amount cannot exceed £500" }, { status: 400 });
  }
  if (!purchaserName || !purchaserEmail) {
    return NextResponse.json({ error: "Purchaser name and email are required" }, { status: 400 });
  }

  // Validate email format
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(purchaserEmail);
  if (!emailOk) {
    return NextResponse.json({ error: "Invalid purchaser email address" }, { status: 400 });
  }

  if (recipientEmail) {
    const recipientEmailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail);
    if (!recipientEmailOk) {
      return NextResponse.json({ error: "Invalid recipient email address" }, { status: 400 });
    }
  }

  // Generate unique gift card code in SS-XXXXX format
  let code = "";
  let exists = true;
  let attempts = 0;
  while (exists && attempts < 10) {
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    code = `SS-${randomPart}`;
    const { data: existing } = await supabaseAdmin
      .from("gift_cards")
      .select("id")
      .eq("code", code)
      .single();
    exists = !!existing;
    attempts++;
  }
  if (exists || !code) {
    return NextResponse.json({ error: "Failed to generate unique gift card code" }, { status: 500 });
  }

  // Calculate expiry date (3 months from purchase)
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + 3);

  // Create Stripe checkout session
  if (paymentMethod === "stripe") {
    const stripe = await getStripeAsync();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
    }

    const origin = req.nextUrl.origin;

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "gbp",
              product_data: {
                name: "Slime Studio Gift Card",
                description: `£${amount.toFixed(2)} Gift Card${recipientName ? ` for ${recipientName}` : ""}`,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/gift-card/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/gift-card?cancelled=true`,
        customer_email: purchaserEmail,
        metadata: {
          type: "gift_card",
          gift_card_code: code,
          amount: String(amount),
          purchaser_name: purchaserName,
          purchaser_email: purchaserEmail,
          recipient_name: recipientName || "",
          recipient_email: recipientEmail || "",
          message: message || "",
        },
      });

      // Create pending gift card record
      const { error: insertError } = await supabaseAdmin.from("gift_cards").insert({
        code,
        balance: amount,
        initial_value: amount,
        purchaser_email: purchaserEmail,
        purchaser_name: purchaserName,
        recipient_email: recipientEmail || null,
        recipient_name: recipientName || null,
        message: message || null,
        status: "active",
        expiry_date: expiryDate.toISOString(),
        payment_reference: session.id,
        customer_id: customerId || null,
      });

      if (insertError) {
        console.error("Failed to create gift card record:", insertError);
        return NextResponse.json({ error: "Failed to create gift card" }, { status: 500 });
      }

      return NextResponse.json({ url: session.url, code });
    } catch (err) {
      console.error("Gift card checkout error:", err);
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }
  }

  // SumUp checkout
  if (paymentMethod === "sumup") {
    const sumUpKey = process.env.SUMUP_API_KEY;
    if (!sumUpKey) {
      return NextResponse.json({ error: "SumUp is not configured" }, { status: 500 });
    }

    const checkoutRef = `SLM-GIFT-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    try {
      const res = await fetch("https://api.sumup.com/v0.1/checkouts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sumUpKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount,
          currency: "GBP",
          checkout_reference: checkoutRef,
          description: `Slime Studio Gift Card - £${amount.toFixed(2)}`,
          merchant_code: process.env.SUMUP_MERCHANT_CODE,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("SumUp checkout error:", errorText);
        return NextResponse.json({ error: "Failed to create SumUp checkout" }, { status: 500 });
      }

      const checkoutData = await res.json();

      // Create pending gift card record
      const { error: insertError } = await supabaseAdmin.from("gift_cards").insert({
        code,
        balance: amount,
        initial_value: amount,
        purchaser_email: purchaserEmail,
        purchaser_name: purchaserName,
        recipient_email: recipientEmail || null,
        recipient_name: recipientName || null,
        message: message || null,
        status: "active",
        expiry_date: expiryDate.toISOString(),
        payment_reference: checkoutRef,
        customer_id: customerId || null,
      });

      if (insertError) {
        console.error("Failed to create gift card record:", insertError);
        return NextResponse.json({ error: "Failed to create gift card" }, { status: 500 });
      }

      return NextResponse.json({ url: checkoutData.checkout_url, code });
    } catch (err) {
      console.error("SumUp gift card checkout error:", err);
      return NextResponse.json({ error: "Failed to create SumUp checkout" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
}
