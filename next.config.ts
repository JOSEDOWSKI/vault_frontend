import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || 'https://apivault.eirl.pe';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        // Todas las peticiones /api/* se reenvían al backend
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
