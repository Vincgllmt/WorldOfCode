import type { NextConfig } from "next";

const storageUrl = new URL(process.env.NEXT_PUBLIC_STORAGE_URL || 'http://localhost:9000')

// SEC-19 : origines externes autorisées, dérivées des variables d'env (s'adapte dev/prod).
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090').origin
const socketHttpOrigin = new URL(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8081').origin
const socketWsOrigin = socketHttpOrigin.replace(/^http/, 'ws')
const nsfwCdns = 'https://esm.sh https://cdn.jsdelivr.net https://ga.jspm.io'

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `img-src 'self' data: blob: ${apiOrigin} ${storageUrl.origin}`,
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${nsfwCdns}`,
  `connect-src 'self' ${apiOrigin} ${socketHttpOrigin} ${socketWsOrigin} ${nsfwCdns}`,
  "worker-src 'self' blob:",
].join('; ')

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Caméra/micro/partage d'écran autorisés pour soi (appels vidéo), reste désactivé.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), display-capture=(self), geolocation=()' },
  // CSP en Report-Only : observe les violations sans rien bloquer. À promouvoir en
  // en-tête 'Content-Security-Policy' (bloquant) après vérification navigateur (DevTools → Console).
  { key: 'Content-Security-Policy-Report-Only', value: csp },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  // Retire les console.* (sauf error) des bundles de production pour éviter
  // toute fuite d'information dans la console du navigateur. Conservés en dev.
  compiler: {
    removeConsole: { exclude: ['error'] },
  },
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
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
};

export default nextConfig;
