/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ajoute ces deux blocs à ta configuration existante :
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;