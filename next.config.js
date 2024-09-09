/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  swcMinify: true, // Use SWC for minification if you need it
  compiler: {
    // Ensure you are using the SWC compiler for TypeScript/JavaScript
    styledComponents: true,
  },
};

module.exports = nextConfig;
