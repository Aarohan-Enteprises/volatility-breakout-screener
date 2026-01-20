import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Set basePath if deploying to a subpath (e.g., /repo-name)
  // basePath: "/volatility-breakout-screener",
};

export default nextConfig;
