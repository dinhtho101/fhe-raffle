/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Fast Refresh to reduce auto-reload frequency
  reactStrictMode: false,
  
  webpack: (config, { isServer }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

module.exports = nextConfig;