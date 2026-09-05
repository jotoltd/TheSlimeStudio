import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = getCustomerSession(req);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("id, name, email, phone, terms_agreed_at")
    .eq("id", session.sub)
    .maybeSingle();

  if (!customer) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone || "",
    termsAgreed: !!customer.terms_agreed_at,
  });
}
