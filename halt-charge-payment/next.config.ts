import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required for Railway (and any container) deployment:
  // Produces a minimal .next/standalone/server.js with zero node_modules needed at runtime
  output: 'standalone',

  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
