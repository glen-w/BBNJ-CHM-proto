import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / Node-only modules must stay out of the bundler.
  serverExternalPackages: ["better-sqlite3", "exceljs"],
  async redirects() {
    return [
      { source: "/cbtmt", destination: "/capacity", permanent: false },
      { source: "/cbtmt/:id", destination: "/capacity/:id", permanent: false },
    ];
  },
};

export default nextConfig;
