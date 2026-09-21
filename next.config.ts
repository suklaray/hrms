import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "hrms.rakolsoft.com" },
      { protocol: "http", hostname: "localhost" },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
