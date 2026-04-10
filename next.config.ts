import type { NextConfig } from "next";

/** Origin only (scheme + host + port) for proxying /api/laravel → Laravel /api/v1/v1 */
function laravelProxyOrigin(): string {
  const parseOrigin = (v: string | undefined): string | null => {
    const t = v?.trim();
    if (!t) return null;
    try {
      return new URL(t.includes("://") ? t : `https://${t}`).origin;
    } catch {
      return null;
    }
  };
  return (
    parseOrigin(process.env.BACKEND_PROXY_TARGET) ??
    parseOrigin(process.env.NEXT_PUBLIC_API_BASE_URL) ??
    "https://kaushalschoolfurniture.com"
  );
}

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
  /**
   * Optional: only when `NEXT_PUBLIC_USE_API_PROXY=1` in dev — see `getApiRequestBaseUrl` in api.ts.
   * Default app calls the API URL directly (live server).
   */
  async rewrites() {
    const origin = laravelProxyOrigin();
    return [
      {
        source: "/api/laravel/:path*",
        destination: `${origin}/api/v1/v1/:path*`,
      },
    ];
  },

  /**
   * Add CORS headers for API routes
   */
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
