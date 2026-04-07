/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'vercel.com' },
      { protocol: 'https', hostname: 'assets.vercel.com' },
    ],
  },
}

module.exports = nextConfig
