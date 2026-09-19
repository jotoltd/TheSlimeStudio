import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Privacy Policy | The Slime Studio",
  description: "How The Slime Studio collects, uses and protects your personal data.",
};

const sections: { title: string; body: React.ReactNode }[] = [
  {
    title: "Who we are",
    body: (
      <p>
        The Slime Studio, Unit A, Feathers Yard, Holt, NR25 6BF. You can contact us about anything in this policy at{" "}
        <a href="mailto:studio@theslimestudio.co.uk" className="text-bright-lavender underline">studio@theslimestudio.co.uk</a>.
      </p>
    ),
  },
  {
    title: "What we collect",
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Booking details</strong> — name, email, phone number, session date/time and party size.</li>
        <li><strong>Account details</strong> — if you create an account, your name, email and password (stored securely, hashed).</li>
        <li><strong>Payment information</strong> — payments are processed by Stripe and SumUp. We never see or store your card details.</li>
        <li><strong>Gift card and loyalty activity</strong> — balances, redemptions and stamps linked to your email.</li>
        <li><strong>Technical data</strong> — IP address, browser type and pages visited, collected by our analytics and advertising tools.</li>
      </ul>
    ),
  },
  {
    title: "How we use it",
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>To take and manage your bookings, event bookings, gift cards and shop orders.</li>
        <li>To send booking confirmations, reminders and important updates by email.</li>
        <li>To run our loyalty programme and apply discounts you&apos;re entitled to.</li>
        <li>To respond to enquiries and provide customer support.</li>
        <li>To measure how our website and adverts perform, so we can improve them.</li>
      </ul>
    ),
  },
  {
    title: "Cookies and advertising tracking",
    body: (
      <>
        <p>
          We use cookies and similar tools to understand how people find and use our website:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 mt-2">
          <li><strong>Meta (Facebook/Instagram) Pixel and Conversions API</strong> — tells us when someone who saw or clicked one of our adverts makes a booking. Information such as your email may be shared with Meta in hashed (scrambled) form for this matching.</li>
          <li><strong>Google Analytics</strong> — measures website traffic and which pages are visited.</li>
          <li><strong>Other advertising pixels</strong> (e.g. TikTok, Snapchat) — may be used if we advertise on those platforms.</li>
        </ul>
        <p className="mt-2">
          These tools may set their own cookies. You can block them using your browser settings or an ad blocker — the booking system will still work without them.
        </p>
      </>
    ),
  },
  {
    title: "Who we share it with",
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Stripe and SumUp</strong> — payment processing.</li>
        <li><strong>Supabase</strong> — secure database hosting for bookings and accounts.</li>
        <li><strong>Resend</strong> — sending booking confirmation and notification emails.</li>
        <li><strong>Meta and Google</strong> — advertising measurement, as described above.</li>
        <li><strong>Vercel</strong> — website hosting.</li>
      </ul>
    ),
  },
  {
    title: "How long we keep it",
    body: (
      <p>
        Booking and transaction records are kept as long as needed for accounting and legal purposes. Account data is kept while your account is active. You can ask us to delete your data at any time (see Your rights below).
      </p>
    ),
  },
  {
    title: "Your rights",
    body: (
      <p>
        Under UK GDPR you can ask us to: show you the data we hold about you, correct it, delete it, or stop using it for marketing. Email{" "}
        <a href="mailto:studio@theslimestudio.co.uk" className="text-bright-lavender underline">studio@theslimestudio.co.uk</a>{" "}
        and we&apos;ll sort it. If you&apos;re unhappy with how we handle your data, you can complain to the Information Commissioner&apos;s Office (ICO) at ico.org.uk.
      </p>
    ),
  },
  {
    title: "Children's data",
    body: (
      <p>
        Bookings are made by a parent or guardian — we collect the adult&apos;s details, not the child&apos;s. We don&apos;t knowingly collect personal data directly from children through this website.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <section className="pt-16 pb-14 md:pt-20 md:pb-16 text-center px-4" style={{ backgroundColor: "#ffc4fb" }}>
        <div className="container">
          <h1 className="font-display text-[1.5rem] md:text-[3.4rem] text-ink mb-3 uppercase">Privacy Policy</h1>
          <p className="text-ink-soft text-[0.95rem] md:text-[1.05rem] max-w-xl mx-auto">
            Last updated September 2026
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16 px-4">
        <div className="container max-w-2xl space-y-8">
          {sections.map((s) => (
            <div key={s.title} className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
              <h2 className="font-display text-[1.1rem] text-ink mb-3">{s.title}</h2>
              <div className="text-[0.9rem] text-ink-soft leading-relaxed">{s.body}</div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </>
  );
}
