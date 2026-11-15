import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 노트북에서 크롬 조작용 (번들링하지 않음)
  serverExternalPackages: ["playwright-core"],
  // 핫스팟/로컬 IP로 대시보드를 열어도 동작하도록
  allowedDevOrigins: ["127.0.0.1", "192.168.137.1"],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
