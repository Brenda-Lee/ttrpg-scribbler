import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: false,
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    pool: "forks",
    forks: {
      singleFork: true,
    },
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
