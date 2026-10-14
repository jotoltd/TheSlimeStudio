import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import {
  bookingConfirmationHtml,
  cancellationHtml,
  eventBookingConfirmationHtml,
  orderConfirmationHtml,
  emailTemplates,
} from "@/lib/email";

export const runtime = "nodejs";

const SAMPLE = {
  booking: { name: "Amelia", date: "2026-03-14", timeSlot: "11:00", people: 3, totalPrice: 45, isParty: false },
  party: { name: "Sophie", date: "2026-03-14", timeSlot: "11:00", people: 8, totalPrice: 130, isParty: true },
  event: { name: "Amelia", eventTitle: "Halloween Slime Session", date: "2026-10-28", startTime: "11:00", durationMinutes: 60, quantity: 2, totalPrice: 30, pricingModel: "per_person" },
  cancellation: { name: "Amelia", date: "2026-03-14", timeSlot: "11:00", people: 3, isParty: false },
  order: {
    orderNumber: "TSS-1042",
    name: "Amelia",
    items: [
      { name: "Unicorn Slime Kit", price: 12.99, quantity: 1, image_url: null },
      { name: "Extra Glitter Pack", price: 2.5, quantity: 2, image_url: null },
    ],
    subtotal: 17.99,
    shippingCost: 3.49,
    total: 21.48,
    shippingMethod: "delivery",
  },
};

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const type = (body.type as string) || "booking";
  const draft = (body.overrides || {}) as Record<string, string>;
  // Unsaved draft values win over stored overrides
  const saved = await emailTemplates();
  const ov: Record<string, string> = { ...saved };
  for (const [k, v] of Object.entries(draft)) {
    if (k.startsWith("email_tpl_")) {
      if (v.trim()) ov[k] = v; else delete ov[k];
    }
  }

  let subject: string, html: string;
  switch (type) {
    case "event":
      subject = ov.email_tpl_event_subject || `Event Booking Confirmed — ${SAMPLE.event.eventTitle} — The Slime Studio`;
      html = eventBookingConfirmationHtml(SAMPLE.event, ov);
      break;
    case "cancellation":
      subject = ov.email_tpl_cancellation_subject || "Your Booking Has Been Cancelled — The Slime Studio";
      html = cancellationHtml(SAMPLE.cancellation, ov);
      break;
    case "order":
      subject = ov.email_tpl_order_subject || `Order Confirmed — ${SAMPLE.order.orderNumber} — The Slime Studio`;
      html = orderConfirmationHtml(SAMPLE.order, ov);
      break;
    default:
      subject = ov.email_tpl_booking_subject || "Your Slime Studio booking is confirmed!";
      html = bookingConfirmationHtml(SAMPLE.booking, ov);
  }

  return NextResponse.json({ subject, html });
}
