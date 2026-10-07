import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const scripts = Object.entries(packageJson.scripts);
const forbidden = [
  { pattern: /(?:^|\s)(?:rm|cp|mv|grep|sed)\s/, reason: "POSIX-only command" },
  {
    pattern: /(?:^|\s)(?:del|copy|move|findstr)\s/i,
    reason: "Windows-only command",
  },
  { pattern: /[A-Za-z]:\\/, reason: "absolute Windows path" },
  { pattern: /\/(?:home|Users)\//, reason: "absolute user path" },
  { pattern: /(?:&&|\|\|)/, reason: "shell-specific command chaining" },
];

const violations = [];
for (const [name, command] of scripts) {
  for (const rule of forbidden) {
    if (rule.pattern.test(command)) violations.push(`${name}: ${rule.reason}`);
  }
}

if (violations.length > 0) {
  console.error(`Non-portable package scripts:\n${violations.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Portable package scripts verified (${scripts.length} scripts).`);
}
