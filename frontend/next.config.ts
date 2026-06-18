import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // register and skipWaiting are handled automatically by this package!
  cacheOnFrontEndNav: true, 
});

const nextConfig: NextConfig = {
  // Any existing Next.js config options go here
  reactStrictMode: true,
};

export default withPWA(nextConfig);