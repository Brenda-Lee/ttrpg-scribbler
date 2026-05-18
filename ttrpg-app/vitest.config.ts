import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  // Next.js requires `"jsx": "preserve"` in tsconfig.json so Vite's bundler
  // refuses to transform JSX during tests. Tell oxc to use the modern
  // automatic runtime explicitly so jsdom tests can render React components.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    globals: false,
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
      include: [
        "src/lib/**/*.{ts,tsx}",
        "src/hooks/**/*.{ts,tsx}",
        "src/components/characters/sheet/**/*.{ts,tsx}",
        "src/components/characters/CharacterDetailClient.tsx",
        "src/components/characters/BodyMap.tsx",
        "app/api/**/route.ts",
      ],
      exclude: [
        // Keep most React components out of coverage; only the sheet
        // renderer surface (covered by jsdom tests) is measured.
        "src/components/ui/**",
        "src/components/editor/**",
        "src/components/shell/**",
        "src/components/scenes/**",
        // Other character-tree components don't yet have tests; keep them
        // out of the coverage report to avoid noisy 0% rows.
        "src/components/characters/CharactersClient.tsx",
        "src/components/projects/**",
        "src/components/lore/**",
        "src/components/glossary/**",
        "src/components/world/**",
        "src/components/events/**",
        "src/components/grammar/**",
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
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/components/**", "node_modules/**"],
          globalSetup: ["./tests/global-setup.ts"],
          setupFiles: ["./tests/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["tests/components/**/*.test.{ts,tsx}"],
          setupFiles: ["./tests/setup-dom.ts"],
        },
      },
    ],
  },
});
