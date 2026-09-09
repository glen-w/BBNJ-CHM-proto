import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / Node-only modules must stay out of the bundler.
  serverExternalPackages: ["better-sqlite3", "exceljs"],
};

export default nextConfig;
