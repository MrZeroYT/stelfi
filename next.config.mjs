/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // These packages are optional dependencies of MetaMask SDK and WalletConnect
    // that don't exist in a browser/Next.js build — safe to ignore.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
