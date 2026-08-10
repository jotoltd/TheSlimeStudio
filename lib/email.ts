import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase";

let _resend: Resend | null = null;

export function getResend(): Resend | null {
  if (!_resend && process.env.RESEND_API_KEY) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function logEmail(recipient: string, subject: string, type: string, status: string = "sent") {
  try {
    await supabaseAdmin.from("email_logs").insert({ recipient, subject, type, status });
  } catch {}
}

export const EMAIL_FROM = "The Slime Studio <noreply@theslimestudio.co.uk>";
export const CONTACT_EMAIL = "studio@theslimestudio.co.uk";

function emailWrapper(content: string): string {
  return `
    <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      ${content}
      <p style="color: #ff2d78; font-size: 0.9rem; margin-top: 24px;">
        The Slime Studio
      </p>
    </div>
  `;
}

export function bookingConfirmationHtml(opts: {
  name: string;
  date: string;
  timeSlot: string;
  people: number;
  totalPrice: number;
  isParty?: boolean;
}): string {
  const dateStr = opts.date ? new Date(opts.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  return emailWrapper(`
    <h1 style="color: #ff2d78; font-size: 1.5rem; margin-bottom: 16px;">Booking Confirmed!</h1>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      Hi ${opts.name},
    </p>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      ${opts.isParty ? "Your birthday party booking at The Slime Studio is confirmed!" : "Your slime-making session at The Slime Studio is confirmed!"}
      We can't wait to see you.
    </p>
    <div style="background: #fdeef7; border-radius: 12px; padding: 16px; margin: 16px 0;">
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Date:</strong> ${dateStr}</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Time:</strong> ${opts.timeSlot}</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>${opts.isParty ? "Children" : "People"}:</strong> ${opts.people}</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Total:</strong> &pound;${opts.totalPrice.toFixed(2)}</p>
      ${opts.isParty ? '<p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Type:</strong> Birthday Party (1.5 hours)</p>' : '<p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Type:</strong> Standard Session (1 hour)</p>'}
    </div>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      ${opts.isParty
        ? "Please arrive 10 minutes early so we can get everyone set up. Each child will make their own slime to take home!"
        : "Please arrive 5 minutes before your session. Everything you need is provided!"
      }
    </p>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      Need to make changes? Contact us at <a href="mailto:${CONTACT_EMAIL}" style="color: #ff2d78;">${CONTACT_EMAIL}</a>.
    </p>
  `);
}

export function cancellationHtml(opts: {
  name: string;
  date: string;
  timeSlot: string;
  people: number;
  isParty?: boolean;
}): string {
  const dateStr = opts.date ? new Date(opts.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  return emailWrapper(`
    <h1 style="color: #ff2d78; font-size: 1.5rem; margin-bottom: 16px;">Booking Cancelled</h1>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      Hi ${opts.name},
    </p>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      We're writing to let you know that your Slime Studio booking has been cancelled.
    </p>
    <div style="background: #fdeef7; border-radius: 12px; padding: 16px; margin: 16px 0;">
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Date:</strong> ${dateStr}</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Time:</strong> ${opts.timeSlot}</p>
      <p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>${opts.isParty ? "Children" : "People"}:</strong> ${opts.people}</p>
      ${opts.isParty ? '<p style="margin: 4px 0; color: #333; font-size: 0.9rem;"><strong>Type:</strong> Birthday Party</p>' : ''}
    </div>
    <p style="color: #333; font-size: 1rem; line-height: 1.6;">
      If you believe this is an error, please contact us at <a href="mailto:${CONTACT_EMAIL}" style="color: #ff2d78;">${CONTACT_EMAIL}</a>.
    </p>
  `);
}
