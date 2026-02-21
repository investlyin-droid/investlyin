import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Faster production builds
  reactStrictMode: true,
  // Reduce bundle size: tree-shake and optimize package imports where possible
  experimental: {
    optimizePackageImports: ["lightweight-charts"],
  },
  // Compress output (if hosting supports it, e.g. Vercel does automatically)
  compress: true,
};

export default nextConfig;
