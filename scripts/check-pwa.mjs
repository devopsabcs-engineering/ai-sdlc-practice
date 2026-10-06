import { readdir, readFile, stat } from "node:fs/promises";

const dist = new URL("../dist/", import.meta.url);
const requiredFiles = [
  "index.html",
  "manifest.webmanifest",
  "sw.js",
  "pinch-192.svg",
  "pinch-512.svg",
];

const failures = [];
for (const file of requiredFiles) {
  try {
    await stat(new URL(file, dist));
  } catch {
    failures.push(`missing ${file}`);
  }
}

let manifest;
try {
  manifest = JSON.parse(
    await readFile(new URL("manifest.webmanifest", dist), "utf8"),
  );
} catch {
  failures.push("manifest.webmanifest is not valid JSON");
}

if (manifest) {
  const requiredValues = {
    name: "Pinch — Recipe scaler",
    short_name: "Pinch",
    start_url: "./",
    scope: "./",
    display: "standalone",
    theme_color: "#243c73",
    background_color: "#f7f1e7",
  };
  for (const [key, expected] of Object.entries(requiredValues)) {
    if (manifest[key] !== expected) {
      failures.push(`manifest ${key} must be ${JSON.stringify(expected)}`);
    }
  }

  const iconSizes = new Set(
    Array.isArray(manifest.icons)
      ? manifest.icons.map((icon) => icon.sizes)
      : [],
  );
  for (const size of ["192x192", "512x512"]) {
    if (!iconSizes.has(size)) failures.push(`manifest is missing ${size} icon`);
  }
}

let index = "";
let serviceWorker = "";
try {
  [index, serviceWorker] = await Promise.all([
    readFile(new URL("index.html", dist), "utf8"),
    readFile(new URL("sw.js", dist), "utf8"),
  ]);
} catch {
  // Missing build output is already reported above.
}

if (!index.includes("/ai-sdlc-practice/manifest.webmanifest")) {
  failures.push("index does not use the GitHub Pages manifest path");
}
if (!index.includes("/ai-sdlc-practice/registerSW.js")) {
  failures.push("index does not register the generated service worker");
}
for (const asset of [
  "index.html",
  "manifest.webmanifest",
  "pinch-192.svg",
  "pinch-512.svg",
]) {
  if (!serviceWorker.includes(asset)) {
    failures.push(`service worker does not precache ${asset}`);
  }
}

const runtimeFiles = ["index.html", "sw.js"];
const assetsDirectory = new URL("assets/", dist);
try {
  for (const entry of await readdir(assetsDirectory)) {
    if (/\.(?:js|css)$/.test(entry)) runtimeFiles.push(`assets/${entry}`);
  }
} catch {
  failures.push("missing compiled assets");
}

let shellBytes = 0;
for (const file of runtimeFiles) {
  try {
    const contents = await readFile(new URL(file, dist));
    shellBytes += contents.byteLength;
    if (/https?:\/\//i.test(contents.toString("utf8"))) {
      failures.push(`${file} contains a third-party-capable absolute URL`);
    }
  } catch {
    failures.push(`unable to inspect ${file}`);
  }
}

const shellBudget = 250 * 1024;
if (shellBytes > shellBudget) {
  failures.push(
    `application shell is ${shellBytes} bytes (budget ${shellBudget})`,
  );
}

if (failures.length > 0) {
  console.error(`PWA production smoke failed:\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(
    `PWA production smoke passed (${runtimeFiles.length} runtime files, ${shellBytes} bytes).`,
  );
}
