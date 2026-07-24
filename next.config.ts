import type { NextConfig } from "next";

import { getSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  async redirects() {
    return [
      {
        source: "/bayi/urunler",
        destination: "/urunler",
        permanent: true,
      },
      {
        source: "/bayi/urunler/:id",
        destination: "/urunler/:id",
        permanent: true,
      },
      {
        source: "/bayi/teklif-sepeti",
        destination: "/urunler",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: getSecurityHeaders() }];
  },
};

export default nextConfig;
