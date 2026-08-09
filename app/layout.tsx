import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Slime Studio — Create, Play & Discover Slime Magic in Norfolk",
  description:
    "Hands-on slime-making sessions for children and families in Holt, Norfolk. Book a workshop, shop DIY kits, handmade slimes and accessories.",
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
      </head>
      <body>{children}</body>
    </html>
  );
}
