import { NextRequest, NextResponse } from "next/server";
import { getStripeAsync } from "@/lib/stripe";
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
  for (const item of items) {
    const product = products.find((p) => p.id === item.product_id);
    if (!product) {
      return NextResponse.json({ error: `Product not found: ${item.name}` }, { status: 400 });
    }
    if ((product.stock || 0) < item.quantity) {
      return NextResponse.json({ error: `Not enough stock for ${product.name}` }, { status: 400 });
    }
    const unitPrice = Math.round(product.price * 100);
    subtotal += product.price * item.quantity;
    lineItems.push({
      price_data: {
        currency: "gbp",
        product_data: {
          name: product.name,
          ...(item.image_url ? { images: [item.image_url] } : {}),
        },
        unit_amount: unitPrice,
      },
      quantity: item.quantity,
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

  // Generate order number
  const orderNumber = `SLM-${Date.now().toString(36).toUpperCase()}`;

  // Create Stripe Checkout session
  const stripe = await getStripeAsync();
  if (!stripe) {
    return NextResponse.json({ error: "Payment system not configured" }, { status: 500 });
  }

  const origin = req.nextUrl.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop/checkout?cancelled=true`,
      customer_email: customerEmail,
      metadata: {
        order_number: orderNumber,
        customer_name: customerName,
        customer_phone: customerPhone || "",
        shipping_method: shippingMethod,
        shipping_address: shippingAddress || "",
        shipping_city: shippingCity || "",
        shipping_postcode: shippingPostcode || "",
        notes: notes || "",
      },
    });

    // Create order in database with pending status
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
      total,
      payment_status: "pending",
      stripe_session_id: session.id,
      notes: notes || null,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Shop checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
