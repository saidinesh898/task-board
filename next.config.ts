import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Generate the traced production server used by the minimal Docker runtime.
  output: "standalone",
};

export default nextConfig;
