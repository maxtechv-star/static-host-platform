/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With,Content-Type,Authorization' },
        ],
      },
      {
        source: '/s/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/s/:siteId/:path*',
        destination: '/api/download/:siteId/:path*',
      },
    ];
  },
  env: {
    APP_NAME: 'StaticHost',
    APP_DESCRIPTION: 'Free static site hosting platform by VeronDev',
    VERSION: '1.0.0',
  },
  // Increase timeout for file uploads
  experimental: {
    serverComponentsExternalPackages: ['aws-sdk', 'adm-zip', 'simple-git'],
  },
};

module.exports = nextConfig;