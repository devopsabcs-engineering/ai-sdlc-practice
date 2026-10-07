import { build, preview } from "vite";

await build();
await preview({
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
});
