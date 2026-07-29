import type { NextConfig } from "next";

const isStandaloneBuild =
  process.env.TASK_BOARD_BUILD_TARGET === "standalone";

const nextConfig: NextConfig = {
  // Vinext supplies the Sites server bundle. Docker and Nixpacks set this
  // target to retain Next.js' traced standalone Node.js runtime.
  ...(isStandaloneBuild ? { output: "standalone" as const } : {}),
};

export default nextConfig;
