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
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.{ts,tsx}", "app/api/**/route.ts"],
      exclude: [
        "src/components/**",
        "src/stores/**",
        "src/types/**",
        "src/auth.ts",
        "tests/**",
        "prisma/**",
        ".next/**",
        "node_modules/**",
        "**/*.config.*",
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 50,
      },
    },
  },
});
