import type { NextConfig } from "next";

const storageUrl = new URL(process.env.NEXT_PUBLIC_STORAGE_URL || 'http://localhost:9000')

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: storageUrl.protocol.replace(':', '') as 'http' | 'https',
        hostname: storageUrl.hostname,
        port: storageUrl.port,
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
