import { paymentMethodFor, PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/supabase";

const STYLES: Record<PaymentMethod, string> = {
  sumup: "bg-[#2ba7c4]/15 text-[#1d7d94]",
  stripe: "bg-[#635bff]/15 text-[#4a43c9]",
  manual: "bg-ink/[0.07] text-ink-soft",
  unknown: "bg-ink/[0.05] text-ink-soft",
};

export default function PaymentMethodBadge({ reference, className = "" }: { reference?: string | null; className?: string }) {
  const method = paymentMethodFor(reference);
  return (
    <span
      title={reference || "No payment reference"}
      className={`inline-block px-2 py-0.5 rounded-full text-[0.7rem] font-medium whitespace-nowrap ${STYLES[method]} ${className}`}
    >
      {PAYMENT_METHOD_LABELS[method]}
    </span>
  );
}
