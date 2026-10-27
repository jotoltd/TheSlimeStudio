import { supabaseAdmin } from "@/lib/supabase";

// Sanity ceiling — the slot-capacity check is the real limit, but this stops
// absurd payloads before they reach payment providers or the bookings table.
export const MAX_BOOKING_PEOPLE = 50;

export type BookingPrice = {
  people: number;
  subtotal: number;
  discountAmount: number;
  giftCardCover: number;
  finalTotal: number;
  discountCode: string | null;
};

// Authoritative server-side price for a standard session booking. The client
// sends its own totalPrice for UX display only — every charge, free booking
// and stored total must come from this computation.
export async function computeBookingPrice(opts: {
  people: number;
  discountCode?: string | null;
  giftCardCode?: string | null;
}): Promise<BookingPrice | { error: string; status: number }> {
  const people = Math.floor(Number(opts.people));
  if (!Number.isFinite(people) || people < 1 || people > MAX_BOOKING_PEOPLE) {
    return { error: "Please choose between 1 and 50 people.", status: 400 };
  }

  const { data: settings } = await supabaseAdmin
    .from("booking_settings")
    .select("price_per_person")
    .eq("id", 1)
    .single();
  const pricePerPerson = Number(settings?.price_per_person) || 15;
  const subtotal = Number((people * pricePerPerson).toFixed(2));

  // Discount code — same rules as /api/discount/validate for scope "booking".
  // FREE- loyalty codes are 100% discount_codes rows, so they land here too.
  let discountAmount = 0;
  let discountCode: string | null = null;
  if (opts.discountCode) {
    const code = opts.discountCode.trim().toUpperCase();
    const { data: disc } = await supabaseAdmin
      .from("discount_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    const valid =
      disc &&
      disc.active &&
      (disc.scope === "both" || disc.scope === "booking") &&
      (!disc.expires_at || new Date(disc.expires_at) > new Date()) &&
      (disc.max_uses === null || disc.used_count < disc.max_uses) &&
      (Number(disc.min_spend) === 0 || subtotal >= Number(disc.min_spend));

    if (!valid) {
      return { error: "That discount code isn't valid for this booking.", status: 400 };
    }
    discountAmount =
      disc.discount_type === "percentage"
        ? (subtotal * Number(disc.value)) / 100
        : Number(disc.value);
    discountAmount = Math.min(discountAmount, subtotal);
    discountCode = code;
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);

  // Gift card — the cover is whatever the card can actually pay, looked up
  // fresh so a stale or forged client amount can't overdraw it.
  let giftCardCover = 0;
  if (opts.giftCardCode && afterDiscount > 0) {
    const { data: card } = await supabaseAdmin
      .from("gift_cards")
      .select("balance, status, expiry_date")
      .eq("code", opts.giftCardCode.trim().toUpperCase())
      .maybeSingle();

    if (
      !card ||
      card.status !== "active" ||
      (card.expiry_date && new Date(card.expiry_date) < new Date())
    ) {
      return { error: "That gift card isn't valid.", status: 400 };
    }
    giftCardCover = Math.min(Number(card.balance), afterDiscount);
  }

  return {
    people,
    subtotal,
    discountAmount: Number(discountAmount.toFixed(2)),
    giftCardCover: Number(giftCardCover.toFixed(2)),
    finalTotal: Number(Math.max(0, afterDiscount - giftCardCover).toFixed(2)),
    discountCode,
  };
}
