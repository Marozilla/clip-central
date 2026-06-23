import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@clip-central/db", "@clip-central/shared"],
};

export default nextConfig;
