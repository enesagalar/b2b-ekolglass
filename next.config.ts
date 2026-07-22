import type { NextConfig } from "next";

import { getSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  async headers() {
    return [{ source: "/:path*", headers: getSecurityHeaders() }];
  },
};

export default nextConfig;
