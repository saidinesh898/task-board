import type { NextConfig } from "next";

const isStandaloneBuild =
  process.env.TASK_BOARD_BUILD_TARGET === "standalone";

const nextConfig: NextConfig = {
  // Sites receives a portable static export in dist/. Docker and Nixpacks set
  // TASK_BOARD_BUILD_TARGET=standalone to retain the traced Node.js runtime.
  output: isStandaloneBuild ? "standalone" : "export",
  distDir: isStandaloneBuild ? ".next" : "dist",
};

export default nextConfig;
