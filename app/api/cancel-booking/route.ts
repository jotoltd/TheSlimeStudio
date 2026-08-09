import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY || "");

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

  // Fetch booking details before deleting
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Delete the booking
  const { error: deleteError } = await supabaseAdmin
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }

  // Send cancellation email
  if (booking.email) {
    try {
      await resend.emails.send({
        from: "The Slime Studio <noreply@theslimestudio.co.uk>",
        to: booking.email,
        subject: "Your Booking Has Been Cancelled",
        html: `
          <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #ff2d78; font-size: 1.5rem; margin-bottom: 16px;">Booking Cancelled</h1>
            <p style="color: #333; font-size: 1rem; line-height: 1.6;">
              Hi ${booking.name},
            </p>
            <p style="color: #333; font-size: 1rem; line-height: 1.6;">
              We're writing to let you know that your Slime Studio booking has been cancelled.
            </p>
            <div style="background: #fdeef7; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString("en-GB")}</p>
              <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Time:</strong> ${booking.time_slot}</p>
              <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>People:</strong> ${booking.people}</p>
              ${booking.is_party ? '<p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Type:</strong> Birthday Party</p>' : ''}
            </div>
            <p style="color: #333; font-size: 1rem; line-height: 1.6;">
              If you believe this is an error, please contact us at studio@theslimestudio.co.uk.
            </p>
            <p style="color: #ff2d78; font-size: 0.9rem; margin-top: 24px;">
              ♥ The Slime Studio
            </p>
          </div>
        `,
      });
    } catch (e) {
      console.error("Failed to send cancellation email:", e);
    }
  }

  return NextResponse.json({ success: true });
}
