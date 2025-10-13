import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable image optimization for Heroku deployment
  // (Heroku doesn't support Next.js Image Optimization API by default)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
