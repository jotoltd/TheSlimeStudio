import { NextRequest, NextResponse } from "next/server";
import { verifySumUpPayment } from "@/lib/payment";
import { supabaseAdmin } from "@/lib/supabase";
import {
  createPaidBooking,
  sendCustomerConfirmation,
  sendAdminNotification,
  awardLoyaltyStamp,
  type BookingDetails,
} from "@/lib/create-booking";
import { redeemRewardCode } from "@/lib/loyalty-rewards";

export const runtime = "nodejs";

/**
 * SumUp webhook endpoint.
 *
 * SumUp sends a POST to this URL when a checkout status changes.
 * The payload includes the checkout_reference and status.
 *
 * We use this as a fallback: if the client never returns from the SumUp
 * redirect to confirm the booking, this webhook will mark it as paid
 * (or create it if missing).
 *
 * Set the webhook URL in the SumUp dashboard to:
 *   https://theslimestudio.co.uk/api/sumup-webhook
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const checkoutRef = body.checkout_reference || body.checkoutRef;
    const status = (body.status || "").toUpperCase();

    if (!checkoutRef) {
      return NextResponse.json({ error: "Missing checkout_reference" }, { status: 400 });
    }

    // Deliberately not gating on the payload status: SumUp's event vocabulary
    // varies ("PAID", "SUCCESSFUL", "CHECKOUT_STATUS_CHANGED"), and we verify
    // against the API below regardless. Only skip states that are clearly final
    // and unpaid, so we don't spend an API call on them.
    if (status === "FAILED" || status === "CANCELLED" || status === "EXPIRED") {
      return NextResponse.json({ received: true, status });
    }

    // Find the pending booking
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("stripe_session_id", checkoutRef)
      .single();

    // If booking already paid, nothing to do
    if (booking && booking.payment_status === "paid") {
      return NextResponse.json({ received: true, alreadyPaid: true });
    }

    // Verify with SumUp that the checkout is actually paid (don't trust the webhook
    // alone). Falls back to settled transaction history if the checkout object has
    // already been purged, which happens for retried/late webhook deliveries.
    const verification = await verifySumUpPayment(checkoutRef);
    if (!verification.paid) {
      console.error("[sumup-webhook] Checkout not paid on SumUp:", checkoutRef);
      return NextResponse.json({ received: true, notPaid: true });
    }

    // If booking exists but is pending, mark as paid and send notifications
    if (booking) {
      const { error } = await supabaseAdmin
        .from("bookings")
        .update({ payment_status: "paid" })
        .eq("id", booking.id);

      if (error) {
        console.error("[sumup-webhook] Failed to update booking:", error);
        return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
      }

      const details: BookingDetails = {
        paymentRef: checkoutRef,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        date: booking.date,
        timeSlot: booking.time_slot,
        people: booking.people,
        totalPrice: booking.total_price,
        isParty: booking.is_party,
        discountCode: booking.discount_code,
      };

      await sendCustomerConfirmation(details).catch(() => {});
      await sendAdminNotification(details, false).catch(() => {});
      await awardLoyaltyStamp(booking.name, booking.email).catch(() => {});
      if (booking.discount_code && booking.discount_code.toUpperCase().startsWith("FREE-")) {
        await redeemRewardCode(booking.discount_code, booking.email).catch(() => {});
      }

      console.warn(`[sumup-webhook] Recovered booking ${booking.id} for ${checkoutRef} — client never confirmed.`);
      return NextResponse.json({ received: true, recovered: true, bookingId: booking.id });
    }

    // Booking not found — can't create without customer details
    // (SumUp webhooks don't include customer booking details, only checkout info)
    console.error(`[sumup-webhook] Booking ${checkoutRef} not found in DB and no customer details available in webhook`);
    return NextResponse.json({
      received: true,
      bookingNotFound: true,
      message: "Booking was not found. Customer details are not available in SumUp webhooks.",
    });
  } catch (e) {
    console.error("[sumup-webhook] Error:", e);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
