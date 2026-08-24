import { NextRequest, NextResponse } from "next/server";
import { getSumUpKey } from "@/lib/payment";
import { supabaseAdmin, STAMPS_PER_REWARD } from "@/lib/supabase";
import { getResend, EMAIL_FROM, CONTACT_EMAIL, logEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { checkoutRef } = await req.json() as { checkoutRef: string };

  if (!checkoutRef) {
    return NextResponse.json({ error: "Missing checkout reference" }, { status: 400 });
  }

  // Find the pending booking
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("stripe_session_id", checkoutRef)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.payment_status === "paid") {
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

  // Verify with SumUp that the checkout was actually paid
  const key = getSumUpKey();
  try {
    const res = await fetch(`https://api.sumup.com/v0.1/checkouts/${checkoutRef}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to verify payment with SumUp" }, { status: 500 });
    }

    if (data.status !== "PAID") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // Mark booking as paid
    const { data: updated, error } = await supabaseAdmin
      .from("bookings")
      .update({ payment_status: "paid" })
      .eq("id", booking.id)
      .select()
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
    }

    // Send admin notification email
    try {
      const r = getResend();
      if (r) {
        await r.emails.send({
          from: EMAIL_FROM,
          to: CONTACT_EMAIL,
          subject: `New Booking — ${booking.name} on ${booking.date} at ${booking.time_slot}`,
          html: `
            <h2>New Booking Received</h2>
            <p><strong>Name:</strong> ${booking.name}</p>
            <p><strong>Email:</strong> ${booking.email}</p>
            <p><strong>Phone:</strong> ${booking.phone || "Not provided"}</p>
            <p><strong>Date:</strong> ${booking.date}</p>
            <p><strong>Time:</strong> ${booking.time_slot}</p>
            <p><strong>People:</strong> ${booking.people}</p>
            <p><strong>Total:</strong> £${Number(booking.total_price).toFixed(2)}</p>
            <p><strong>Payment:</strong> Paid (SumUp)</p>
          `,
        });
        await logEmail(CONTACT_EMAIL, `New Booking — ${booking.name}`, "admin_notification", "sent");
      }
    } catch (e) {
      console.error("Failed to send admin notification:", e);
    }

    // Award loyalty stamp
    try {
      const { data: siteSettings } = await supabaseAdmin
        .from("site_settings")
        .select("loyalty_enabled, stamps_per_reward")
        .eq("id", 1)
        .single();

      if (siteSettings?.loyalty_enabled) {
        const stampsPerReward = siteSettings.stamps_per_reward || STAMPS_PER_REWARD;
        const { data: existingCard } = await supabaseAdmin
          .from("loyalty_cards")
          .select("id, stamps, total_stamps, rewards_earned")
          .eq("email", booking.email.toLowerCase())
          .single();

        if (existingCard) {
          const newStamps = existingCard.stamps + 1;
          const newTotal = existingCard.total_stamps + 1;
          let newRewards = existingCard.rewards_earned;
          let stampCount = newStamps;

          if (newStamps >= stampsPerReward) {
            newRewards += 1;
            stampCount = newStamps - stampsPerReward;
          }

          await supabaseAdmin
            .from("loyalty_cards")
            .update({
              stamps: stampCount,
              total_stamps: newTotal,
              rewards_earned: newRewards,
              name: booking.name,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingCard.id);
        } else {
          await supabaseAdmin.from("loyalty_cards").insert({
            email: booking.email.toLowerCase(),
            name: booking.name,
            stamps: 1,
            total_stamps: 1,
            rewards_earned: 0,
            rewards_redeemed: 0,
          });
        }
      }
    } catch (e) {
      console.error("Failed to award loyalty stamp:", e);
    }

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
  } catch (e) {
    console.error("SumUp confirm booking error:", e);
    return NextResponse.json({ error: "Failed to confirm booking" }, { status: 500 });
  }
}
