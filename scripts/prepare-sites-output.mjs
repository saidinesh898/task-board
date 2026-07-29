import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const hostingDirectory = join(projectRoot, "dist", ".openai");

mkdirSync(hostingDirectory, { recursive: true });
copyFileSync(
  join(projectRoot, ".openai", "hosting.json"),
  join(hostingDirectory, "hosting.json"),
);

console.log("Prepared dist/.openai/hosting.json for Sites.");
