import type { NextConfig } from "next";
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
    ],
  },
};

export default withBundleAnalyzer(withPWA(nextConfig));