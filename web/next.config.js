/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  // Resolve shared package from monorepo root
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      shared: path.resolve(__dirname, '../shared'),
    };
    return config;
  },
};

module.exports = nextConfig;
