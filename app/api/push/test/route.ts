import { NextRequest, NextResponse } from "next/server";
import { sendPush } from "@/lib/apns";

export const runtime = "nodejs";

// Sends a fixed test push to a given device token. Message content is
// hardcoded so the endpoint can't be abused as a free relay.
export async function POST(req: NextRequest) {
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const token = String(body.token || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const result = await sendPush(token, {
    title: "Slime Studio test",
    body: "Push notifications are working!",
    data: { kind: "test" },
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || result.reason || "Push failed", status: result.status },
      { status: result.status && result.status >= 400 && result.status < 600 ? result.status : 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
