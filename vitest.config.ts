import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    env: {
      CREDENTIAL_LINK_SECRET: "vitest-only-credential-link-secret-0001",
    },
    environment: "jsdom",
    fileParallelism: false,
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
