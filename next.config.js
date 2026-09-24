/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  images: {
    localPatterns: [
      {
        pathname: '/api/hr/view-document/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },
  // Enable WebSocket support
  experimental: {
    serverComponentsExternalPackages: ['socket.io', 'pdfjs-dist', 'tesseract.js', '@napi-rs/canvas', 'pdf-parse']
  }
};

module.exports = nextConfig;