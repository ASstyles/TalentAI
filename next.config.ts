import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["firebase-admin", "@google-cloud/firestore", "@google-cloud/storage", "ioredis"],
};

export default nextConfig;
