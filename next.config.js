/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Enables instrumentation.ts (runs the room-expiry cron on server startup).
    instrumentationHook: true,
    // Keep these Node-only packages out of the (nodejs) webpack bundle.
    serverComponentsExternalPackages: ["mongodb", "node-cron"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  webpack: (config, { nextRuntime }) => {
    // instrumentation.ts is also compiled for the edge runtime, which can't
    // resolve Node built-ins (net/fs/crypto) pulled in by mongodb. We never run
    // these on edge (guarded by NEXT_RUNTIME), so mark them external there.
    if (nextRuntime === "edge") {
      config.externals = config.externals || [];
      config.externals.push("mongodb", "node-cron");
    }
    return config;
  },
};

module.exports = nextConfig;
