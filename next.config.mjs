/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next.js Webpack from attempting to bundle native Node modules 
  // or complicated scraping libraries that use dynamic imports.
  serverExternalPackages: ['@consumet/extensions', 'got-scraping', '@prisma/client'],
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
