import { afterAll } from "vitest";
import path from "node:path";

process.env.DATABASE_URL = `file:${path.resolve("prisma/test.db")}`;
// Faz `getCurrentUser()` retornar o usuário mais antigo do banco de testes,
// preservando o padrão de ownership sem precisar mockar `auth()` do NextAuth.
process.env.AUTH_BYPASS = "1";

afterAll(async () => {
  const { prisma } = await import("@/lib/db");
  await prisma.$disconnect();
});
