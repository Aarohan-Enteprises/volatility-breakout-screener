import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const repoName = "volatility-breakout-screener"; // Change this to your repo name

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // For GitHub Pages deployment
  basePath: isProd ? `/${repoName}` : "",
  assetPrefix: isProd ? `/${repoName}/` : "",
};

export default nextConfig;
