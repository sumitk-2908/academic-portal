import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withPWAInit from "@ducanh2912/next-pwa";
import withBundleAnalyzerInit from "@next/bundle-analyzer";

const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === 'true',
});

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // register and skipWaiting are handled automatically by this package!
  cacheOnFrontEndNav: true, 
  // Add explicit fallback routing for offline support
  fallbacks: {
    document: "/~offline",
  },
});

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://pub-11c1374f05774b54a2ab6c8bc83d6f7f.r2.dev https://dyxymzyijinfouqzjfls.supabase.co;
    connect-src 'self' https://dyxymzyijinfouqzjfls.supabase.co wss://dyxymzyijinfouqzjfls.supabase.co https://academic-portal-backend-kt25.onrender.com https://academic-portal-api-yu0d.onrender.com http://localhost:8000 https://*.ingest.us.sentry.io https://pub-11c1374f05774b54a2ab6c8bc83d6f7f.r2.dev;
    worker-src 'self' blob:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    frame-src 'self' https://vercel.live;
`;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-11c1374f05774b54a2ab6c8bc83d6f7f.r2.dev', // Replace with your exact R2 public domain
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dyxymzyijinfouqzjfls.supabase.co',
        port: '',
        pathname: '/**',
      }
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(withBundleAnalyzer(withPWA(nextConfig)), {
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
});