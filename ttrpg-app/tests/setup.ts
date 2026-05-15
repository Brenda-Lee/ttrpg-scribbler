import { afterAll } from "vitest";
import path from "node:path";

process.env.DATABASE_URL = `file:${path.resolve("prisma/test.db")}`;

afterAll(async () => {
  const { prisma } = await import("@/lib/db");
  await prisma.$disconnect();
});
