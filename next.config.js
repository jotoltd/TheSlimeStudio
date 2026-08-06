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
};

module.exports = nextConfig;
