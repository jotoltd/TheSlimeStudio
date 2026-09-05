import { NextRequest, NextResponse } from "next/server";
import { getSumUpKey, isSumUpConfigured } from "@/lib/payment";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const DELIVERY_FEE = 3.95;
const FREE_DELIVERY_THRESHOLD = 30;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    items,
    customerName,
    customerEmail,
    customerPhone,
    shippingMethod,
    shippingAddress,
    shippingCity,
    shippingPostcode,
    notes,
    discountCode,
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
  };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }
  if (!customerName || !customerEmail) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }
  if (shippingMethod === "delivery" && (!shippingAddress || !shippingPostcode)) {
    return NextResponse.json({ error: "Delivery address is required" }, { status: 400 });
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);
  if (!emailOk) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Verify products and stock
  const productIds = items.map((i) => i.product_id);
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, name, price, stock")
    .in("id", productIds);

  if (!products) {
    return NextResponse.json({ error: "Failed to verify products" }, { status: 500 });
  }

  let subtotal = 0;
  const itemDesc: string[] = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.product_id);
    if (!product) {
      return NextResponse.json({ error: `Product not found: ${item.name}` }, { status: 400 });
    }
    if ((product.stock || 0) < item.quantity) {
      return NextResponse.json({ error: `Not enough stock for ${product.name}` }, { status: 400 });
    }
    subtotal += product.price * item.quantity;
    itemDesc.push(`${item.quantity}x ${product.name}`);
  }

  let shippingCost = 0;
  if (shippingMethod === "delivery") {
    shippingCost = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  }

  const total = subtotal + shippingCost;

  // Apply discount if code provided
  let discountAmount = 0;
  let finalTotal = total;
  if (discountCode) {
    const { data: discount } = await supabaseAdmin
      .from("discount_codes")
      .select("*")
      .eq("code", discountCode.trim().toUpperCase())
      .maybeSingle();
    if (discount && discount.active && (!discount.expires_at || new Date(discount.expires_at) > new Date()) && (discount.max_uses === null || discount.used_count < discount.max_uses)) {
      if (discount.scope === "both" || discount.scope === "shop") {
        if (discount.min_spend === 0 || subtotal >= Number(discount.min_spend)) {
          if (discount.discount_type === "percentage") {
            discountAmount = (subtotal * Number(discount.value)) / 100;
          } else {
            discountAmount = Number(discount.value);
          }
          discountAmount = Math.min(discountAmount, subtotal);
          finalTotal = Math.max(0, total - discountAmount);
        }
      }
    }
  }

  const orderNumber = `SLM-${Date.now().toString(36).toUpperCase()}`;

  if (!isSumUpConfigured()) {
    return NextResponse.json({ error: "SumUp is not configured" }, { status: 500 });
  }

  const key = getSumUpKey();
  const origin = req.nextUrl.origin;

  try {
    const checkoutRef = orderNumber;

    const res = await fetch("https://api.sumup.com/v0.1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Number(finalTotal.toFixed(2)),
        currency: "GBP",
        merchant_code: (process.env.SUMUP_MERCHANT_ID || "").toUpperCase() || undefined,
        checkout_reference: checkoutRef,
        description: `Slime Studio Order ${orderNumber} - ${itemDesc.join(", ")}`,
        redirect_url: `${origin}/shop/success?sumup_ref=${checkoutRef}`,
        hosted_checkout: { enabled: true },
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.id) {
      console.error("SumUp shop checkout error:", JSON.stringify(data));
      const errMsg = data.message ? `${data.message}${data.param ? ` (${data.param})` : ""}` : "Failed to create SumUp checkout";
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    await supabaseAdmin.from("shop_orders").insert({
      order_number: orderNumber,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone || null,
      shipping_method: shippingMethod,
      shipping_address: shippingAddress || null,
      shipping_city: shippingCity || null,
      shipping_postcode: shippingPostcode || null,
      items: items.map((i) => ({
        product_id: i.product_id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        image_url: i.image_url,
      })),
      subtotal,
      shipping_cost: shippingCost,
      total: finalTotal,
      payment_status: "pending",
      stripe_session_id: checkoutRef,
      notes: notes || null,
      discount_code: discountCode || null,
      discount_amount: discountAmount,
    });

    const checkoutUrl = data.hosted_checkout_url || data.checkout_url || data.url;
    if (!checkoutUrl) {
      console.error("SumUp shop checkout: no URL returned", data);
      return NextResponse.json({ error: "Failed to get checkout URL from SumUp" }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutUrl, checkoutRef });
  } catch (e) {
    console.error("SumUp shop checkout error:", e);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
