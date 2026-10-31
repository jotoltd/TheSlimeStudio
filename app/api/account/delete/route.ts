import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession, CUSTOMER_COOKIE } from "@/lib/customer-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// POST /api/account/delete — self-service account deletion (App Store
// guideline 5.1.1 requires this in-app). Mirrors the admin GDPR erasure:
// the account and loyalty/subscriber/waitlist/push-token rows are deleted,
// PII is anonymised on retained financial records, and the session cookie
// is cleared.
export async function POST(req: NextRequest) {
  const session = getCustomerSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = session.sub;
  const email = (session.email || "").trim().toLowerCase();
  if (!id || !email) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  const anonEmail = `deleted-${id.slice(0, 8)}@removed.invalid`;
  // Emails are stored with whatever casing the customer typed, so match
  // case-insensitively. Escape LIKE wildcards — _ and % are legal in email
  // local parts and would otherwise match other people's rows.
  const emailLike = email.replace(/[\\%_]/g, (c) => `\\${c}`);

  // Anonymise PII on records we retain for accounting/analytics
  const { error: bkErr } = await supabaseAdmin
    .from("bookings")
    .update({ name: "[deleted]", email: anonEmail, phone: null, notes: null, device_token: null })
    .ilike("email", emailLike);
  if (bkErr) console.error("account delete: bookings anonymise failed:", bkErr);

  const { error: ordErr } = await supabaseAdmin
    .from("shop_orders")
    .update({
      customer_name: "[deleted]",
      customer_email: anonEmail,
      customer_phone: null,
      shipping_address: null,
      shipping_city: null,
      shipping_postcode: null,
      notes: null,
    })
    .ilike("customer_email", emailLike);
  if (ordErr) console.error("account delete: orders anonymise failed:", ordErr);

  const { error: gcPurchErr } = await supabaseAdmin
    .from("gift_cards")
    .update({ purchaser_email: anonEmail, purchaser_name: "[deleted]", message: null, device_token: null })
    .ilike("purchaser_email", emailLike);
  if (gcPurchErr) console.error("account delete: gift cards (purchaser) anonymise failed:", gcPurchErr);
  const { error: gcRecipErr } = await supabaseAdmin
    .from("gift_cards")
    .update({ recipient_email: anonEmail, recipient_name: "[deleted]" })
    .ilike("recipient_email", emailLike);
  if (gcRecipErr) console.error("account delete: gift cards (recipient) anonymise failed:", gcRecipErr);

  const { error: enqErr } = await supabaseAdmin
    .from("enquiries")
    .update({ name: "[deleted]", email: anonEmail, phone: null, message: null })
    .ilike("email", emailLike);
  if (enqErr) console.error("account delete: enquiries anonymise failed:", enqErr);

  const { error: evtErr } = await supabaseAdmin
    .from("special_event_bookings")
    .update({ name: "[deleted]", email: anonEmail, phone: null, customer_id: null })
    .ilike("email", emailLike);
  if (evtErr) console.error("account delete: event bookings anonymise failed:", evtErr);

  // Sent-mail log rows key off the recipient; subjects can also embed the
  // person's name, so clear both.
  const { error: logErr } = await supabaseAdmin
    .from("email_logs")
    .update({ recipient: anonEmail, subject: "[personal data removed]" })
    .ilike("recipient", emailLike);
  if (logErr) console.error("account delete: email log anonymise failed:", logErr);

  // Delete rows that exist purely to serve this person
  await supabaseAdmin.from("push_tokens").delete().eq("customer_id", id);
  await supabaseAdmin.from("loyalty_cards").delete().ilike("email", emailLike);
  await supabaseAdmin.from("subscribers").delete().ilike("email", emailLike);
  await supabaseAdmin.from("waitlist").delete().ilike("email", emailLike);

  const { error: custErr } = await supabaseAdmin.from("customers").delete().eq("id", id);
  if (custErr) {
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
