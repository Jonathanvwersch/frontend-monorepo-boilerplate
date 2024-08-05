/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@frontend-monorepo/react-design-system",
    "@frontend-monorepo/constants",
    "@frontend-monorepo/types",
  ],
};

export default nextConfig;
