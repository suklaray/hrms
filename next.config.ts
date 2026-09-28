import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "hrms.rakolsoft.com" },
      { protocol: "http", hostname: "localhost" },
    ],
    localPatterns: [
      {
        pathname: "/api/hr/view-document/**",
      },
    ],
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
  // Packages that should run in Node.js server runtime and not be bundled by Next.js
  serverExternalPackages: [
    "socket.io",
    "pdfjs-dist",
    "tesseract.js",
    "@napi-rs/canvas",
    "pdf-parse",
  ],
};

export default nextConfig;
