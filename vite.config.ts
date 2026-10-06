import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/ai-sdlc-practice/",
  plugins: [
    VitePWA({
      registerType: "prompt",
      injectRegister: "script",
      manifest: {
        id: "./",
        name: "Pinch — Recipe scaler",
        short_name: "Pinch",
        description:
          "A private, bilingual recipe scaler, shopping list, and cooking companion.",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#f7f1e7",
        theme_color: "#243c73",
        categories: ["food", "utilities"],
        icons: [
          {
            src: "pinch-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "pinch-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        navigateFallback: "/ai-sdlc-practice/index.html",
        globPatterns: ["**/*.{html,js,css}"],
      },
    }),
  ],
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
});
