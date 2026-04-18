import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "content.sportslogos.net",
        pathname: "/logos/**",
      },
    ],
  },
};

export default nextConfig;
