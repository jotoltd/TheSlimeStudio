import type { Metadata } from "next";
import "./globals.css";
import MaintenanceGate from "@/components/MaintenanceGate";
import { CartProvider } from "@/components/CartContext";
import CartDrawer from "@/components/CartDrawer";
import AdPixels from "@/components/AdPixels";

const SITE_URL = "https://theslimestudio.co.uk";

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
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
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
              telephone: "",
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
                  dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                  opens: "10:00",
                  closes: "16:00",
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
