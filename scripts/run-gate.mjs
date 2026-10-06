import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const tools = {
  build: [
    ["../node_modules/typescript/bin/tsc", "-b"],
    ["../node_modules/vite/bin/vite.js", "build"],
  ],
  lint: [
    ["../node_modules/eslint/bin/eslint.js", "."],
    [
      "../node_modules/prettier/bin/prettier.cjs",
      "--check",
      "index.html",
      "package.json",
      "scripts",
      "src",
      "tests",
      "*.config.*",
      "tsconfig*.json",
    ],
  ],
};

const gate = process.argv[2];
const commands = tools[gate];

if (!commands) {
  console.error(`Unknown gate: ${gate ?? "(missing)"}`);
  process.exit(2);
}

for (const [relativeExecutable, ...args] of commands) {
  const executable = fileURLToPath(
    new URL(relativeExecutable, import.meta.url),
  );
  const result = spawnSync(process.execPath, [executable, ...args], {
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
