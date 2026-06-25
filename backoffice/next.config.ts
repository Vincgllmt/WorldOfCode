import type { NextConfig } from "next";

// SEC-19 : seule origine externe = l'API (dérivée de l'env, s'adapte dev/prod).
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090").origin

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `img-src 'self' data: blob: ${apiOrigin}`,
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  `connect-src 'self' ${apiOrigin}`,
].join("; ")

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), display-capture=(), geolocation=()" },
  // CSP en Report-Only : observe sans bloquer. À promouvoir en 'Content-Security-Policy'
  // (bloquant) après vérification navigateur.
  { key: "Content-Security-Policy-Report-Only", value: csp },
]

const nextConfig: NextConfig = {
  output: "standalone",
  // Retire les console.* (sauf error) des bundles de production pour éviter
  // toute fuite d'information dans la console du navigateur. Conservés en dev.
  compiler: {
    removeConsole: { exclude: ["error"] },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
};

export default nextConfig;
