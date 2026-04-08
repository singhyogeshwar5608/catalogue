import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  /**
   * Allow chunk loads when the dev server is accessed via the LAN IP that the user shares on other devices.
   * This prevents ChunkLoadError caused by Next blocking cross-origin dev asset requests.
   */
  allowedDevOrigins: ['192.168.29.165:3000'],
  /**
   * Silence Next.js warning about multiple lockfiles by explicitly setting the tracing root to the project directory.
   */
  outputFileTracingRoot: __dirname,
  /**
   * Exclude backend folder from TypeScript compilation
   */
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json',
  },
};

export default nextConfig;
