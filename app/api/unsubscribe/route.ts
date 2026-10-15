import { NextRequest, NextResponse } from "next/server";
import { unsubscribeEmail, verifyUnsub } from "@/lib/email-marketing";

export const runtime = "nodejs";

const page = (title: string, msg: string) => `<!DOCTYPE html>
<html><head><title>${title}</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: 'Poppins', Arial, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #fdf6fb;">
  <div style="max-width: 420px; padding: 40px; background: #fff; border-radius: 20px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
    <h1 style="color: #ff2d78; font-size: 1.4rem; margin-bottom: 12px;">${title}</h1>
    <p style="color: #555; font-size: 0.95rem; line-height: 1.6;">${msg}</p>
    <a href="https://theslimestudio.co.uk" style="color: #ff2d78; font-size: 0.85rem;">theslimestudio.co.uk</a>
  </div>
</body></html>`;

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("e") || "";
  const token = req.nextUrl.searchParams.get("t") || "";

  if (!verifyUnsub(email, token)) {
    return new NextResponse(page("Invalid link", "This unsubscribe link is invalid or has expired."), {
      status: 400, headers: { "Content-Type": "text/html" },
    });
  }

  await unsubscribeEmail(email);
  return new NextResponse(page("Unsubscribed", `You've been removed from our marketing emails. You'll still receive booking confirmations and receipts.`), {
    headers: { "Content-Type": "text/html" },
  });
}
