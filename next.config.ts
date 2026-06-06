import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/tonconnect-manifest.json",
        destination: "/api/tonconnect-manifest",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ton.org",
      },
      {
        protocol: "https",
        hostname: "cache.tonapi.io",
      },
      {
        protocol: "https",
        hostname: "**.tonapi.io",
      },
      {
        protocol: "https",
        hostname: "**.tonapi.com",
      },
      {
        protocol: "https",
        hostname: "**.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.ipfs.io",
      },
      {
        protocol: "https",
        hostname: "**.ipfs.dweb.link",
      },
    ],
  },
};

export default nextConfig;
