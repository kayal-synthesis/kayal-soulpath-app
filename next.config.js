/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
    ],
  },
  images: {
    domains: ['api.kayalsoulpath.com', 'images.unsplash.com'],
    formats: ['image/avif', 'image/webp'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: false,
  async redirects() {
    return [
      { source: '/audio/:toolId', destination: '/domain/voice-of-prophecy/:toolId', permanent: true },
      { source: '/chat/:toolId', destination: '/domain/sacred-script/:toolId', permanent: true },
      { source: '/', destination: '/member/dashboard', permanent: false, has: [{ type: 'host', value: 'members.kayalsoulpath.com' }] },
      { source: '/', destination: '/member/referral/dashboard', permanent: false, has: [{ type: 'host', value: 'affiliate.kayalsoulpath.com' }] },
    ]
  },
}
module.exports = nextConfig