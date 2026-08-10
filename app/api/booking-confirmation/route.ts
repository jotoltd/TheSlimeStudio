import { NextRequest, NextResponse } from "next/server";
import { getResend, EMAIL_FROM, bookingConfirmationHtml, logEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, date, timeSlot, people, totalPrice, isParty } = body as {
    name: string;
    email: string;
    date: string;
    timeSlot: string;
    people: number;
    totalPrice: number;
    isParty?: boolean;
  };

  if (!email || !name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const r = getResend();
  if (!r) {
    console.warn("RESEND_API_KEY not set — skipping confirmation email");
    return NextResponse.json({ success: true, emailSent: false });
  }

  try {
    await r.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: isParty ? "Party Booking Confirmed — The Slime Studio" : "Booking Confirmed — The Slime Studio",
      html: bookingConfirmationHtml({ name, date, timeSlot, people, totalPrice, isParty }),
    });
    const subject = isParty ? "Party Booking Confirmed — The Slime Studio" : "Booking Confirmed — The Slime Studio";
    await logEmail(email, subject, isParty ? "booking_confirmation" : "booking_confirmation", "sent");
    return NextResponse.json({ success: true, emailSent: true });
  } catch (e) {
    console.error("Failed to send confirmation email:", e);
    await logEmail(email, "Booking confirmation", "booking_confirmation", "failed");
    return NextResponse.json({ success: true, emailSent: false });
  }
}
