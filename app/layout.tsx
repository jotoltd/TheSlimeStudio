import type { Metadata } from "next";
import Script from "next/script";
import { Poppins, Creepster } from "next/font/google";
import "./globals.css";
import MaintenanceGate from "@/components/MaintenanceGate";
import { CartProvider } from "@/components/CartContext";
import CartDrawer from "@/components/CartDrawer";
import AdPixels from "@/components/AdPixels";
import Preconnect from "@/components/Preconnect";

const SITE_URL = "https://theslimestudio.co.uk";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

// Display font used by the Halloween theme (html[data-theme="halloween"]).
const creepster = Creepster({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-creepster",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "The Slime Studio — Create, Play & Discover Slime Magic in Norfolk",
    template: "%s — The Slime Studio",
  },
  description:
    "Hands-on slime-making sessions for children and families in Holt, Norfolk. Book a workshop, shop DIY kits, handmade slimes and accessories.",
  keywords: [
    "slime studio",
    "slime making",
    "kids activities Norfolk",
    "things to do Holt",
    "slime workshop",
    "children's activities",
    "slime party",
    "DIY slime kits",
    "handmade slime",
    "Norfolk family activities",
  ],
  authors: [{ name: "The Slime Studio" }],
  creator: "The Slime Studio",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: SITE_URL,
    siteName: "The Slime Studio",
    title: "The Slime Studio — Create, Play & Discover Slime Magic in Norfolk",
    description:
      "Hands-on slime-making sessions for children and families in Holt, Norfolk. Book a workshop, shop DIY kits, handmade slimes and accessories.",
    images: [
      {
        url: "/images/slime_studio_pink_slime_experience.jpg.jpeg",
        width: 1200,
        height: 630,
        alt: "Children making slime at The Slime Studio in Holt, Norfolk",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Slime Studio — Slime-Making Sessions in Norfolk",
    description:
      "Hands-on slime-making sessions for children and families in Holt, Norfolk. Book your slot today!",
    images: ["/images/slime_studio_pink_slime_experience.jpg.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    // app/icon.png + app/apple-icon.png are picked up automatically by the
    // file convention — small files so browsers don't pull the 100KB+ logo
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} ${creepster.variable}`} suppressHydrationWarning>
      <head>
        <meta name="facebook-domain-verification" content="v7vy4a3rp37u3t887z6kbtpw16lqo8" />

        {/* Apply the cached site theme before first paint so returning visitors
            don't see a flash of the default theme — and kick off the live
            settings fetch immediately (long before React hydrates) so a
            seasonal theme flip repaints early instead of seconds after LCP.
            MaintenanceGate consumes window.__siteSettings and owns the
            maintenance-mode decision. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var p=location.pathname;if(!/^\\/(admin|api|dashboard)/.test(p)){var t=localStorage.getItem("siteTheme"),e=localStorage.getItem("siteThemeEnd");if(t==="halloween"||t==="default"){if(t!=="default"&&e&&new Date(e).getTime()<Date.now())t="default";document.documentElement.dataset.theme=t}window.__siteSettings=fetch(${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || "")}+"/rest/v1/site_settings?select=maintenance_mode,theme,theme_end_date,launch_date&id=eq.1",{headers:{apikey:${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "")},authorization:"Bearer "+${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "")}}}).then(function(r){return r.json()}).then(function(rows){var s=rows&&rows[0];var exp=s&&s.theme_end_date&&new Date(s.theme_end_date).getTime()<Date.now();var preview=new URLSearchParams(location.search).get("theme");if(!preview){if(s&&s.theme==="halloween"&&!exp){document.documentElement.dataset.theme="halloween"}else if(document.documentElement.dataset.theme==="halloween"){delete document.documentElement.dataset.theme}}return s||null}).catch(function(){return null})}}catch(e){}`,
          }}
        />

        {/* Google tag loads unconditionally with Consent Mode denied — GA4 and
            Google Ads get cookieless pings until the cookie banner grants
            storage, at which point AdPixels updates consent to granted. */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-QWN7QR5WH9"
          strategy="lazyOnload"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              analytics_storage: 'denied'
            });
            gtag('js', new Date());
            gtag('config', 'G-QWN7QR5WH9');
          `}
        </Script>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: "The Slime Studio",
              image: "https://theslimestudio.co.uk/images/slime_studio_pink_slime_experience.jpg.jpeg",
              description:
                "Hands-on slime-making sessions for children and families in Holt, Norfolk. Book a workshop, shop DIY kits, handmade slimes and accessories.",
              url: "https://theslimestudio.co.uk",
              hasMap: "https://www.google.com/maps/dir/?api=1&destination=The%20Slime%20Studio%2C%20Unit%20A%2C%20Feathers%20Yard%2C%20Holt%2C%20NR25%206BF",
              priceRange: "££",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Unit A, Feathers Yard",
                addressLocality: "Holt",
                addressRegion: "Norfolk",
                postalCode: "NR25 6BF",
                addressCountry: "GB",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: "52.9063",
                longitude: "1.0315",
              },
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: ["Saturday", "Sunday"],
                  opens: "10:00",
                  closes: "16:00",
                },
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                  opens: "10:00",
                  closes: "16:00",
                  validFrom: "2026-07-01",
                  validThrough: "2026-09-05",
                },
              ],
              sameAs: [
                "https://www.facebook.com/theslimestudio",
                "https://www.instagram.com/theslimestudio",
              ],
            }),
          }}
        />
      </head>
      <body>
        <AdPixels />
        <Preconnect />
        <MaintenanceGate>
          <CartProvider>
            {children}
            <CartDrawer />
          </CartProvider>
        </MaintenanceGate>
      </body>
    </html>
  );
}
