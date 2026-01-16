/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    STORAGE_KV_REST_API_TOKEN: process.env.STORAGE_KV_REST_API_TOKEN,
    STORAGE_KV_REST_API_URL: process.env.STORAGE_KV_REST_API_URL,
    JWT_SECRET: process.env.JWT_SECRET,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.vercel-storage.com',
      },
    ],
  },
}

module.exports = nextConfig 
