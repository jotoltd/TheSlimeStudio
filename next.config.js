/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "msfbyneidkfhmofnoupg.supabase.co",
      },
    ],
  },
  async redirects() {
    // Only PAID ad clicks forward to the /go ad-landing page: utm_medium=paid
    // (or cpc/paid-social) comes from our own url_tags, and gclid/gbraid/
    // wbraid/gad_source are only ever stamped by Google Ads. Bare fbclid is
    // deliberately NOT a trigger — Facebook appends it to every outbound
    // click, so organic posts and bio links keep landing on /booking.
    // Temporary (307) and the query string is preserved, so attribution
    // params survive the hop.
    return [
      { type: "query", key: "utm_medium", value: "paid|cpc|ppc|paid[-_]?social" },
      { type: "query", key: "gclid" },
      { type: "query", key: "gbraid" },
      { type: "query", key: "wbraid" },
      { type: "query", key: "gad_source" },
    ].map((has) => ({
      source: "/booking",
      has: [has],
      destination: "/go",
      permanent: false,
    }));
  },
};

module.exports = nextConfig;
