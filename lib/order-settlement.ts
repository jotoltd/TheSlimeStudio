import { supabaseAdmin } from "@/lib/supabase";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { redeemGiftCard } from "@/lib/gift-cards";
import { awardReferrerReward, incrementDiscountUsage } from "@/lib/create-booking";
import { sanitizeGclid, uploadClickConversion } from "@/lib/google-ads";
import { createRoyalMailShipment } from "@/lib/royal-mail";

export type ShopOrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  shipping_method: string;
  shipping_address?: string | null;
  shipping_city?: string | null;
  shipping_postcode?: string | null;
  items: { product_id: string; name: string; price: number; quantity: number; image_url?: string | null }[];
  subtotal: number;
  shipping_cost: number;
  total: number;
  discount_code?: string | null;
  gift_card_code?: string | null;
  gift_card_cover?: number | null;
  notes?: string | null;
};

// Atomic pending → paid transition for shop orders. Returns true only for the
// caller that won, so confirm + webhook can't double-decrement stock, double-
// send email, or double-redeem gift cards/discounts.
export async function claimShopOrder(orderId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("shop_orders")
    .update({ payment_status: "paid" })
    .eq("id", orderId)
    .neq("payment_status", "paid")
    .select("id");
  return !!(data && data.length > 0);
}

// All post-payment side effects for a shop order whose payment is verified.
// Call only after claimShopOrder() returns true.
export async function settleShopOrder(order: ShopOrderRow, opts?: { gclid?: string }) {
  // Decrement stock
  for (const item of order.items || []) {
    if (!item?.product_id) continue;
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("stock")
      .eq("id", item.product_id)
      .single();
    if (product) {
      const newStock = Math.max(0, (product.stock || 0) - (item.quantity || 0));
      await supabaseAdmin.from("products").update({ stock: newStock }).eq("id", item.product_id);
    }
  }

  // Referral codes reward the referrer on a confirmed order
  if (order.discount_code) {
    await awardReferrerReward(order.discount_code).catch(() => {});
    await incrementDiscountUsage(order.discount_code).catch(() => {});
  }

  // Redeem the gift-card cover computed at checkout — capped by the card's
  // remaining balance in case it was partly spent elsewhere since.
  if (order.gift_card_code) {
    try {
      const cover = Number(order.gift_card_cover) || 0;
      if (cover > 0) {
        const { data: card } = await supabaseAdmin
          .from("gift_cards")
          .select("balance")
          .eq("code", order.gift_card_code.trim().toUpperCase())
          .maybeSingle();
        if (card && card.balance > 0) {
          const amount = Math.min(Number(card.balance), cover);
          const red = await redeemGiftCard(order.gift_card_code, amount, { shopOrderId: order.id });
          if (!red.success) console.error("Gift card redeem failed:", red.error);
        }
      }
    } catch (e) {
      console.error("Failed to redeem gift card:", e);
    }
  }

  const cleanGclid = sanitizeGclid(opts?.gclid);
  if (cleanGclid) {
    await uploadClickConversion({ gclid: cleanGclid, value: order.total, orderId: order.id }).catch(() => {});
  }

  await sendOrderConfirmationEmail({
    orderNumber: order.order_number,
    name: order.customer_name,
    email: order.customer_email,
    items: (order.items || []).map((i) => ({ ...i, image_url: i.image_url ?? null })),
    subtotal: order.subtotal,
    shippingCost: order.shipping_cost,
    total: order.total,
    shippingMethod: order.shipping_method,
  });

  // Push delivery orders into Royal Mail Click & Drop — fire-and-forget so a
  // Royal Mail outage can never hold up order settlement.
  await createRoyalMailShipment(order).catch((e) =>
    console.error("Royal Mail shipment error:", e)
  );
}
