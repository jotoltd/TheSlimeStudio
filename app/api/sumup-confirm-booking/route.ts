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

    // If booking exists but is pending, mark it as paid directly
    if (booking) {
      const { data: updated, error } = await supabaseAdmin
        .from("bookings")
        .update({ payment_status: "paid" })
        .eq("id", booking.id)
        .select()
        .single();

      if (error || !updated) {
        return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
      }

      // Use createPaidBooking's side-effect logic by calling it with the existing booking's details.
      // It will detect the existing booking (now paid) and return early — but we still need
      // to send notifications and award loyalty. So we call it with the booking details.
      // Since the booking already exists and is now paid, createPaidBooking will find it
      // and return { created: false } without sending duplicate emails.
      // Instead, send notifications directly here.
      await sendNotificationsAndLoyalty(booking);

      return NextResponse.json({
        success: true,
        bookingId: updated.id,
        name: updated.name,
        email: updated.email,
        date: updated.date,
        timeSlot: updated.time_slot,
        people: updated.people,
        totalPrice: updated.total_price,
      });
    }

    // Booking not found — try to create it from fallback details provided by the client
    // or from the SumUp checkout amount
    const fallbackDetails: BookingDetails = {
      paymentRef: checkoutRef,
      name: body.name || "Unknown",
      email: body.email || "",
      phone: body.phone || null,
      date: body.date || "",
      timeSlot: body.timeSlot || "",
      people: body.people || 1,
      totalPrice: body.totalPrice ?? verification.amount ?? 0,
      isParty: false,
      discountCode: body.discountCode || null,
    };

    if (!fallbackDetails.email || !fallbackDetails.date || !fallbackDetails.timeSlot) {
      console.error(`[sumup-confirm] Booking ${checkoutRef} not found and no fallback details provided`);
      return NextResponse.json({
        error: "Booking not found and insufficient details to create it",
      }, { status: 404 });
    }

    const result = await createPaidBooking(fallbackDetails);

    if (result.bookingId) {
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

async function sendNotificationsAndLoyalty(booking: {
  name: string; email: string; phone?: string | null;
  date: string; time_slot: string; people: number; total_price: number;
  discount_code?: string | null;
}) {
  const details: BookingDetails = {
    paymentRef: "",
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    date: booking.date,
    timeSlot: booking.time_slot,
    people: booking.people,
    totalPrice: booking.total_price,
    isParty: false,
    discountCode: booking.discount_code,
  };
  await sendCustomerConfirmation(details).catch(() => {});
  await sendAdminNotification(details, false).catch(() => {});
  await awardLoyaltyStamp(booking.name, booking.email).catch(() => {});
  if (booking.discount_code && booking.discount_code.toUpperCase().startsWith("FREE-")) {
    await redeemRewardCode(booking.discount_code, booking.email).catch(() => {});
  }
}
