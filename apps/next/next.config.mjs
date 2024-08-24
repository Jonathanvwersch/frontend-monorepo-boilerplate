/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@frontend-monorepo/react-design-system",
    "@frontend-monorepo/constants",
    "@frontend-monorepo/types",
  ],
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
