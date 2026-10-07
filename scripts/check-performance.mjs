import { chromium } from "@playwright/test";
import { launch } from "chrome-launcher";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import lighthouse from "lighthouse";
import { build, preview } from "vite";

const minimumScore = 0.9;
let chrome;
let server;
const chromeProfile = await mkdtemp(join(tmpdir(), "pinch-lighthouse-"));

try {
  await build();
  server = await preview({
    preview: {
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
    },
  });
  chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
    userDataDir: chromeProfile,
  });

  const result = await lighthouse("http://127.0.0.1:4173/ai-sdlc-practice/", {
    logLevel: "error",
    onlyCategories: ["performance"],
    output: "json",
    port: chrome.port,
    throttlingMethod: "simulate",
  });
  const score = result?.lhr.categories.performance?.score;
  if (typeof score !== "number") {
    throw new Error("Lighthouse did not produce a performance score.");
  }

  console.log(`Lighthouse performance score: ${score.toFixed(2)}`);
  for (const id of [
    "first-contentful-paint",
    "largest-contentful-paint",
    "speed-index",
    "total-blocking-time",
    "cumulative-layout-shift",
  ]) {
    const audit = result.lhr.audits[id];
    console.log(`${audit.title}: ${audit.displayValue ?? audit.numericValue}`);
  }
  if (score < minimumScore) {
    throw new Error(
      `Performance score ${score.toFixed(2)} is below ${minimumScore.toFixed(2)}.`,
    );
  }
} finally {
  await chrome?.kill();
  await new Promise((resolve) => setTimeout(resolve, 250));
  await rm(chromeProfile, {
    force: true,
    maxRetries: 10,
    recursive: true,
    retryDelay: 100,
  });
  await new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }
    server.httpServer.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
