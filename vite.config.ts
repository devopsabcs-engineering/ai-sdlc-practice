import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/ai-sdlc-practice/",
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
});
