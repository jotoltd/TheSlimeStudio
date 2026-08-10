import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { getResend, EMAIL_FROM, cancellationHtml, logEmail } from "@/lib/email";
import { getStripeAsync } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Verify admin auth
  const token = req.cookies.get("admin_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await req.json();
  if (!bookingId) {
    return NextResponse.json({ error: "Missing booking ID" }, { status: 400 });
  }

  // Fetch booking details before deleting (try admin first, then anon)
  let booking: Record<string, unknown> | null = null;
  const { data: adminData } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();
  if (adminData) {
    booking = adminData;
  } else {
    const { data: anonData } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();
    booking = anonData;
  }

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Process Stripe refund if booking was paid
  const b = booking as { email?: string; name?: string; date?: string; time_slot?: string; people?: number; is_party?: boolean; payment_status?: string; stripe_session_id?: string; total_price?: number };
  let refundResult: { refunded: boolean; error?: string } = { refunded: false };

  if (b.payment_status === "paid" && b.stripe_session_id) {
    try {
      const stripe = await getStripeAsync();
      if (stripe) {
        // stripe_session_id could be a Payment Intent ID (pi_...) or Checkout Session ID (cs_...)
        if (b.stripe_session_id.startsWith("pi_")) {
          const refund = await stripe.refunds.create({
            payment_intent: b.stripe_session_id,
          });
          refundResult = { refunded: refund.status === "succeeded" };
        } else if (b.stripe_session_id.startsWith("cs_")) {
          // For checkout sessions, retrieve the session to get payment_intent
          const session = await stripe.checkout.sessions.retrieve(b.stripe_session_id);
          if (session.payment_intent) {
            const refund = await stripe.refunds.create({
              payment_intent: session.payment_intent as string,
            });
            refundResult = { refunded: refund.status === "succeeded" };
          }
        }
      }
    } catch (e) {
      console.error("Stripe refund error:", e);
      refundResult = { refunded: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  // Update booking payment status to refunded (instead of deleting)
  if (refundResult.refunded) {
    await supabaseAdmin
      .from("bookings")
      .update({ payment_status: "refunded" })
      .eq("id", bookingId);
  } else {
    // If no refund needed or refund failed, delete the booking
    let deleteError: { message: string } | null = null;
    const { error: adminErr } = await supabaseAdmin
      .from("bookings")
      .delete()
      .eq("id", bookingId);
    if (adminErr) {
      const { error: anonErr } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);
      deleteError = anonErr;
    }

    if (deleteError) {
      return NextResponse.json({
        error: "Failed to cancel booking. Please try again."
      }, { status: 500 });
    }
  }

  // Send cancellation email
  if (b.email) {
    try {
      const r = getResend();
      if (r) {
        await r.emails.send({
          from: EMAIL_FROM,
          to: b.email,
          subject: "Your Booking Has Been Cancelled — The Slime Studio",
          html: cancellationHtml({
            name: b.name || "",
            date: b.date || "",
            timeSlot: b.time_slot || "",
            people: b.people || 0,
            isParty: b.is_party,
          }),
        });
        await logEmail(b.email, "Booking Cancelled — The Slime Studio", "cancellation", "sent");
      }
    } catch (e) {
      console.error("Failed to send cancellation email:", e);
      if (b.email) await logEmail(b.email, "Booking Cancelled — The Slime Studio", "cancellation", "failed");
    }
  }

  return NextResponse.json({
    success: true,
    refunded: refundResult.refunded,
    refundError: refundResult.error,
  });
}
