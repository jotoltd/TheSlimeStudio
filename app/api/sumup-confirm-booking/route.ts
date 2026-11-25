import { NextRequest, NextResponse } from "next/server";
import { verifySumUpPayment } from "@/lib/payment";
import { supabaseAdmin } from "@/lib/supabase";
import { sendCapiEvent, metaContextFromRequest } from "@/lib/capi";
import {
  createPaidBooking,
  claimPendingBooking,
  settleExistingBooking,
  type BookingDetails,
} from "@/lib/create-booking";
import { computeBookingPrice } from "@/lib/booking-price";
import { gclidFromNotes, uploadClickConversion } from "@/lib/google-ads";
import { isValidDateString, isValidTimeSlot } from "@/lib/time-slots";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    checkoutRef: string;
    name?: string;
    email?: string;
    date?: string;
    timeSlot?: string;
    people?: number;
    totalPrice?: number;
    phone?: string;
    discountCode?: string;
    giftCardCode?: string;
    giftCardAmount?: number;
    gclid?: string;
  };

  const { checkoutRef } = body;

  if (!checkoutRef) {
    return NextResponse.json({ error: "Missing checkout reference" }, { status: 400 });
  }

  // Find the pending booking
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("stripe_session_id", checkoutRef)
    .single();

  // If booking already exists and is paid, return success (idempotent)
  if (booking && booking.payment_status === "paid") {
    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      name: booking.name,
      email: booking.email,
      date: booking.date,
      timeSlot: booking.time_slot,
      people: booking.people,
      totalPrice: booking.total_price,
    });
  }

  // Verify with SumUp that the checkout was actually paid. This checks the live
  // checkout first and falls back to settled transaction history, so a late or
  // retried confirmation still succeeds after SumUp purges the checkout object.
  try {
    const verification = await verifySumUpPayment(checkoutRef);

    if (!verification.paid) {
      if (verification.notFound) {
        return NextResponse.json({ error: "Checkout not found on SumUp" }, { status: 404 });
      }
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // If booking exists but is pending, mark it as paid — atomically, so the
    // SumUp webhook racing this request can't double-send emails/loyalty or
    // double-redeem the gift card.
    if (booking) {
      const won = await claimPendingBooking(booking.id);
      if (won) {
        await settleExistingBooking(booking, checkoutRef);
      }

      const gclid = gclidFromNotes(booking.notes);
      if (gclid) {
        await uploadClickConversion({ gclid, value: booking.total_price, orderId: checkoutRef }).catch(() => {});
      }

      // Server-side Purchase — event_id matches the browser event fired on
      // the booking page after the SumUp redirect (checkoutRef).
      const meta = metaContextFromRequest(req, body);
      await sendCapiEvent({
        eventName: "Purchase",
        eventId: checkoutRef,
        email: booking.email,
        name: booking.name,
        phone: booking.phone,
        value: booking.total_price,
        sourceUrl: "https://theslimestudio.co.uk/booking",
        ...meta,
      });

      return NextResponse.json({
        success: true,
        bookingId: booking.id,
        name: booking.name,
        email: booking.email,
        date: booking.date,
        timeSlot: booking.time_slot,
        people: booking.people,
        totalPrice: booking.total_price,
      });
    }

    // Booking not found — try to create it from fallback details provided by the client
    // or from the SumUp checkout amount. This only runs when the pending row was
    // lost, so validate formats and recompute the gift-card cover server-side —
    // a client-supplied giftCardAmount would let them drain a card they never
    // actually paid with.
    const fallbackDetails: BookingDetails = {
      paymentRef: checkoutRef,
      name: body.name || "Unknown",
      email: body.email || "",
      phone: body.phone || null,
      date: body.date || "",
      timeSlot: body.timeSlot || "",
      people: Math.min(Math.max(1, Math.floor(Number(body.people)) || 1), 50),
      // SumUp's verified amount wins over anything the client claims it paid.
      totalPrice: verification.amount ?? body.totalPrice ?? 0,
      isParty: false,
      discountCode: body.discountCode || null,
      gclid: body.gclid || null,
    };

    if (
      !fallbackDetails.email ||
      !fallbackDetails.date ||
      !fallbackDetails.timeSlot ||
      !isValidDateString(fallbackDetails.date) ||
      !isValidTimeSlot(fallbackDetails.timeSlot)
    ) {
      console.error(`[sumup-confirm] Booking ${checkoutRef} not found and no fallback details provided`);
      return NextResponse.json({
        error: "Booking not found and insufficient details to create it",
      }, { status: 404 });
    }

    // Recompute the gift-card cover from the card itself — never trust the
    // client's giftCardAmount.
    if (body.giftCardCode) {
      const price = await computeBookingPrice({
        people: fallbackDetails.people,
        giftCardCode: body.giftCardCode,
      });
      if (!("error" in price)) {
        fallbackDetails.giftCardCode = body.giftCardCode;
        fallbackDetails.giftCardAmount = price.giftCardCover;
      }
    }

    const result = await createPaidBooking(fallbackDetails);

    if (result.bookingId) {
      const meta = metaContextFromRequest(req, body);
      await sendCapiEvent({
        eventName: "Purchase",
        eventId: checkoutRef,
        email: fallbackDetails.email,
        name: fallbackDetails.name,
        phone: fallbackDetails.phone,
        value: fallbackDetails.totalPrice,
        sourceUrl: "https://theslimestudio.co.uk/booking",
        ...meta,
      });

      if (result.created) {
        console.warn(`[sumup-confirm] Recovered booking ${result.bookingId} for ${checkoutRef} — pending booking was missing.`);
      }

      return NextResponse.json({
        success: true,
        bookingId: result.bookingId,
        name: fallbackDetails.name,
        email: fallbackDetails.email,
        date: fallbackDetails.date,
        timeSlot: fallbackDetails.timeSlot,
        people: fallbackDetails.people,
        totalPrice: fallbackDetails.totalPrice,
        overCapacity: result.overCapacity,
      });
    }

    return NextResponse.json({
      error: result.error || "Failed to create booking",
    }, { status: 500 });
  } catch (e) {
    console.error("SumUp confirm booking error:", e);
    return NextResponse.json({ error: "Failed to confirm booking" }, { status: 500 });
  }
}
