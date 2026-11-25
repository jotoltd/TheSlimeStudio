import { supabaseAdmin } from "@/lib/supabase";
import type { ShopOrderRow } from "@/lib/order-settlement";

// Royal Mail Click & Drop API — auto-creates a shipment when a delivery order
// is paid, so orders land in Click & Drop ready for a one-click label print.
// Label generation itself needs an OBA (Online Business Account); until then
// the order is created and labels are printed manually in Click & Drop.
//
// Env:
//   ROYAL_MAIL_API_KEY            — Click & Drop API authorisation key
//                                   (Click & Drop → Settings → Integrations)
//   ROYAL_MAIL_SERVICE_CODE       — default "OLP2" (2nd Class). Use "OLP2SF"
//                                   for Signed For 2nd Class (adds tracking),
//                                   "OLP1" for 1st Class.
//   ROYAL_MAIL_PACKAGE_WEIGHT_GRAMS / _FORMAT — parcel defaults

const API_BASE = "https://api.parcel.royalmail.com/api/v1";
const API_KEY = process.env.ROYAL_MAIL_API_KEY;
const SERVICE_CODE = process.env.ROYAL_MAIL_SERVICE_CODE || "OLP2";
const SENDER_NAME = process.env.ROYAL_MAIL_SENDER_NAME || "The Slime Studio";
const SENDER_EMAIL = process.env.ROYAL_MAIL_SENDER_EMAIL || "studio@theslimestudio.co.uk";
const PACKAGE_WEIGHT_GRAMS = Math.max(1, Number(process.env.ROYAL_MAIL_PACKAGE_WEIGHT_GRAMS) || 1000);
const PACKAGE_FORMAT = process.env.ROYAL_MAIL_PACKAGE_FORMAT || "smallParcel";

export type RmShipment = {
  status: "created" | "error";
  orderIdentifier?: number;
  orderReference?: string;
  trackingNumber?: string | null;
  serviceCode?: string;
  createdAt?: string;
  error?: string;
};

export function royalMailEnabled() {
  return !!API_KEY;
}

async function rmFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Royal Mail API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

function buildOrderPayload(order: ShopOrderRow) {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const totalQty = Math.max(1, (order.items || []).reduce((n, i) => n + (i.quantity || 1), 0));
  return {
    orderReference: String(order.order_number || order.id).slice(0, 40),
    orderDate: new Date().toISOString(),
    plannedDespatchDate: tomorrow,
    currencyCode: "GBP",
    subtotal: Number(order.subtotal) || 0,
    shippingCostCharged: Number(order.shipping_cost) || 0,
    total: Number(order.total) || 0,
    recipient: {
      address: {
        fullName: order.customer_name,
        addressLine1: order.shipping_address || "",
        ...(order.shipping_city ? { city: order.shipping_city } : {}),
        postcode: order.shipping_postcode || "",
        countryCode: "GB",
      },
      ...(order.customer_phone ? { phoneNumber: order.customer_phone } : {}),
      emailAddress: order.customer_email,
    },
    sender: { tradingName: SENDER_NAME, emailAddress: SENDER_EMAIL },
    packages: [
      {
        weightInGrams: PACKAGE_WEIGHT_GRAMS,
        packageFormatIdentifier: PACKAGE_FORMAT,
        contents: (order.items || []).map((i) => ({
          name: i.name,
          SKU: i.product_id || undefined,
          quantity: i.quantity || 1,
          unitValue: Number(i.price) || 0,
          unitWeightInGrams: Math.round(PACKAGE_WEIGHT_GRAMS / totalQty),
        })),
      },
    ],
    postageDetails: {
      serviceCode: SERVICE_CODE,
      sendNotificationsTo: "recipient",
      receiveEmailNotification: true,
      receiveSmsNotification: false,
      requestSignatureUponDelivery: false,
    },
    ...(order.notes ? { specialInstructions: String(order.notes).slice(0, 500) } : {}),
  };
}

// Creates the Click & Drop order and stores the result on shop_orders.rm_shipment.
// Safe to call fire-and-forget — never throws.
export async function createRoyalMailShipment(order: ShopOrderRow & { id: string }) {
  if (!royalMailEnabled()) return;
  if (order.shipping_method !== "delivery") return;
  if (!order.shipping_address || !order.shipping_postcode) return;

  const existing = (order as { rm_shipment?: RmShipment | null }).rm_shipment;
  if (existing?.orderIdentifier) return; // already shipped to RM

  try {
    const body = await rmFetch("/orders", {
      method: "POST",
      body: JSON.stringify({ items: [buildOrderPayload(order)] }),
    });
    const created = body?.createdOrders?.[0];
    const orderError = body?.errors?.[0] || body?.orderErrors?.[0];
    if (!created?.orderIdentifier) {
      throw new Error(orderError?.message || JSON.stringify(body).slice(0, 300));
    }
    const shipment: RmShipment = {
      status: "created",
      orderIdentifier: created.orderIdentifier,
      orderReference: created.orderReference || order.order_number,
      trackingNumber: created.trackingNumber ?? null,
      serviceCode: SERVICE_CODE,
      createdAt: new Date().toISOString(),
    };
    await supabaseAdmin.from("shop_orders").update({ rm_shipment: shipment }).eq("id", order.id);
    console.log(`Royal Mail order created for ${order.order_number}: id ${created.orderIdentifier}`);
  } catch (e) {
    const shipment: RmShipment = {
      status: "error",
      serviceCode: SERVICE_CODE,
      createdAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : String(e),
    };
    await supabaseAdmin.from("shop_orders").update({ rm_shipment: shipment }).eq("id", order.id);
    console.error(`Royal Mail shipment failed for ${order.order_number}:`, e);
  }
}
