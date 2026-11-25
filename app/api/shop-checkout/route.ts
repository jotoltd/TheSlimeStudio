import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { sanitizeGclid } from "@/lib/google-ads";
import { rateLimited, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const DELIVERY_FEE = 3.95;
const FREE_DELIVERY_THRESHOLD = 30;

export async function POST(req: NextRequest) {
  if (rateLimited(`shop-checkout:${clientIp(req)}`, 20, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const body = await req.json();
  const {
    items,
    customerName,
    customerEmail: rawCustomerEmail,
    customerPhone,
    shippingMethod,
    shippingAddress,
    shippingCity,
    shippingPostcode,
    notes,
    discountCode,
    giftCardCode,
  } = body as {
    items: { product_id: string; name: string; price: number; quantity: number; image_url: string | null }[];
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    shippingMethod: "collection" | "delivery";
    shippingAddress?: string;
    shippingCity?: string;
    shippingPostcode?: string;
    notes?: string;
    discountCode?: string;
    giftCardCode?: string;
    gclid?: string;
  };

  const customerEmail = String(rawCustomerEmail || "").trim().toLowerCase();

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }
  if (!customerName || !customerEmail) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }
  if (shippingMethod === "delivery" && (!shippingAddress || !shippingPostcode)) {
    return NextResponse.json({ error: "Delivery address is required" }, { status: 400 });
  }

  // Validate email
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);
  if (!emailOk) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Verify products and stock from database
  const productIds = items.map((i) => i.product_id);
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, name, price, stock")
    .in("id", productIds);

  if (!products) {
    return NextResponse.json({ error: "Failed to verify products" }, { status: 500 });
  }

  // Build verified line items and check stock
  const lineItems: {
    price_data: {
      currency: string;
      product_data: { name: string; images?: string[] };
      unit_amount: number;
    };
    quantity: number;
  }[] = [];

  let subtotal = 0;
  const verifiedItems: { product_id: string; name: string; price: number; quantity: number; image_url: string | null }[] = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.product_id);
    if (!product) {
      return NextResponse.json({ error: `Product not found: ${item.name}` }, { status: 400 });
    }
    const qty = Math.floor(Number(item.quantity));
    if (!Number.isFinite(qty) || qty < 1 || qty > 100) {
      return NextResponse.json({ error: `Invalid quantity for ${product.name}` }, { status: 400 });
    }
    if ((product.stock || 0) < qty) {
      return NextResponse.json({ error: `Not enough stock for ${product.name}` }, { status: 400 });
    }
    const unitPrice = Math.round(product.price * 100);
    subtotal += product.price * qty;
    verifiedItems.push({
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: qty,
      image_url: item.image_url || null,
    });
    lineItems.push({
      price_data: {
        currency: "gbp",
        product_data: {
          name: product.name,
          ...(item.image_url ? { images: [item.image_url] } : {}),
        },
        unit_amount: unitPrice,
      },
      quantity: qty,
    });
  }

  // Calculate shipping
  let shippingCost = 0;
  if (shippingMethod === "delivery") {
    shippingCost = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  }

  if (shippingCost > 0) {
    lineItems.push({
      price_data: {
        currency: "gbp",
        product_data: { name: "Shipping" },
        unit_amount: Math.round(shippingCost * 100),
      },
      quantity: 1,
    });
  }

  const total = subtotal + shippingCost;

  // Apply discount if code provided
  let discountAmount = 0;
  if (discountCode) {
    const { data: discount } = await supabaseAdmin
      .from("discount_codes")
      .select("*")
      .eq("code", discountCode.trim().toUpperCase())
      .maybeSingle();
    if (discount && discount.active && (!discount.expires_at || new Date(discount.expires_at) > new Date()) && (discount.max_uses === null || discount.used_count < discount.max_uses)) {
      if ((discount.scope === "both" || discount.scope === "shop") && (discount.min_spend === 0 || subtotal >= Number(discount.min_spend))) {
        discountAmount = discount.discount_type === "percentage"
          ? (subtotal * Number(discount.value)) / 100
          : Number(discount.value);
        discountAmount = Math.min(discountAmount, subtotal);
      }
    }
  }

  // Gift card: validate server-side and compute how much of the (discounted)
  // order it covers. The customer is only charged the remainder — previously
  // the card was redeemed post-payment while the full price was still charged.
  const afterDiscountTotal = Math.max(0, total - discountAmount);
  let giftCardCover = 0;
  let giftCardValid = false;
  if (giftCardCode) {
    const { data: card } = await supabaseAdmin
      .from("gift_cards")
      .select("balance, status, expiry_date")
      .eq("code", giftCardCode.trim().toUpperCase())
      .maybeSingle();
    const expired = card?.expiry_date && new Date(card.expiry_date) < new Date();
    if (card && card.status === "active" && !expired && card.balance > 0) {
      giftCardCover = Math.min(Number(card.balance), afterDiscountTotal);
      giftCardValid = true;
    }
  }

  const chargeTotal = Math.max(0, afterDiscountTotal - giftCardCover);

  // Generate order number
  const orderNumber = `SLM-${Date.now().toString(36).toUpperCase()}`;

  // Create Stripe Checkout session
  const stripe = await getStripeAsync();
  if (!stripe) {
    return NextResponse.json({ error: "Payment system not configured" }, { status: 500 });
  }

  const origin = req.nextUrl.origin;

  try {
    // Stripe Checkout can't express "discount + gift card" natively, so apply
    // their combined value as a one-time amount-off coupon — the charge then
    // equals exactly what the customer saw at checkout.
    const discountPence = Math.round((discountAmount + giftCardCover) * 100);
    let couponId: string | undefined;
    if (discountPence > 0) {
      const coupon = await stripe.coupons.create({
        id: `slm-${orderNumber}`.toLowerCase(),
        amount_off: discountPence,
        currency: "gbp",
        duration: "once",
      });
      couponId = coupon.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      discounts: couponId ? [{ coupon: couponId }] : undefined,
      success_url: `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop/checkout?cancelled=true`,
      customer_email: customerEmail,
      payment_intent_data: {
        description: `Shop Order — ${orderNumber}`,
        metadata: { type: "shop_order", order_number: orderNumber },
      },
      metadata: {
        type: "shop_order",
        order_number: orderNumber,
        customer_name: customerName,
        customer_phone: customerPhone || "",
        shipping_method: shippingMethod,
        shipping_address: shippingAddress || "",
        shipping_city: shippingCity || "",
        shipping_postcode: shippingPostcode || "",
        notes: notes || "",
        gclid: sanitizeGclid(body.gclid) || "",
        discount_code: discountAmount > 0 ? (discountCode || "") : "",
        discount_amount: String(discountAmount.toFixed(2)),
        gift_card_code: giftCardValid ? (giftCardCode || "") : "",
        gift_card_cover: String(giftCardCover.toFixed(2)),
      },
    });

    // Create order in database with pending status. gift_card_cover needs the
    // 20261101000003 migration — if it hasn't been applied yet, retry without
    // it (the cover still travels in Stripe metadata for the webhook).
    const orderRow = {
      order_number: orderNumber,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone || null,
      shipping_method: shippingMethod,
      shipping_address: shippingAddress || null,
      shipping_city: shippingCity || null,
      shipping_postcode: shippingPostcode || null,
      items: verifiedItems,
      subtotal,
      shipping_cost: shippingCost,
      // total = amount actually charged (after discount + gift card cover)
      total: chargeTotal,
      payment_status: "pending",
      stripe_session_id: session.id,
      notes: notes || null,
      discount_code: discountAmount > 0 ? (discountCode || null) : null,
      discount_amount: discountAmount,
      gift_card_code: giftCardValid ? (giftCardCode || null) : null,
      gift_card_cover: giftCardCover,
    };
    let { error: orderError } = await supabaseAdmin.from("shop_orders").insert(orderRow);
    if (orderError) {
      const withoutCover = { ...orderRow } as Record<string, unknown>;
      delete withoutCover.gift_card_cover;
      const retry = await supabaseAdmin.from("shop_orders").insert(withoutCover);
      orderError = retry.error;
    }
    if (orderError) {
      console.error("Failed to store shop order:", orderError);
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Shop checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
