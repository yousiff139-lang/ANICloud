/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next.js Webpack from attempting to bundle native Node modules 
  // or complicated scraping libraries that use dynamic imports.
  serverExternalPackages: ['@consumet/extensions', 'got-scraping', '@prisma/client']
};

export default nextConfig;
